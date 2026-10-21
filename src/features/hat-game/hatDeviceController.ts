import { GAME_DEFAULTS } from "@/config/hatDefaults";
import { getHatClueSuggestions } from "@/domain/hat-game/clueSuggestions";
import { applyHatGameAction } from "@/domain/hat-game/engine";
import {
  addPlayerToHatTeam,
  type HatRosterTeamRow,
  hatStateToRosterRows,
  removePlayerFromHatTeam,
} from "@/domain/hat-game/setup";
import type { HatGameAction } from "@/domain/hat-game/types";
import {
  createHatDeviceSession,
  HAT_DEVICE_SESSION_KEY,
  type HatDeviceSession,
  hatDeviceSessionSchema,
  rebaseHatTurn,
  sampleHatDeviceSession,
} from "@/features/hat-game/hatDeviceSession";
import type { AppSnapshot } from "@/features/hat-game/hatSingleplayerAppTypes";
import {
  advanceHatClueEntry,
  advanceHatTeamStep,
  applyHatRosterTransition,
  backHatTeamStep,
  beginHatClueEntry,
  createHatTeamSetup,
  type HatTransitionResult,
} from "@/features/hat-game/hatSingleplayerTransitions";
import {
  isDeviceActive,
  setDeviceKeepAwake,
  setDevicePrivacy,
  subscribeDeviceActivity,
} from "@/services/deviceLifecycle";
import { playGameSoundEffect } from "@/services/gameSoundEffects";
import { readSnapshot, removeSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

export class HatDeviceController {
  private session = createHatDeviceSession();
  private loaded = false;
  private saving = false;
  private storageError = "";
  private error = "";
  private notice = "";
  private hydrationFailed = false;
  private savedGameAvailable = false;
  private hydration: Promise<void> | null = null;
  private anchor = performance.now();
  private checkpointAt = performance.now();
  private pauseEpoch = 0;
  private deviceActive = isDeviceActive();
  private replacing = false;
  private keepAwake = false;
  private warningTurn = "";
  private draftTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private view = this.makeView();

  private makeView() {
    return {
      session: this.session,
      loaded: this.loaded,
      saving: this.saving,
      storageError: this.storageError,
      error: this.error,
      notice: this.notice,
      hydrationFailed: this.hydrationFailed,
      savedGameAvailable: this.savedGameAvailable,
      deviceActive: this.deviceActive,
    };
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit() {
    this.view = this.makeView();
    this.listeners.forEach((listener) => listener());
    const awake =
      this.loaded &&
      this.deviceActive &&
      !this.saving &&
      !this.storageError &&
      !this.session.paused &&
      !this.savedGameAvailable &&
      this.session.snapshot.session?.stage === "turn";
    if (awake !== this.keepAwake) {
      this.keepAwake = awake;
      void setDeviceKeepAwake(awake).catch(() => {
        this.notice = "The screen may sleep. Keep the phone awake during this turn.";
        this.view = this.makeView();
        this.listeners.forEach((listener) => listener());
      });
    }
  }
  private current() {
    return sampleHatDeviceSession(this.session, this.anchor, performance.now());
  }
  private install(session: HatDeviceSession) {
    this.session = session;
    this.anchor = performance.now();
    this.emit();
  }
  private cancelDraft() {
    if (this.draftTimer !== null) clearTimeout(this.draftTimer);
    this.draftTimer = null;
  }
  private fail(error: unknown) {
    this.cancelDraft();
    this.storageError = error instanceof Error ? error.message : "Device storage is unavailable.";
    this.install({
      ...this.current(),
      paused: true,
      snapshot: { ...this.session.snapshot, clueEntryRevealed: false },
    });
  }
  private async save(session = this.current()) {
    this.cancelDraft();
    if (!this.loaded || this.hydrationFailed) return false;
    const record = {
      ...(session.snapshot.session?.stage === "results" ? this.freshSetup(session) : session),
      savedAt: new Date().toISOString(),
    };
    try {
      await writeSnapshot(HAT_DEVICE_SESSION_KEY, record);
      this.session = { ...this.session, savedAt: record.savedAt };
      return true;
    } catch (error) {
      this.fail(error);
      return false;
    }
  }
  private freshSetup(session: HatDeviceSession): HatDeviceSession {
    return {
      ...session,
      remainingMs: null,
      recap: false,
      paused: true,
      snapshot: {
        ...session.snapshot,
        step: "settings",
        teamEditIndex: 0,
        clueEntryIndex: 0,
        clueEntryRevealed: false,
        handoffRevealed: false,
        clueSubmissions: {},
        session: null,
      },
    };
  }
  hydrate = (): Promise<void> => {
    if (this.hydration) return this.hydration;
    this.hydration = (async () => {
      try {
        const { value, recovered } = await readSnapshot(
          HAT_DEVICE_SESSION_KEY,
          hatDeviceSessionSchema,
        );
        this.loaded = true;
        this.hydrationFailed = false;
        this.storageError = "";
        this.notice = recovered ? "Recovered the previous saved checkpoint." : "";
        this.savedGameAvailable = value !== null;
        const restored =
          value?.snapshot.session?.stage === "results" ? this.freshSetup(value) : value;
        this.install(
          restored
            ? {
                ...restored,
                paused: true,
                snapshot: {
                  ...restored.snapshot,
                  clueEntryRevealed: false,
                  handoffRevealed: false,
                },
              }
            : createHatDeviceSession(),
        );
      } catch (error) {
        this.loaded = true;
        this.hydrationFailed = true;
        this.fail(error);
      }
    })();
    return this.hydration;
  };
  mount = () => {
    void setDevicePrivacy(true).catch(() => {
      this.notice = "Private content may appear in the phone’s recent-apps preview.";
      this.emit();
    });
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
  private async transition(next: HatDeviceSession) {
    const pauseEpoch = this.pauseEpoch;
    this.saving = true;
    // A newly generated queue is never disclosed before its checkpoint commits.
    this.install({ ...next, paused: true });
    const saved = await this.save({ ...next, paused: true });
    if (saved && this.deviceActive && pauseEpoch === this.pauseEpoch)
      this.install({ ...next, savedAt: this.session.savedAt, paused: false });
    this.saving = false;
    this.emit();
    return saved;
  }
  private draft(snapshot: AppSnapshot) {
    if (!this.canAct()) return;
    this.error = "";
    this.install({ ...this.current(), snapshot });
    this.cancelDraft();
    this.draftTimer = setTimeout(() => {
      this.draftTimer = null;
      void this.save();
    }, 400);
  }
  private move(snapshot: AppSnapshot) {
    if (!this.canAct()) return;
    this.error = "";
    void this.transition({ ...this.current(), snapshot });
  }
  private accept(result: HatTransitionResult) {
    if (!this.canAct()) return;
    if (result.error !== null) {
      this.error = result.error;
      this.emit();
      return;
    }
    this.move(result.snapshot);
  }
  updateSettings = (
    settings: Pick<AppSnapshot, "teamCount" | "turnDurationSeconds" | "skipsPerTurn">,
  ) => this.draft({ ...this.session.snapshot, ...settings });
  setRoster = (rows: readonly HatRosterTeamRow[]) =>
    this.draft(applyHatRosterTransition(this.session.snapshot, rows));
  addPlayer = (teamId: string) => {
    if (!this.canAct()) return;
    const { teams, players } = this.session.snapshot;
    const next = addPlayerToHatTeam(teams, players, teamId);
    if (next) this.setRoster(hatStateToRosterRows(next.teams, next.players));
  };
  removePlayer = (teamId: string, playerId: string) => {
    const { teams, players } = this.session.snapshot;
    const next = removePlayerFromHatTeam(teams, players, teamId, playerId);
    if (next) this.setRoster(hatStateToRosterRows(next.teams, next.players));
  };
  updatePlayerName = (teamId: string, playerId: string, name: string) => {
    const { teams, players } = this.session.snapshot;
    this.setRoster(
      hatStateToRosterRows(teams, players).map((team) =>
        team.id === teamId
          ? {
              ...team,
              players: team.players.map((player) =>
                player.id === playerId ? { ...player, name } : player,
              ),
            }
          : team,
      ),
    );
  };
  beginTeams = () => {
    const snapshot = this.session.snapshot;
    if (snapshot.teams.length === snapshot.teamCount)
      this.move({ ...snapshot, step: "team", teamEditIndex: 0 });
    else this.accept(createHatTeamSetup(snapshot));
  };
  confirmTeam = () => this.accept(advanceHatTeamStep(this.session.snapshot));
  backTeam = () => this.move(backHatTeamStep(this.session.snapshot));
  editTeams = () =>
    this.move({
      ...this.session.snapshot,
      step: "team",
      teamEditIndex: this.session.snapshot.teamCount - 1,
    });
  beginClues = () => this.accept(beginHatClueEntry(this.session.snapshot));
  revealClues = () => this.move({ ...this.session.snapshot, clueEntryRevealed: true });
  updateClue = (index: number, text: string) => {
    const snapshot = this.session.snapshot;
    const player = snapshot.players[snapshot.clueEntryIndex];
    if (
      snapshot.step !== "clues" ||
      !snapshot.clueEntryRevealed ||
      !player ||
      index < 0 ||
      index >= GAME_DEFAULTS.cluesPerPlayer
    )
      return;
    const clues = [...(snapshot.clueSubmissions[player.id]?.clues ?? [])];
    clues[index] = text.slice(0, GAME_DEFAULTS.maxClueLength);
    this.draft({
      ...snapshot,
      clueSubmissions: { ...snapshot.clueSubmissions, [player.id]: { clues } },
    });
  };
  suggestClue = (index: number) => {
    const suggestions = getHatClueSuggestions();
    const existing = Object.values(this.session.snapshot.clueSubmissions).flatMap(
      (entry) => entry.clues,
    );
    const available = suggestions.filter((clue) => !existing.includes(clue));
    const suggestion = available[Math.floor(Math.random() * available.length)];
    if (suggestion) this.updateClue(index, suggestion);
  };
  confirmClues = () => {
    if (this.session.snapshot.step !== "clues" || !this.session.snapshot.clueEntryRevealed) return;
    this.accept(advanceHatClueEntry(this.session.snapshot));
  };
  action = (action: HatGameAction) => {
    if (!this.canAct() || !this.session.snapshot.session) return;
    if (this.session.recap && action.type !== "view-results") return;
    const current = this.current();
    const match = current.snapshot.session!;
    const expired = match.stage === "turn" && (current.remainingMs ?? 0) <= 0;
    const next = applyHatGameAction(
      current.remainingMs === null ? match : rebaseHatTurn(match, current.remainingMs),
      expired ? { type: "end-turn" } : action,
    );
    if ("error" in next) {
      this.error = next.error;
      this.emit();
      return;
    }
    this.error = "";
    if (action.type === "start-turn") void playGameSoundEffect("turnStart");
    if (
      ["mark-correct", "skip-clue", "return-skipped-clue", "end-turn", "view-results"].includes(
        action.type,
      )
    ) {
      const sound =
        expired || action.type === "end-turn"
          ? "timeout"
          : action.type === "mark-correct"
            ? "correct"
            : action.type === "skip-clue"
              ? "skip"
              : action.type === "view-results"
                ? "victory"
                : "returnSkipped";
      void playGameSoundEffect(sound);
    }
    if (match.stage === "turn" && next.stage !== "turn" && !expired && action.type !== "end-turn")
      void playGameSoundEffect("timeout");
    if (next.phaseNumber !== match.phaseNumber)
      void playGameSoundEffect(next.phaseNumber === 2 ? "phaseOneWord" : "phaseCharades");
    void this.transition({
      ...current,
      snapshot: { ...current.snapshot, session: next },
      remainingMs:
        next.stage === "turn"
          ? match.stage === "ready"
            ? next.settings.turnDurationSeconds * 1000
            : current.remainingMs
          : null,
      recap: match.stage === "turn" && next.stage !== "turn",
    });
  };
  advanceRecap = () => {
    if (this.session.snapshot.session?.stage === "finalSummary")
      this.action({ type: "view-results" });
    else if (this.canAct()) void this.transition({ ...this.current(), recap: false });
  };
  pauseGame = () => {
    if (!this.loaded) return;
    this.pauseEpoch += 1;
    const next = {
      ...this.current(),
      paused: true,
      snapshot: { ...this.session.snapshot, clueEntryRevealed: false },
    };
    this.install(next);
    if (!this.hydrationFailed && !this.savedGameAvailable && !this.replacing) void this.save(next);
  };
  resumeGame = async () => {
    if (!this.loaded || this.saving || this.storageError || !this.deviceActive) return;
    const epoch = this.pauseEpoch;
    this.saving = true;
    this.emit();
    if (await this.save()) {
      if (this.deviceActive && epoch === this.pauseEpoch) {
        this.savedGameAvailable = false;
        this.install({ ...this.current(), paused: false });
      }
    }
    this.saving = false;
    this.emit();
  };
  openSavedGame = async () => {
    if (!this.savedGameAvailable || this.saving || this.storageError || !this.deviceActive) return;
    if (this.session.snapshot.session?.stage === "turn") {
      this.savedGameAvailable = false;
      this.emit();
      return;
    }
    await this.resumeGame();
  };
  endPausedTurn = () => {
    if (
      !this.loaded ||
      this.saving ||
      this.storageError ||
      this.savedGameAvailable ||
      !this.deviceActive ||
      !this.session.paused ||
      this.session.snapshot.session?.stage !== "turn"
    )
      return;
    const current = this.current();
    const result = applyHatGameAction(current.snapshot.session!, { type: "end-turn" });
    if ("error" in result) return;
    void this.transition({
      ...current,
      snapshot: { ...current.snapshot, session: result },
      remainingMs: null,
      recap: true,
    });
  };
  startNewGame = async () => {
    if (!this.loaded || this.saving || this.storageError || this.hydrationFailed) return;
    this.cancelDraft();
    this.saving = true;
    this.replacing = true;
    this.pauseEpoch += 1;
    const epoch = this.pauseEpoch;
    const next = this.freshSetup(this.current());
    this.install({ ...this.current(), paused: true });
    if (await this.save(next)) {
      this.savedGameAvailable = false;
      this.error = "";
      this.install({
        ...next,
        savedAt: this.session.savedAt,
        paused: !this.deviceActive || epoch !== this.pauseEpoch,
      });
    }
    this.replacing = false;
    this.saving = false;
    this.emit();
  };
  retrySave = async () => {
    if (this.saving) return;
    this.saving = true;
    this.emit();
    if (this.hydrationFailed) {
      this.hydration = null;
      await this.hydrate();
    } else if (await this.save()) this.storageError = "";
    this.saving = false;
    this.emit();
  };
  discardUnavailableSave = async () => {
    if (!this.hydrationFailed || this.saving) return;
    this.saving = true;
    this.emit();
    try {
      await removeSnapshot(HAT_DEVICE_SESSION_KEY);
      this.hydration = null;
      await this.hydrate();
    } catch (error) {
      this.fail(error);
    }
    this.saving = false;
    this.emit();
  };
  leaveGame = async () => {
    if (!this.loaded || this.saving) return false;
    if (this.hydrationFailed || this.savedGameAvailable) return true;
    if (this.storageError) return false;
    this.saving = true;
    this.install({
      ...this.current(),
      paused: true,
      snapshot: { ...this.session.snapshot, clueEntryRevealed: false },
    });
    const saved = await this.save();
    this.saving = false;
    this.emit();
    return saved;
  };
  private tick() {
    if (!this.canAct() || this.session.snapshot.session?.stage !== "turn") return;
    const current = this.current();
    if ((current.remainingMs ?? 0) <= 0) {
      this.action({ type: "end-turn" });
      return;
    }
    const turnKey = current.snapshot.session?.activeTurn?.startedAt ?? "";
    if ((current.remainingMs ?? 0) <= 10_000 && this.warningTurn !== turnKey) {
      this.warningTurn = turnKey;
      void playGameSoundEffect("warn10");
    }
    this.install(current);
    if (performance.now() - this.checkpointAt >= 1000) {
      this.checkpointAt = performance.now();
      void this.save(current);
    }
  }
}
