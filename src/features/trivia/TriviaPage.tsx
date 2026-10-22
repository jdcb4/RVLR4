import { Minus, Plus, RotateCcw } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";

import { PrimaryFooterButton, SecondaryFooterButton } from "@/components/game/GameFooterButtons";
import { GameArtwork } from "@/components/GameArtwork";
import { GameShell } from "@/components/GameShell";
import { ModalDialog } from "@/components/ModalDialog";
import { DifficultySelect } from "@/components/setup/DifficultySelect";
import { Button } from "@/components/ui/button";
import {
  isTriviaQuestionEligible,
  triviaCategories,
  type TriviaQuestion,
} from "@/data/triviaSchema";
import {
  getTriviaScores,
  nextTriviaQuestion,
  revealTriviaAnswer,
  setTriviaAnswer,
  setTriviaMark,
  triviaCategoryLabels,
  type TriviaQuiz,
  type TriviaSettings,
  triviaSettingsSchema,
} from "@/domain/trivia/game";
import {
  getContentPreferenceState,
  initializeContentPreferences,
  subscribeContentPreferences,
} from "@/services/contentPreference";

import { useTrivia } from "./useTrivia";

const inputClass =
  "keyboard-safe-input min-h-12 min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-typ-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ignoreFailure = () => undefined;

export function TriviaPage() {
  const game = useTrivia();
  const navigate = useNavigate();
  const [confirmNew, setConfirmNew] = useState(false);
  const { session, busy, error, resumePending } = game;
  const quiz = session?.quiz;
  const leave = useCallback(() => {
    if (busy || error) return;
    navigate("/");
  }, [busy, error, navigate]);
  useEffect(() => {
    const back = (event: Event) => {
      event.preventDefault();
      if (confirmNew) setConfirmNew(false);
      else leave();
    };
    window.addEventListener("rvlry:back", back);
    return () => window.removeEventListener("rvlry:back", back);
  }, [confirmNew, leave]);

  const changeQuiz = (transform: (current: TriviaQuiz) => TriviaQuiz) =>
    void game.changeQuiz(transform).catch(ignoreFailure);
  let content: ReactNode;
  let footer: ReactNode;
  if (!game.ready || !session) {
    content = <p role="status">Loading Trivia…</p>;
  } else if (resumePending && quiz) {
    content = (
      <section className="space-y-3">
        <h2 className="text-typ-section-title font-semibold">Your saved quiz</h2>
        <p>
          {quiz.items.length} questions · {quiz.settings.teams.length}{" "}
          {quiz.settings.teams.length === 1 ? "team" : "teams"}
        </p>
        <p className="text-typ-muted text-muted-foreground">
          Saved {new Date(session.savedAt).toLocaleString()}
        </p>
      </section>
    );
    footer = (
      <div className="space-y-2">
        <PrimaryFooterButton
          label="Resume"
          disabled={busy || !!error}
          onClick={() => void game.resume().catch(ignoreFailure)}
        />
        <SecondaryFooterButton
          label="Start new quiz"
          disabled={busy || !!error}
          onClick={() => setConfirmNew(true)}
        />
      </div>
    );
  } else if (!quiz) {
    content = (
      <TriviaSetup
        initial={session.settings}
        questions={game.catalogue}
        busy={busy}
        blocked={!!error}
        onChange={(settings) => void game.saveSettings(settings).catch(ignoreFailure)}
        onStart={(settings) => void game.start(settings).catch(ignoreFailure)}
      />
    );
  } else if (quiz.phase === "results") {
    const scores = getTriviaScores(quiz);
    const played = quiz.items.filter((item) => !item.excluded).length;
    const unmarked = quiz.items.reduce(
      (count, item) =>
        count + (item.excluded ? 0 : item.marks.filter((mark) => mark === null).length),
      0,
    );
    content = (
      <section className="space-y-4">
        <h2 className="text-typ-section-title font-semibold">Quiz complete</h2>
        <p className="text-typ-muted text-muted-foreground">
          {played} questions played · 1 point per correct answer
        </p>
        <ol className="divide-y divide-border">
          {quiz.settings.teams.map((team, index) => (
            <li key={index} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0 break-words font-semibold">{team}</span>
              <span className="shrink-0 text-typ-section-title font-semibold tabular-nums">
                {scores[index]} / {played}
              </span>
            </li>
          ))}
        </ol>
        {unmarked > 0 && (
          <p className="text-typ-muted text-muted-foreground">
            {unmarked} unmarked {unmarked === 1 ? "answer counts" : "answers count"} as zero.
          </p>
        )}
        {played < quiz.items.length && (
          <p className="text-typ-muted text-muted-foreground">
            {quiz.items.length - played} expired questions were skipped before being shown.
          </p>
        )}
      </section>
    );
    footer = (
      <PrimaryFooterButton
        label="New quiz"
        disabled={busy || !!error}
        onClick={() => setConfirmNew(true)}
      />
    );
  } else {
    content = (
      <TriviaQuestionView
        key={quiz.items[quiz.cursor]!.question.id}
        quiz={quiz}
        busy={busy}
        blocked={!!error}
        onChange={changeQuiz}
      />
    );
  }

  return (
    <GameShell
      compact
      onHome={leave}
      footer={footer}
      title={
        <span className="flex items-center justify-center gap-2">
          <GameArtwork game="trivia" className="size-7" />
          Trivia
        </span>
      }
    >
      {game.warning && (
        <p role="status" className="mb-3 text-typ-muted text-muted-foreground">
          {game.warning}
        </p>
      )}
      {error && (
        <div className="mb-4 space-y-2">
          <p role="alert" className="text-destructive">
            {error}
          </p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void game.retry().catch(ignoreFailure)}
          >
            Retry save / load
          </Button>
        </div>
      )}
      {content}
      {confirmNew && (
        <ModalDialog title="Start a new quiz?" onClose={() => setConfirmNew(false)}>
          <p className="my-4">
            This replaces your saved quiz. Team names and settings stay ready to use.
          </p>
          <div className="space-y-2">
            <PrimaryFooterButton
              label="Start new quiz"
              disabled={busy}
              onClick={() =>
                void game
                  .reset()
                  .then(() => setConfirmNew(false))
                  .catch(ignoreFailure)
              }
            />
            <SecondaryFooterButton
              label="Keep current quiz"
              disabled={busy}
              onClick={() => setConfirmNew(false)}
            />
          </div>
        </ModalDialog>
      )}
    </GameShell>
  );
}

