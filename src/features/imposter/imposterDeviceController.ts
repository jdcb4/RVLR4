import type { ImposterSnapshot } from "@/domain/imposter/types";
import { chooseImposterWord } from "@/domain/imposter/wordList";
import {
  concealImposterSnapshot,
  createImposterDeviceSession,
  IMPOSTER_DEVICE_SESSION_KEY,
  type ImposterDeviceSession,
  imposterDeviceSessionSchema,
} from "@/features/imposter/imposterDeviceSession";
import {
  advanceImposterReveal,
  moveImposterSetupForward,
  resizeImposterRoster,
  setImposterCount,
  startImposterRound,
  updateImposterPlayerName,
} from "@/features/imposter/imposterSingleplayerTransitions";
import { requireContentPreferences } from "@/services/contentPreference";
import {
  isDeviceActive,
  setDeviceKeepAwake,
  subscribeDeviceActivity,
} from "@/services/deviceLifecycle";
import { readSnapshot, removeSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

/** The foreground alone owns visibility; atomic saves own all generated assignments. */
export class ImposterDeviceController {
  private session = createImposterDeviceSession();
  private loaded = false;
  private saving = false;
  private preparingRound = false;
  private storageError = "";
  private setupError = "";
  private notice = "";
  private hydrationFailed = false;
  private savedGameAvailable = false;
  private paused = false;
  private roleVisible = false;
  private active = isDeviceActive();
  private keepAwake = false;
  private epoch = 0;
  private hydration: Promise<void> | null = null;
  private pending: ImposterDeviceSession | null = null;
  private hasSnapshot = false;
  private draftTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private view = this.makeView();

  private makeView() {
    return {
      session: this.session,
      loaded: this.loaded,
      saving: this.saving || this.preparingRound,
      storageError: this.storageError,
      setupError: this.setupError,
      notice: this.notice,
      hydrationFailed: this.hydrationFailed,
      savedGameAvailable: this.savedGameAvailable,
      paused: this.paused,
      roleVisible: this.roleVisible,
    };
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private emit() {
    this.view = this.makeView();
    this.listeners.forEach((listener) => listener());
    const keepAwake =
      this.loaded &&
      this.active &&
      !this.paused &&
      !this.storageError &&
      !this.savedGameAvailable &&
      Boolean(this.session.snapshot.round) &&
      this.session.snapshot.step !== "results";
    if (keepAwake !== this.keepAwake) {
      this.keepAwake = keepAwake;
      void setDeviceKeepAwake(keepAwake).catch(() => {
        this.notice = "The screen may sleep. Keep the phone awake while playing.";
        this.view = this.makeView();
        this.listeners.forEach((listener) => listener());
      });
    }
  }
  private cancelDraft() {
    if (this.draftTimer !== null) clearTimeout(this.draftTimer);
    this.draftTimer = null;
  }
  private fail(error: unknown) {
    this.storageError =
      error instanceof Error
        ? error.message
        : "Your game could not be saved. Keep the app open and retry.";
    this.roleVisible = false;
    this.paused = true;
    this.emit();
  }
  private canAct() {
    return (
      this.loaded &&
      !this.saving &&
      !this.preparingRound &&
      !this.storageError &&
      !this.savedGameAvailable &&
      !this.paused &&
      this.active
    );
  }

  hydrate = (): Promise<void> => {
    if (this.hydration) return this.hydration;
    this.hydration = (async () => {
      try {
        const { value, recovered } = await readSnapshot(
          IMPOSTER_DEVICE_SESSION_KEY,
          imposterDeviceSessionSchema,
        );
        this.hasSnapshot = value !== null;
        this.session = value ?? createImposterDeviceSession();
        this.savedGameAvailable = Boolean(
          value && !["settings", "results"].includes(value.snapshot.step),
        );
        if (value && !this.savedGameAvailable) {
          await removeSnapshot(IMPOSTER_DEVICE_SESSION_KEY);
          this.hasSnapshot = false;
          this.session = {
            ...value,
            snapshot: { ...value.snapshot, step: "settings", round: null },
          };
        }
        this.roleVisible = false;
        this.hydrationFailed = false;
        this.storageError = "";
        this.notice = recovered ? "Recovered the previous saved checkpoint." : "";
      } catch (error) {
        this.hydrationFailed = true;
        this.fail(error);
      }
      this.loaded = true;
      this.emit();
    })();
    return this.hydration;
  };

  mount = () => {
    void this.hydrate();
    const unsubscribe = subscribeDeviceActivity((active) => {
      this.active = active;
      if (!active) this.pause();
      else this.emit();
    });
    return () => {
      unsubscribe();
      this.pause();
    };
  };

  private async commit(next: ImposterDeviceSession): Promise<boolean> {
    this.cancelDraft();
    this.saving = true;
    this.roleVisible = false;
    this.pending = { ...next, savedAt: new Date().toISOString() };
    this.emit();
    try {
      const record = this.pending;
      if (!["settings", "results"].includes(record.snapshot.step)) {
        this.hasSnapshot = true;
        await writeSnapshot(IMPOSTER_DEVICE_SESSION_KEY, record);
      } else if (this.hasSnapshot) {
        await removeSnapshot(IMPOSTER_DEVICE_SESSION_KEY);
        this.hasSnapshot = false;
      }
      this.session = record;
      this.pending = null;
      if (["settings", "results"].includes(record.snapshot.step)) this.savedGameAvailable = false;
      this.storageError = "";
      return true;
    } catch (error) {
      this.fail(error);
      return false;
    } finally {
      this.saving = false;
      this.emit();
    }
  }

  private transition(snapshot: ImposterSnapshot) {
    return this.commit({ ...this.session, snapshot: concealImposterSnapshot(snapshot) });
  }
  private draft(snapshot: ImposterSnapshot) {
    if (!this.canAct()) return;
    this.session = { ...this.session, snapshot: concealImposterSnapshot(snapshot) };
    this.setupError = "";
    this.emit();
    this.cancelDraft();
    if (snapshot.step === "settings" || snapshot.step === "landing") return;
    this.draftTimer = setTimeout(() => {
      this.draftTimer = null;
      void this.commit(this.session);
    }, 400);
  }
  updatePlayerCount = (count: number) => {
    if (
      this.session.snapshot.step === "settings" &&
      Number.isInteger(count) &&
      count >= 4 &&
      count <= 10
    )
      this.draft(resizeImposterRoster(this.session.snapshot, count));
  };
  updateImposterCount = (count: number) => {
    if (this.session.snapshot.step === "settings")
      this.draft(setImposterCount(this.session.snapshot, count));
  };
  updateWordDifficulty = (wordDifficulty: ImposterSnapshot["wordDifficulty"]) => {
    if (this.session.snapshot.step === "settings")
      this.draft({ ...this.session.snapshot, wordDifficulty });
  };
  updateName = (id: string, name: string) => {
    if (this.session.snapshot.step === "roster")
      this.draft(updateImposterPlayerName(this.session.snapshot, id, name.slice(0, 80)));
  };
  advanceSetup = async () => {
    if (!this.canAct()) return;
    const step = this.session.snapshot.step;
    if (step !== "settings" && step !== "roster") return;
    // Names may be unfinished when returning from the roster to settings.
    if (step === "settings") {
      await this.transition({ ...this.session.snapshot, step: "roster" });
      return;
    }
    const result = moveImposterSetupForward(this.session.snapshot, "review");
    this.setupError = result.error ?? "";
    this.emit();
    if (result.snapshot) await this.transition(result.snapshot);
  };
  startRound = async () => {
    if (!this.canAct() || this.session.snapshot.step !== "review") return;
    this.preparingRound = true;
    const epoch = this.epoch;
    this.emit();
    try {
      const { simpleMode } = await requireContentPreferences();
      if (!this.active || this.paused || epoch !== this.epoch) return;
      const secretWord = chooseImposterWord(
        { difficulty: this.session.snapshot.wordDifficulty, simpleMode },
        Math.random,
      );
      const result = startImposterRound(
        this.session.snapshot,
        secretWord === undefined ? [] : [secretWord],
        Math.random,
        "Unable to deal this round.",
        "No words match these settings. Choose another difficulty or change Simple mode in app settings.",
      );
      this.setupError = result.error ?? "";
      if (result.snapshot) await this.transition(result.snapshot);
    } catch (error) {
      this.setupError =
        error instanceof Error
          ? error.message
          : "Content settings could not be loaded. Retry in app settings before dealing.";
    } finally {
      this.preparingRound = false;
      this.emit();
    }
  };
  revealRole = () => {
    if (this.canAct() && this.session.snapshot.step === "reveal") {
      this.roleVisible = true;
      this.emit();
    }
  };
  finishRole = async () => {
    if (!this.canAct() || !this.roleVisible || this.session.snapshot.step !== "reveal") return;
    await this.transition(
      advanceImposterReveal({
        ...this.session.snapshot,
        round: { ...this.session.snapshot.round!, revealRevealed: true },
      }),
    );
  };
  advanceGuide = async () => {
    if (!this.canAct()) return;
    const step = this.session.snapshot.step;
    const next =
      step === "guidePregame"
        ? "guidePrediscussion"
        : step === "guidePrediscussion"
          ? "guideWarning"
          : step === "guideWarning"
            ? "results"
            : null;
    if (next) await this.transition({ ...this.session.snapshot, step: next });
  };
  back = async () => {
    if (!this.canAct()) return;
    const snapshot = this.session.snapshot;
    if (snapshot.round) {
      this.pause();
      return;
    }
    if (snapshot.step === "roster" || snapshot.step === "review")
      await this.transition({
        ...snapshot,
        step: snapshot.step === "roster" ? "settings" : "roster",
      });
  };
  pause = () => {
    if (!this.loaded) return;
    this.epoch += 1;
    this.roleVisible = false;
    this.paused = true;
    if (this.draftTimer !== null) {
      this.cancelDraft();
      if (!this.saving && !this.hydrationFailed) void this.commit(this.session);
    }
    this.emit();
  };
  resume = () => {
    if (!this.active || this.saving || this.storageError) return;
    this.savedGameAvailable = false;
    this.paused = false;
    this.roleVisible = false;
    this.emit();
  };
  startNew = async () => {
    if (
      !this.loaded ||
      this.saving ||
      this.preparingRound ||
      this.storageError ||
      this.hydrationFailed
    )
      return;
    const epoch = this.epoch;
    if (await this.transition({ ...this.session.snapshot, step: "settings", round: null })) {
      this.savedGameAvailable = false;
      this.paused = !this.active || epoch !== this.epoch;
      this.setupError = "";
      this.emit();
    }
  };
  retry = async () => {
    if (this.saving) return;
    if (this.hydrationFailed) {
      this.hydration = null;
      await this.hydrate();
      return;
    }
    await this.commit(this.pending ?? this.session);
  };
  discardUnavailable = async () => {
    if (!this.hydrationFailed || this.saving) return;
    this.saving = true;
    this.emit();
    try {
      await removeSnapshot(IMPOSTER_DEVICE_SESSION_KEY);
      this.hydration = null;
      await this.hydrate();
      this.paused = false;
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving = false;
      this.emit();
    }
  };
  leave = async (): Promise<boolean> => {
    if (!this.loaded || this.saving || this.preparingRound) return false;
    this.roleVisible = false;
    this.emit();
    if (this.hydrationFailed || this.savedGameAvailable) return true;
    if (this.storageError) return false;
    this.paused = true;
    return this.commit(this.session);
  };
}
