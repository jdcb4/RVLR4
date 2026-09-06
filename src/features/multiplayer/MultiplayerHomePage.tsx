import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { IconDisguise, IconPencil, IconQuestionMark, IconTopHat } from "@/components/icons";
import { LandingAttribution } from "@/components/LandingAttribution";
import { ModeSwitchCard } from "@/components/ModeSwitchCard";
import { clearActiveGameBookmark, readActiveGameBookmark } from "@/multiplayer/activeGameBookmark";
import { gameKindLabel } from "@/multiplayer/gameKindLabel";
import { loadSession } from "@/multiplayer/useRoomChannel";
import { requestHttp } from "@/services/networkRequests";

const games = [
  {
    id: "whowhatwhere",
    title: "Who What Where",
    description:
      "Teams race to describe mystery words across What, Who, and Where categories before the timer runs out.",
    icon: IconQuestionMark,
  },
  {
    id: "hat",
    title: "Hat Game",
    description: "Celebrity-style clues in three phases using your own figure list.",
    icon: IconTopHat,
  },
  {
    id: "imposter",
    title: "Imposter",
    description: "Hidden roles and one secret word - timed clues, discussion, and the big reveal.",
    icon: IconDisguise,
  },
  {
    id: "drawnguess",
    title: "DrawNGuess",
    description: "Draw prompts, guess drawings, and reveal each book as the chain changes hands.",
    icon: IconPencil,
  },
] as const;

export function MultiplayerHomePage() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [resume, setResume] = useState<{
    readonly code: string;
    readonly gameKind: "whowhatwhere" | "hat" | "imposter" | "drawnguess";
    readonly startedAtIso: string;
  } | null>(null);

  useEffect(() => {
    const bookmark = readActiveGameBookmark();

    if (!bookmark) {
      setResume(null);

      return undefined;
    }

    if (!loadSession(bookmark.code)) {
      setResume(null);

      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    void (async () => {
      try {
        const { response, data } = await requestHttp(
          `/api/rooms/${encodeURIComponent(bookmark.code)}`,
          async (response) => ({
            response,
            data: (await response.json()) as {
              exists?: boolean;
              phase?: string;
              resumeEligible?: boolean;
            },
          }),
          { signal: controller.signal },
        );

        if (cancelled) {
          return;
        }

        const resumeOk =
          response.ok &&
          data.exists === true &&
          (data.resumeEligible === true ||
            (data.resumeEligible === undefined && data.phase === "playing"));

        if (resumeOk) {
          setResume(bookmark);
        } else {
          clearActiveGameBookmark();
          setResume(null);
        }
      } catch {
        if (!cancelled) {
          setResume(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const handleJoinSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = joinCode.trim().toUpperCase();

    if (trimmed.length < 4) {
      return;
    }

    navigate(`/name?intent=join&code=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="safe-screen mx-auto w-full max-w-md pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="py-6 text-center">
          <h1 className="text-typ-display font-bold tracking-tight text-primary">RVLRY</h1>
          <p className="mx-auto mt-2 max-w-prose text-typ-body-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Multi-Device mode</span> — everyone
            bring a phone
          </p>
        </header>

        {resume ? (
          <section className="mb-4 rounded-2xl border border-primary/30 bg-semantic-primary-soft-bg p-4 shadow-sm">
            <h2 className="text-typ-card-title font-semibold">Resume your game</h2>
            <p className="mt-1 text-typ-ui-snug text-muted-foreground">
              This table is still in progress and your browser still has your seat saved.
            </p>
            <Link
              className="mt-4 flex w-full flex-col gap-1 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-semantic-primary-border hover:bg-semantic-accent-hover-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              to={`/room/${encodeURIComponent(resume.code)}`}
            >
              <span className="font-mono text-typ-section-title font-bold tracking-[0.2em] text-foreground">
                {resume.code}
              </span>
              <span className="text-typ-ui text-muted-foreground">
                {gameKindLabel(resume.gameKind)}
              </span>
              <span className="text-typ-ui-snug text-muted-foreground">
                Started {new Date(resume.startedAtIso).toLocaleString()}
              </span>
            </Link>
          </section>
        ) : null}

        <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-typ-card-title font-semibold">Join a room</h2>
          <form className="mt-3 flex flex-col gap-3" onSubmit={handleJoinSubmit}>
            <label className="sr-only" htmlFor="join-code">
              Join code
            </label>
            <input
              autoCapitalize="characters"
              autoComplete="off"
              className="rounded-xl border border-input bg-background px-3 py-2 text-typ-body-relaxed outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              enterKeyHint="go"
              id="join-code"
              inputMode="text"
              maxLength={8}
              placeholder="Join code. e.g. ABC123"
              spellCheck={false}
              type="text"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
            />
            <button
              className="rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              disabled={joinCode.trim().length < 4}
              type="submit"
            >
              Join game
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-typ-card-title font-semibold">Host a room</h2>
          <ul className="mt-3 grid gap-3">
            {games.map((game) => {
              const Icon = game.icon;

              return (
                <li key={game.id}>
                  <button
                    className="flex w-full gap-4 rounded-xl border border-border bg-background p-3 text-left shadow-sm transition-colors hover:border-semantic-primary-border hover:bg-semantic-accent-hover-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[319px]:flex-col"
                    type="button"
                    onClick={() =>
                      navigate(`/name?intent=host&game=${encodeURIComponent(game.id)}`)
                    }
                  >
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-semantic-primary-well-bg text-primary">
                      <Icon className="size-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-typ-card-title font-semibold">{game.title}</h3>
                      <p className="mt-0.5 text-typ-ui-snug text-muted-foreground">
                        {game.description}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <ModeSwitchCard
          ariaLabel="Switch to Pass-and-Play mode"
          description="Hand the device around the table — no codes, no second devices needed."
          eyebrow="Just one phone?"
          title="Use Pass-and-Play mode"
          to="/passnplay"
        />

        <LandingAttribution />
      </div>
    </div>
  );
}