function TriviaSetup({
  initial,
  questions,
  busy,
  blocked,
  onChange,
  onStart,
}: {
  initial: TriviaSettings;
  questions: TriviaQuestion[];
  busy: boolean;
  blocked: boolean;
  onChange: (settings: TriviaSettings) => void;
  onStart: (settings: TriviaSettings) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [custom, setCustom] = useState(![10, 20, 30].includes(initial.count));
  const preferences = useSyncExternalStore(subscribeContentPreferences, getContentPreferenceState);
  useEffect(() => {
    void initializeContentPreferences();
  }, []);
  const eligibleCount = questions.filter(
    (question) =>
      draft.categories.includes(question.category) &&
      isTriviaQuestionEligible(question, {
        kidsMode: preferences.kidsMode,
        difficulty: draft.difficulty,
      }),
  ).length;
  const update = (patch: Partial<TriviaSettings>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    const parsed = triviaSettingsSchema.safeParse(next);
    if (parsed.success) onChange(parsed.data);
  };
  const valid = triviaSettingsSchema.safeParse(draft).success;
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-typ-section-title font-semibold">Set up your quiz</h2>
        <p className="text-typ-muted text-muted-foreground">One presenter · self-marked answers</p>
      </div>
      {questions.length === 0 && (
        <div role="status" className="space-y-1 rounded-xl bg-semantic-muted-panel-bg p-3">
          <h3 className="font-semibold">Questions are not available yet</h3>
          <p className="text-typ-muted text-muted-foreground">
            Add a reviewed question pack to play.
          </p>
        </div>
      )}
      <fieldset className="space-y-2">
        <legend className="mb-2 text-typ-ui font-semibold">Questions</legend>
        <div className="grid grid-cols-4 gap-2">
          {[10, 20, 30].map((count) => (
            <Button
              key={count}
              variant={!custom && draft.count === count ? "default" : "outline"}
              aria-pressed={!custom && draft.count === count}
              onClick={() => {
                setCustom(false);
                update({ count });
              }}
            >
              {count}
            </Button>
          ))}
          <Button
            variant={custom ? "default" : "outline"}
            aria-pressed={custom}
            onClick={() => setCustom(true)}
          >
            Custom
          </Button>
        </div>
        {custom && (
          <label className="flex items-center gap-3 text-typ-ui">
            <span className="flex-1">Custom count (1–100)</span>
            <input
              className={`${inputClass} w-24`}
              type="number"
              min={1}
              max={100}
              value={draft.count || ""}
              onChange={(event) => update({ count: Number(event.target.value) })}
            />
          </label>
        )}
      </fieldset>
      <DifficultySelect
        value={draft.difficulty}
        onChange={(difficulty) => update({ difficulty })}
      />
      <details className="rounded-xl border border-border px-3 py-2">
        <summary className="cursor-pointer py-1 text-typ-ui font-semibold">
          Categories · {draft.categories.length} of {triviaCategories.length}
        </summary>
        <div className="mt-2">
          {triviaCategories.map((category) => (
            <label key={category} className="flex min-h-12 items-center gap-2 text-typ-ui">
              <input
                className="size-5 shrink-0 accent-primary"
                type="checkbox"
                checked={draft.categories.includes(category)}
                onChange={(event) =>
                  update({
                    categories: event.target.checked
                      ? [...draft.categories, category]
                      : draft.categories.filter((value) => value !== category),
                  })
                }
              />
              <span>{triviaCategoryLabels[category]}</span>
            </label>
          ))}
        </div>
      </details>
      <fieldset>
        <legend className="mb-2 text-typ-ui font-semibold">Reveal answers</legend>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={draft.revealMode === "each" ? "default" : "outline"}
            aria-pressed={draft.revealMode === "each"}
            onClick={() => update({ revealMode: "each" })}
          >
            After each question
          </Button>
          <Button
            variant={draft.revealMode === "end" ? "default" : "outline"}
            aria-pressed={draft.revealMode === "end"}
            onClick={() => update({ revealMode: "end" })}
          >
            At the end
          </Button>
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-typ-ui font-semibold">Teams</legend>
        {draft.teams.map((team, index) => (
          <label key={index} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-typ-ui">Team {index + 1}</span>
            <input
              className={`${inputClass} flex-1`}
              maxLength={40}
              autoComplete="off"
              value={team}
              onChange={(event) =>
                update({
                  teams: draft.teams.map((name, teamIndex) =>
                    teamIndex === index ? event.target.value : name,
                  ),
                })
              }
            />
          </label>
        ))}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant="outline"
            disabled={draft.teams.length <= 1}
            onClick={() => update({ teams: draft.teams.slice(0, -1) })}
          >
            <Minus aria-hidden className="size-4" />
            Remove team
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            disabled={draft.teams.length >= 8}
            onClick={() => update({ teams: [...draft.teams, `Team ${draft.teams.length + 1}`] })}
          >
            <Plus aria-hidden className="size-4" />
            Add team
          </Button>
        </div>
      </fieldset>
      {!valid && (
        <p role="alert" className="text-typ-muted text-destructive">
          Choose 1–100 questions, at least one category and a name for every team.
        </p>
      )}
      {questions.length > 0 && (
        <p role="status" className="text-typ-muted text-muted-foreground">
          {eligibleCount} questions available{preferences.kidsMode ? " in Kids mode" : ""}.{" "}
          {draft.count > eligibleCount ? "Choose fewer questions or change the filters." : ""}
        </p>
      )}
      {preferences.error && (
        <div className="space-y-2">
          <p role="alert" className="text-destructive">
            {preferences.error}
          </p>
          <Button
            variant="outline"
            disabled={preferences.busy}
            onClick={() => void initializeContentPreferences()}
          >
            Retry Kids mode
          </Button>
        </div>
      )}
      <PrimaryFooterButton
        label={busy ? "Saving…" : "Start quiz"}
        disabled={
          busy ||
          blocked ||
          !valid ||
          !preferences.loaded ||
          preferences.busy ||
          draft.count > eligibleCount
        }
        onClick={() => onStart(draft)}
      />
    </section>
  );
}

