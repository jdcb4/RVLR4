import { Link } from "react-router-dom";

import {
  IconDisguise,
  IconQuestionMark,
  IconTopHat,
} from "@/components/icons";
import { ModeSwitchCard } from "@/components/ModeSwitchCard";

const games = [
  {
    id: "whowhatwhere",
    title: "Who What Where",
    description:
      "Teams race to describe mystery words across What, Who, and Where categories before the timer runs out.",
    to: "/games/whowhatwhere",
    icon: IconQuestionMark,
  },
  {
    id: "hat",
    title: "Hat Game",
    description:
      "Celebrity-style clues in three phases using your own figure list.",
    to: "/games/hat",
    icon: IconTopHat,
  },
  {
    id: "imposter",
    title: "Imposter",
    description:
      "Hidden roles and one secret word - pass the phone for private reveals.",
    to: "/games/imposter",
    icon: IconDisguise,
  },
] as const;

/** Pass-and-Play hub — pick a game when you have one phone to share around the table. */
export function PassNPlayHubPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="safe-screen mx-auto w-full max-w-md px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="py-6 text-center">
          <p className="font-medium uppercase text-typ-overline text-primary">
            Pass-and-Play mode
          </p>
          <h1 className="mt-2 text-typ-display font-bold">Party games, one phone</h1>
          <p className="mx-auto mt-3 max-w-prose text-typ-body-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Pass-and-Play mode</span> — one phone,
            passed around the table.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-typ-card-title font-semibold">Pick a game</h2>
          <p className="mt-1 text-typ-ui-snug text-muted-foreground">
            Hand the device around the table — no codes, no second devices needed.
          </p>
          <ul className="mt-3 grid gap-3">
            {games.map((game) => {
              const Icon = game.icon;

              return (
                <li key={game.id}>
                  <Link
                    className="flex gap-4 rounded-xl border border-border bg-background p-3 shadow-sm transition-colors hover:border-semantic-primary-border hover:bg-semantic-accent-hover-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    to={game.to}
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
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <ModeSwitchCard
          ariaLabel="Switch to Multi-Device mode"
          description="Host on one phone and let everyone join with a short code from their own device."
          eyebrow="Everyone has a phone?"
          title="Use Multi-Device mode"
          to="/"
        />
      </div>
    </div>
  );
}
