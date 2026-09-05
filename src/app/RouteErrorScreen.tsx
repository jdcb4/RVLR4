import { isRouteErrorResponse, useRouteError } from "react-router-dom";

import { Button } from "@/components/ui/button";

const homeUrl = import.meta.env.BASE_URL;

function RecoveryScreen({ missing }: { readonly missing: boolean }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6 py-8">
      <h1 className="text-typ-section-title font-bold">
        {missing ? "Page not found" : "This screen could not load"}
      </h1>
      <p className="text-typ-body-relaxed text-muted-foreground">
        {missing
          ? "This link may be old or incomplete. Choose a game from the home page."
          : "Try reloading the page. Your saved games are kept, and you can return home if the problem continues."}
      </p>
      {!missing ? (
        <Button type="button" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      ) : null}
      <a
        className="rounded-xl border border-border px-4 py-3 text-center font-semibold focus-visible:outline focus-visible:outline-2"
        href={homeUrl}
      >
        Back to home
      </a>
    </main>
  );
}

export function NotFoundPage() {
  return <RecoveryScreen missing />;
}
export function RouteErrorScreen() {
  const error = useRouteError();
  return <RecoveryScreen missing={isRouteErrorResponse(error) && error.status === 404} />;
}
