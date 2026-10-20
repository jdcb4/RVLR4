import { Link } from "react-router-dom";

import { IconDisguise, IconQuestionMark, IconTopHat } from "@/components/icons";

import packageJson from "../../../package.json";

/** The first Android device-test build intentionally exposes one converted game. */
export function PassNPlayHubPage() {
  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col gap-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <header>
        <h1 className="text-typ-display font-bold tracking-tight text-primary">RVLRY</h1>
        <p className="mt-2 text-typ-body text-muted-foreground">One phone. Everyone plays.</p>
      </header>
      <section aria-labelledby="pick-game">
        <h2 id="pick-game" className="mb-3 text-typ-panel-title font-semibold">
          Pick a game
        </h2>
        <Link
          className="flex flex-col gap-4 rounded-2xl bg-primary p-5 text-primary-foreground transition-colors hover:bg-semantic-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          to="/games/whowhatwhere"
        >
          <IconQuestionMark className="size-9" />
          <div>
            <h3 className="text-typ-section-title font-bold">Who What Where</h3>
            <p className="mt-2 text-typ-body">Describe the word. Beat the timer. Pass the phone.</p>
          </div>
          <span className="text-typ-body font-semibold">Play or resume →</span>
        </Link>
      </section>
      <section aria-labelledby="next-games">
        <h2 id="next-games" className="text-typ-card-title font-semibold">
          Coming next
        </h2>
        <p className="mt-1 text-typ-ui text-muted-foreground">
          Hat Game and Imposter follow after this phone test.
        </p>
        <ul className="mt-2 divide-y divide-border">
          <li className="flex items-center gap-3 py-4">
            <IconTopHat className="size-6" />
            <span>Hat Game</span>
          </li>
          <li className="flex items-center gap-3 py-4">
            <IconDisguise className="size-6" />
            <span>Imposter</span>
          </li>
        </ul>
      </section>
      <details className="mt-auto rounded-xl border border-border p-4">
        <summary className="min-h-12 cursor-pointer content-center font-semibold">
          Settings &amp; app info
        </summary>
        <div className="space-y-3 pt-3 text-typ-ui text-muted-foreground">
          <p>Android prototype · {packageJson.version}</p>
          <p>Words are included on your phone. No internet connection is needed to play.</p>
          <button
            type="button"
            disabled
            className="min-h-12 w-full rounded-md border border-border px-3 text-left"
          >
            Check for new words — not configured yet
          </button>
          <p>A word-update source will be added before the friends-testing release.</p>
        </div>
      </details>
    </main>
  );
}
