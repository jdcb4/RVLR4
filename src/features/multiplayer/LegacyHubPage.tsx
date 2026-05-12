import { Link } from "react-router-dom";

import {
  IconMask,
  IconSparkles,
  IconTheatre,
} from "@/components/icons";

const games = [
  {
    id: "whowhatwhere",
    title: "Who What Where",
    description:
      "Teams race to describe mystery words across What, Who, and Where categories before the timer runs out.",
    to: "/games/whowhatwhere",
    icon: IconSparkles,
  },
  {
    id: "hat",
    title: "Hat Game",
    description:
      "Celebrity-style clues in three phases using your own figure list.",
    to: "/games/hat",
    icon: IconTheatre,
  },
  {
    id: "imposter",
    title: "Imposter",
    description:
      "Hidden roles and one secret word - pass the phone for private reveals.",
    to: "/games/imposter",
    icon: IconMask,
  },
] as const;

/** Pass-and-Play hub — pick a game when you have one phone to share around the table. */
export function LegacyHubPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="safe-screen mx-auto w-full max-w-md px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="py-8 text-center">
          <p className="font-medium uppercase text-typ-overline text-primary">
            Pass-and-Play mode
          </p>
          <h1 className="mt-2 text-typ-display font-bold">Party games, one phone</h1>
          <p className="mx-auto mt-4 max-w-prose text-typ-body-relaxed text-muted-foreground">
            One phone, passed around the table. Want everyone on their own device?{" "}
            <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/">
              Switch to Multi-Device mode
            </Link>
            .
          </p>
        </header>

        <ul className="grid gap-4 pb-12">
          {games.map((game) => {
            const Icon = game.icon;

            return (
              <li key={game.id}>
                <Link
                  className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-semantic-primary-border hover:bg-semantic-accent-hover-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  to={game.to}
                >
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-semantic-primary-well-bg text-primary">
                    <Icon className="size-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-typ-card-title font-semibold">{game.title}</h2>
                    <p className="mt-1 text-typ-ui-snug text-muted-foreground">
                      {game.description}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
