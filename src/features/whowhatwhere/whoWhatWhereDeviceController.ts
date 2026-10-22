import {
  correctWord,
  endTurn,
  returnSkippedWord,
  revealHint,
  showResults,
  skipWord,
  startTurn,
} from "@/domain/whowhatwhere/game";
import { reconcileTeamSetups } from "@/domain/whowhatwhere/setup";
import type { GameSettings, MatchState, TeamSetup } from "@/domain/whowhatwhere/types";
import {
  createWhoWhatWhereDeviceSession,
  rebaseWhoWhatWhereTurn,
  sampleWhoWhatWhereSession,
  WHO_WHAT_WHERE_SESSION_KEY,
  type WhoWhatWhereDeviceSession,
  whoWhatWhereDeviceSessionSchema,
} from "@/features/whowhatwhere/whoWhatWhereDeviceSession";
import {
  createValidatedWhoWhatWhereMatch,
  nextWhoWhatWhereTeamStep,
} from "@/features/whowhatwhere/whoWhatWhereSingleplayerTransitions";
import { requireContentPreferences } from "@/services/contentPreference";
import {
  isDeviceActive,
  setDeviceKeepAwake,
  subscribeDeviceActivity,
} from "@/services/deviceLifecycle";
import { playGameSoundEffect } from "@/services/gameSoundEffects";
import { readSnapshot, removeSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

type SessionView = {
  readonly session: WhoWhatWhereDeviceSession;
  readonly loaded: boolean;
  readonly saving: boolean;
  readonly storageError: string;
  readonly hydrationFailed: boolean;
  readonly notice: string;
  readonly setupError: string;
  readonly turnError: string;
  readonly savedGameAvailable: boolean;
};

/**
 * One owner for local session transitions and persistence. Refs live here rather than in
 * asynchronous React updaters, so a rapid double tap cannot score or start twice.
 */
export class WhoWhatWhereDeviceController {
  private session = createWhoWhatWhereDeviceSession();
  private anchor = performance.now();
  private loaded = false;
  private saving = false;
  private storageError = "";
  private notice = "";
  private setupError = "";
  private turnError = "";
  private hydrationFailed = false;
  private hydration: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  private draftTimer: ReturnType<typeof setTimeout> | null = null;
  private checkpointAt = performance.now();
  private warningTurn = "";
  private deviceActive = isDeviceActive();
  private keepAwake = false;
  private pauseEpoch = 0;
  private savedGameAvailable = false;
  private replacingSave = false;
  private view = this.makeView();

  private makeView(): SessionView {
    return {
      session: this.session,
      loaded: this.loaded,
      saving: this.saving,
      storageError: this.storageError,
      hydrationFailed: this.hydrationFailed,
      notice: this.notice,
      setupError: this.setupError,
      turnError: this.turnError,
      savedGameAvailable: this.savedGameAvailable,
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
      this.deviceActive &&
      !this.session.paused &&
      !this.storageError &&
      this.session.match?.stage === "turn";
    if (keepAwake !== this.keepAwake) {
      this.keepAwake = keepAwake;
      void setDeviceKeepAwake(keepAwake).catch(() => {
        this.notice = "The screen may sleep. Keep the phone awake during this turn.";
        this.view = this.makeView();
        this.listeners.forEach((listener) => listener());
      });
    }
  }

  private current() {
    return sampleWhoWhatWhereSession(this.session, this.anchor, performance.now());
  }

  private install(session: WhoWhatWhereDeviceSession) {
    this.session = session;
    this.anchor = performance.now();
    this.emit();
  }

  private cancelDraft() {
    if (this.draftTimer !== null) clearTimeout(this.draftTimer);
    this.draftTimer = null;
  }

  private failSave(error: unknown) {
    this.cancelDraft();
    this.storageError = error instanceof Error ? error.message : "Device storage is unavailable.";
    this.install({ ...this.current(), paused: true });
  }

  private async save(session = this.current()): Promise<boolean> {
    this.cancelDraft();
    if (!this.loaded || this.hydrationFailed) return false;
    // Results remain on screen, while disk retains a fresh setup for the next game.
    const record = {
      ...session,
      ...(session.match?.stage === "results"
        ? {
            match: null,
            mode: "settings" as const,
            teamStep: 0,
            remainingMs: null,
            paused: true,
            presentationStage: null,
          }
        : {}),
      savedAt: new Date().toISOString(),
    };
    try {
      await writeSnapshot(WHO_WHAT_WHERE_SESSION_KEY, record);
      this.session = { ...this.session, savedAt: record.savedAt };
      return true;
    } catch (error) {
      this.failSave(error);
      return false;
    }
  }

  hydrate = (): Promise<void> => {
    if (this.hydration) return this.hydration;
    this.hydration = (async () => {
      try {
        const { value, recovered } = await readSnapshot(
          WHO_WHAT_WHERE_SESSION_KEY,
          whoWhatWhereDeviceSessionSchema,
        );
        this.hydrationFailed = false;
        this.storageError = "";
        this.notice = recovered ? "Recovered the previous saved checkpoint." : "";
        this.loaded = true;
        const restored =
          value?.match?.stage === "results"
            ? {
                ...value,
                match: null,
                remainingMs: null,
                mode: "settings" as const,
                teamStep: 0,
                presentationStage: null,
              }
            : value;
        this.savedGameAvailable = Boolean(
          restored && (restored.mode !== "landing" || restored.match),
        );
        this.install(
          restored
            ? { ...restored, paused: restored.mode !== "landing" || restored.match !== null }
            : createWhoWhatWhereDeviceSession(),
        );
      } catch (error) {
        this.loaded = true;
        this.hydrationFailed = true;
        this.failSave(error);
      }
    })();
    return this.hydration;
  };

  mount = () => {
    void this.hydrate();
    const unsubscribe = subscribeDeviceActivity((active) => {
      this.deviceActive = active;
      if (!active) this.pauseGame();
      else this.emit();
    });
    const interval = setInterval(() => this.tick(), 250);
    return () => {
      unsubscribe();
      clearInterval(interval);
      this.cancelDraft();
      if (this.loaded && !this.hydrationFailed) this.pauseGame();
      this.keepAwake = false;
      void setDeviceKeepAwake(false).catch(() => undefined);
    };
  };

  private canAct() {
    return (
      this.loaded &&
      !this.saving &&
      !this.storageError &&
      !this.savedGameAvailable &&
      !this.session.paused &&
      this.deviceActive
    );
  }

  private async transition(next: WhoWhatWhereDeviceSession): Promise<boolean> {
    this.saving = true;
    this.install(next);
    const saved = await this.save(next);
    this.saving = false;
    this.emit();
    return saved;
  }

  private updateDraft(next: WhoWhatWhereDeviceSession) {
    if (!this.canAct()) return;
    this.install(next);
    this.cancelDraft();
    this.draftTimer = setTimeout(() => {
      this.draftTimer = null;
      void this.save();
    }, 400);
  }

  updateSettings = (settings: GameSettings) => {
    const current = this.current();
    this.updateDraft({
      ...current,
      teamStep: Math.min(current.teamStep, settings.teamCount - 1),
      setup: {
        schemaVersion: 1,
        settings,
        teams: reconcileTeamSetups(current.setup.teams, settings.teamCount),
      },
    });
  };

  setTeamSetups = (teams: readonly TeamSetup[]) => {
    const current = this.current();
    this.updateDraft({ ...current, setup: { ...current.setup, teams } });
  };

  goToSettingsFromLanding = () => this.moveSetup("settings", 0);
  goToTeamSetup = () => this.moveSetup("team", 0);
  leaveReviewToTeamSetup = () => this.moveSetup("team", this.session.setup.settings.teamCount - 1);

  private moveSetup(mode: WhoWhatWhereDeviceSession["mode"], teamStep = this.session.teamStep) {
    if (!this.canAct()) return;
    this.setupError = "";
    void this.transition({
      ...this.current(),
      mode,
      teamStep,
      match: null,
      remainingMs: null,
      presentationStage: null,
    });
  }

  goBackFromTeamSetup = () =>
    this.moveSetup(
      this.session.teamStep === 0 ? "settings" : "team",
      Math.max(0, this.session.teamStep - 1),
    );

  advanceTeamSetup = () => {
    const next = nextWhoWhatWhereTeamStep(
      this.session.teamStep,
      this.session.setup.settings.teamCount,
    );
    this.moveSetup(next.mode, next.step);
  };

  startNewMatch = async () => {
    if (!this.canAct()) return;
    const current = this.current();
    const pauseEpoch = this.pauseEpoch;
    this.saving = true;
    this.setupError = "";
    this.emit();
    try {
      const [{ kidsMode }, { getWhoWhatWhereWordList }] = await Promise.all([
        requireContentPreferences(),
        import("@/domain/whowhatwhere/wordList"),
      ]);
      if (this.session.paused || !this.deviceActive || this.pauseEpoch !== pauseEpoch) return;
      const settings = { ...current.setup.settings, kidsMode };
      const words = getWhoWhatWhereWordList({ difficulty: settings.wordDifficulty, kidsMode });
      if (!words.some((word) => settings.selectedCategories.includes(word.category))) {
        this.setupError =
          "No words match these categories and word settings. Change the difficulty or categories.";
        return;
      }
      const result = createValidatedWhoWhatWhereMatch(current.setup.teams, settings);
      if (!result.match) {
        this.setupError = result.error;
        return;
      }
      await this.transition({
        ...current,
        setup: { ...current.setup, settings },
        match: result.match,
        remainingMs: null,
        mode: "ready",
        presentationStage: null,
      });
    } catch (error) {
      this.setupError = error instanceof Error ? error.message : "Unable to load word settings.";
    } finally {
      this.saving = false;
      this.emit();
    }
  };

  startNextTurn = async () => {
    if (!this.canAct() || this.session.match?.stage !== "ready" || this.session.presentationStage)
      return;
    this.saving = true;
    this.turnError = "";
    this.emit();
    const expectedMatch = this.session.match;
    const pauseEpoch = this.pauseEpoch;
    try {
      const { getWhoWhatWhereWordList } = await import("@/domain/whowhatwhere/wordList");
      // Backgrounding or navigating while the bundled module loads cancels this action.
      if (this.session.paused || !this.deviceActive || this.session.match !== expectedMatch) return;
      const match = startTurn(
        expectedMatch,
        getWhoWhatWhereWordList({
          difficulty: expectedMatch.settings.wordDifficulty,
          kidsMode: expectedMatch.settings.kidsMode,
        }),
      );
      // Save the generated deck before a timer or private prompt becomes visible.
      const next = {
        ...this.current(),
        match,
        remainingMs: match.settings.turnDurationSeconds * 1000,
        mode: "turn" as const,
        paused: true,
      };
      this.install(next);
      if (!(await this.save(next))) return;
      if (this.pauseEpoch !== pauseEpoch || !this.deviceActive || this.session.match !== match)
        return;
      this.checkpointAt = performance.now();
      this.install({ ...next, paused: false });
    } catch (error) {
      this.turnError = error instanceof Error ? error.message : "Unable to start this turn.";
    } finally {
      this.saving = false;
      this.emit();
    }
  };

  private applyMatchAction(
    action: (match: MatchState) => MatchState,
    sound?: Parameters<typeof playGameSoundEffect>[0],
  ) {
    if (!this.canAct() || !this.session.match) return;
    const current = this.current();
    const match = current.match!;
    const expired = current.remainingMs !== null && current.remainingMs <= 0;
    const nextMatch = expired
      ? endTurn(match)
      : action(
          current.remainingMs === null ? match : rebaseWhoWhatWhereTurn(match, current.remainingMs),
        );
    if (nextMatch === match) return;
    const next = {
      ...current,
      match: nextMatch,
      mode: nextMatch.stage,
      remainingMs: nextMatch.stage === "turn" ? current.remainingMs : null,
      presentationStage:
        match.stage === "turn" && nextMatch.stage !== "turn"
          ? ("recap" as const)
          : nextMatch.stage === "results"
            ? null
            : (current.presentationStage ?? null),
    };
    if (sound) void playGameSoundEffect(expired ? "timeout" : sound);
    void this.transition(next);
  }

  correct = () => this.applyMatchAction(correctWord, "correct");
  skip = () => this.applyMatchAction(skipWord, "skip");
  returnSkipped = (id: string) =>
    this.applyMatchAction((match) => returnSkippedWord(match, id), "returnSkipped");
  revealHint = () => this.applyMatchAction(revealHint);
  endTurn = () => {
    if (this.session.match?.stage === "turn") this.applyMatchAction(endTurn, "timeout");
  };
  endPausedTurn = () => {
    if (
      !this.loaded ||
      this.saving ||
      this.storageError ||
      this.savedGameAvailable ||
      !this.deviceActive ||
      !this.session.paused ||
      this.session.match?.stage !== "turn"
    )
      return;
    const current = this.current();
    const match = endTurn(current.match!);
    void playGameSoundEffect("timeout");
    void this.transition({
      ...current,
      match,
      mode: match.stage,
      remainingMs: null,
      presentationStage: "recap",
      paused: false,
    });
  };
  viewResults = () => this.applyMatchAction(showResults, "victory");

  advanceTurnRecap = () => {
    if (!this.canAct() || this.session.presentationStage !== "recap") return;
    const match = this.session.match;
    if (match?.stage === "finalSummary") {
      this.viewResults();
      return;
    }
    if (match?.stage !== "ready") return;
    void this.transition({
      ...this.current(),
      presentationStage: match.teamIndex === 0 ? "roundComplete" : null,
    });
  };

  continueAfterRound = () => {
    if (!this.canAct() || this.session.presentationStage !== "roundComplete") return;
    void this.transition({ ...this.current(), presentationStage: null });
  };

  backToSetup = () => this.moveSetup("landing", 0);
  playAgainFromSettings = () => this.moveSetup("settings", 0);

  pauseGame = () => {
    if (!this.loaded) return;
    this.pauseEpoch += 1;
    const next = { ...this.current(), paused: true };
    this.install(next);
    if (!this.hydrationFailed && !this.savedGameAvailable && !this.replacingSave)
      void this.save(next);
  };

  resumeGame = async () => {
    if (!this.loaded || this.saving || this.storageError || !this.deviceActive) return;
    const current = this.current();
    const pauseEpoch = this.pauseEpoch;
    // Keep the cover in place until the paused checkpoint has reached disk.
    this.saving = true;
    this.emit();
    if ((await this.save(current)) && this.deviceActive && this.pauseEpoch === pauseEpoch) {
      this.savedGameAvailable = false;
      this.install({ ...this.current(), paused: false });
    }
    this.saving = false;
    this.emit();
  };

  openSavedGame = async () => {
    if (!this.savedGameAvailable || this.saving || this.storageError || !this.deviceActive) return;
    if (this.session.match?.stage === "turn") {
      // Choosing the save reveals its pause summary; only Resume turn reveals the clue/clock.
      this.savedGameAvailable = false;
      this.emit();
      return;
    }
    await this.resumeGame();
  };

  /** Called only after the UI confirms replacement; disk keeps the old save until commit. */
  startOverFromPendingMatch = async () => {
    if (!this.loaded || this.saving || this.storageError || this.hydrationFailed) return;
    this.cancelDraft();
    this.saving = true;
    this.replacingSave = true;
    this.pauseEpoch += 1;
    const pauseEpoch = this.pauseEpoch;
    const next: WhoWhatWhereDeviceSession = {
      ...this.current(),
      mode: "settings",
      teamStep: 0,
      match: null,
      remainingMs: null,
      paused: true,
      presentationStage: null,
    };
    this.install({ ...this.current(), paused: true });
    if (await this.save(next)) {
      this.savedGameAvailable = false;
      this.setupError = "";
      this.turnError = "";
      this.install({
        ...next,
        savedAt: this.session.savedAt,
        paused: !this.deviceActive || this.pauseEpoch !== pauseEpoch,
      });
    }
    this.replacingSave = false;
    this.saving = false;
    this.emit();
  };

  retrySave = async () => {
    if (this.saving) return;
    if (this.hydrationFailed) {
      this.saving = true;
      this.emit();
      this.hydration = null;
      await this.hydrate();
      this.saving = false;
      this.emit();
      return;
    }
    this.saving = true;
    this.emit();
    if (await this.save()) this.storageError = "";
    this.saving = false;
    this.emit();
  };

  discardUnavailableSave = async () => {
    if (!this.hydrationFailed || this.saving) return;
    this.saving = true;
    this.emit();
    try {
      await removeSnapshot(WHO_WHAT_WHERE_SESSION_KEY);
      this.hydration = null;
      await this.hydrate();
    } catch (error) {
      this.failSave(error);
    } finally {
      this.saving = false;
      this.emit();
    }
  };

  leaveGame = async (): Promise<boolean> => {
    if (!this.loaded || this.saving) return false;
    // A failed read never enabled edits; leaving keeps its original record untouched.
    if (this.hydrationFailed) return true;
    if (this.storageError) return false;
    if (this.savedGameAvailable) return true;
    this.saving = true;
    this.install({ ...this.current(), paused: true });
    const saved = await this.save();
    this.saving = false;
    this.emit();
    return saved;
  };

  goBack = () => {
    if (this.session.match) this.pauseGame();
    else if (this.session.mode === "team") this.goBackFromTeamSetup();
    else if (this.session.mode === "review") this.leaveReviewToTeamSetup();
    else this.moveSetup("landing", 0);
  };

  private tick() {
    if (
      !this.loaded ||
      this.session.paused ||
      !this.deviceActive ||
      this.storageError ||
      this.session.match?.stage !== "turn"
    )
      return;
    const current = this.current();
    const remainingMs = current.remainingMs ?? 0;
    if (remainingMs <= 0) {
      this.endTurn();
      return;
    }
    const turnKey = current.match?.activeTurn?.startedAt ?? "";
    if (remainingMs <= 10_000 && this.warningTurn !== turnKey) {
      this.warningTurn = turnKey;
      void playGameSoundEffect("warn10");
    }
    this.install(current);
    if (!this.saving && performance.now() - this.checkpointAt >= 1000) {
      this.checkpointAt = performance.now();
      void this.save(current);
    }
  }
}
