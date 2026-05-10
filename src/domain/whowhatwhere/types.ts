export const CATEGORIES = ["What", "Who", "Where"] as const;

export type Category = (typeof CATEGORIES)[number];
type DifficultyMode = "easy" | "hard";
type Stage = "ready" | "turn" | "finalSummary" | "results";
type WordSource = "main" | "skipped";
type WordStatus = "correct" | "skipped";

type HintSettings = {
  readonly enabled: boolean;
  readonly perTurnLimit: number;
};

export type GameSettings = {
  readonly teamCount: 2 | 3 | 4;
  readonly turnDurationSeconds: 30 | 45 | 60 | 75;
  readonly totalRounds: 1 | 2 | 3 | 4;
  readonly skipLimit: 1 | 2 | 3 | -1;
  readonly selectedCategories: readonly Category[];
  readonly difficultyMode: DifficultyMode;
  readonly hints: HintSettings;
};

type TeamSetupPlayer = {
  readonly id: string;
  readonly name: string;
};

export type TeamSetup = {
  readonly id: string;
  readonly name: string;
  readonly players: readonly TeamSetupPlayer[];
};

export type Player = {
  readonly id: string;
  readonly seat: number;
  readonly name: string;
  readonly teamId: string;
};

export type Team = {
  readonly id: string;
  readonly name: string;
  readonly score: number;
};

export type WordEntry = {
  readonly word: string;
  readonly category: string;
  readonly hint: string;
};

export type SkippedWord = {
  readonly id: string;
  readonly word: WordEntry;
};

export type WordHistoryEntry = {
  readonly word: WordEntry;
  readonly status: WordStatus;
  readonly source: WordSource;
  readonly timestamp: string;
};

export type ActiveTurn = {
  readonly startedAt: string;
  readonly endsAt: string;
  readonly durationSeconds: number;
  readonly category: Category;
  readonly wordQueue: readonly WordEntry[];
  readonly queueIndex: number;
  readonly currentWordSource: WordSource;
  readonly currentSkippedWord: SkippedWord | null;
  readonly score: number;
  readonly correctCount: number;
  readonly skippedCount: number;
  readonly skipLimit: GameSettings["skipLimit"];
  readonly skippedWords: readonly SkippedWord[];
  readonly nextSkippedWordId: number;
  readonly wordHistory: readonly WordHistoryEntry[];
};

export type LastTurnSummary = {
  readonly teamId: string;
  readonly teamName: string;
  readonly describerId: string;
  readonly describerName: string;
  readonly scoreDelta: number;
  readonly correctCount: number;
  readonly skippedCount: number;
  readonly pendingSkippedCount: number;
  readonly wordHistory: readonly WordHistoryEntry[];
  readonly finalWord: WordEntry | null;
};

type BestTurn = {
  readonly teamId: string;
  readonly teamName: string;
  readonly describerId: string;
  readonly describerName: string;
  readonly scoreDelta: number;
};

export type Results = {
  readonly leaderboard: readonly {
    readonly teamId: string;
    readonly teamName: string;
    readonly score: number;
  }[];
  readonly winnerTeamIds: readonly string[];
  readonly isTie: boolean;
  readonly bestTurn: BestTurn | null;
};

export type MatchState = {
  readonly gameId: "whowhatwhere";
  readonly players: readonly Player[];
  readonly teams: readonly Team[];
  readonly settings: GameSettings;
  readonly stage: Stage;
  readonly roundNumber: number;
  readonly teamOrder: readonly string[];
  readonly teamIndex: number;
  readonly describerIndexes: Readonly<Record<string, number>>;
  readonly activeTurn: ActiveTurn | null;
  readonly lastTurnSummary: LastTurnSummary | null;
  readonly turnSummaries: readonly LastTurnSummary[];
  readonly results: Results | null;
  readonly wordReserves: Readonly<Partial<Record<Category, readonly WordEntry[]>>>;
};

export type ActiveContext = {
  readonly team: Team;
  readonly teamPlayers: readonly Player[];
  readonly describer: Player;
};