function TriviaQuestionView({
  quiz,
  busy,
  blocked,
  onChange,
}: {
  quiz: TriviaQuiz;
  busy: boolean;
  blocked: boolean;
  onChange: (transform: (current: TriviaQuiz) => TriviaQuiz) => void;
}) {
  const item = quiz.items[quiz.cursor]!;
  const [answers, setAnswers] = useState(item.writtenAnswers);
  const [showWriting, setShowWriting] = useState(item.writtenAnswers.some(Boolean));
  const atEnd = !quiz.items.slice(quiz.cursor + 1).some((next) => !next.excluded);
  const applyAnswers = (current: TriviaQuiz) =>
    answers.reduce((next, answer, team) => setTriviaAnswer(next, team, answer), current);
  return (
    <section className="flex min-h-full flex-col gap-4">
      <div className="flex flex-wrap justify-between gap-1 text-typ-muted text-muted-foreground">
        <span>
          {quiz.phase === "answers" ? "Answer" : "Question"} {quiz.cursor + 1} of{" "}
          {quiz.items.length}
        </span>
        <span>
          {triviaCategoryLabels[item.question.category]} · {item.question.difficulty}
        </span>
      </div>
      <h2 className="material-callout break-words text-typ-section-title font-semibold">
        {item.question.question}
      </h2>
      {item.revealed ? (
        <>
          <div className="material-clue space-y-2 rounded-xl bg-secondary p-4">
            <h3 className="text-typ-ui font-semibold">Answer</h3>
            <p className="break-words text-typ-section-title font-semibold">
              {item.question.answer}
            </p>
            {item.question.acceptableAnswers.length > 0 && (
              <p className="break-words text-typ-muted">
                Also accept: {item.question.acceptableAnswers.join("; ")}
              </p>
            )}
            {item.question.explanation && (
              <p className="break-words text-typ-muted">{item.question.explanation}</p>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-typ-ui font-semibold">Mark each team · 1 point for correct</h3>
            {quiz.settings.teams.map((team, index) => (
              <div key={index} className="space-y-2 border-b border-border pb-3">
                <p className="break-words font-semibold">{team}</p>
                {item.writtenAnswers[index] && (
                  <p className="whitespace-pre-wrap break-words text-typ-muted">
                    {item.writtenAnswers[index]}
                  </p>
                )}
                <div
                  role="group"
                  aria-label={`Mark ${team}`}
                  className="grid grid-cols-[1fr_1fr_auto] gap-2"
                >
                  <Button
                    className="px-2"
                    variant={item.marks[index] === true ? "default" : "outline"}
                    aria-pressed={item.marks[index] === true}
                    disabled={busy || blocked}
                    onClick={() => onChange((current) => setTriviaMark(current, index, true))}
                  >
                    Correct
                  </Button>
                  <Button
                    className="px-2"
                    variant={item.marks[index] === false ? "secondary" : "outline"}
                    aria-pressed={item.marks[index] === false}
                    disabled={busy || blocked}
                    onClick={() => onChange((current) => setTriviaMark(current, index, false))}
                  >
                    Incorrect
                  </Button>
                  <Button
                    aria-label={`Clear mark for ${team}`}
                    size="icon"
                    variant="outline"
                    aria-pressed={item.marks[index] === null}
                    disabled={busy || blocked || item.marks[index] === null}
                    onClick={() => onChange((current) => setTriviaMark(current, index, null))}
                  >
                    <RotateCcw aria-hidden className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            aria-expanded={showWriting}
            onClick={() => setShowWriting(!showWriting)}
          >
            {showWriting ? "Hide written answers" : "Write answers here (optional)"}
          </Button>
          {showWriting &&
            quiz.settings.teams.map((team, index) => (
              <label key={index} className="block space-y-1">
                <span className="block break-words text-typ-ui font-semibold">{team} answer</span>
                <textarea
                  className={`${inputClass} w-full resize-y`}
                  rows={2}
                  maxLength={500}
                  value={answers[index]}
                  onChange={(event) => {
                    const text = event.target.value;
                    setAnswers((previous) =>
                      previous.map((value, teamIndex) => (teamIndex === index ? text : value)),
                    );
                    onChange((current) =>
                      current.items[current.cursor]?.question.id === item.question.id
                        ? setTriviaAnswer(current, index, text)
                        : current,
                    );
                  }}
                />
              </label>
            ))}
        </div>
      )}
      <div className="mt-auto space-y-2 pt-2">
        <PrimaryFooterButton
          disabled={busy || blocked}
          label={
            busy
              ? "Saving…"
              : !item.revealed && quiz.settings.revealMode === "each"
                ? "Reveal answer"
                : atEnd
                  ? quiz.phase === "questions" && quiz.settings.revealMode === "end"
                    ? "Reveal answers"
                    : "See results"
                  : quiz.phase === "answers"
                    ? "Next answer"
                    : "Next question"
          }
          onClick={() =>
            onChange((current) => {
              const answered = applyAnswers(current);
              return !item.revealed && current.settings.revealMode === "each"
                ? revealTriviaAnswer(answered)
                : nextTriviaQuestion(answered);
            })
          }
        />
        {item.revealed && item.marks.some((mark) => mark === null) && (
          <p className="text-center text-typ-muted text-muted-foreground">
            Unmarked teams receive no point.
          </p>
        )}
      </div>
    </section>
  );
}
