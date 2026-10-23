import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { updateContent } from "@/services/contentPacks/update";

type UpdateResult = Awaited<ReturnType<typeof updateContent>>;
const unavailableMessage =
  "Couldn't check for updates. Your existing words and Trivia questions are still available. Try again.";

function resultMessage({ updated, failures }: UpdateResult): string {
  if (failures.length === 2) {
    return unavailableMessage;
  }
  if (failures.length === 1) {
    const failed = failures[0] === "words" ? "words" : "Trivia questions";
    const changed = updated[0] === "words" ? "Words" : "Trivia questions";
    const success = updated.length > 0 ? `${changed} updated. ` : "";
    return `${success}Couldn't check ${failed}. Your existing ${failed} are still available. Try again.`;
  }
  if (updated.length === 0) return "No new content updates are available.";
  if (updated.length === 2) return "New words and Trivia questions are ready for new games.";
  return updated[0] === "words"
    ? "New words are ready for new games."
    : "New Trivia questions are ready for new games.";
}

export function ContentUpdatesSetting() {
  const descriptionId = useId();
  const pending = useRef(false);
  const mounted = useRef(true);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ message: "", error: false });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (status.message && !busy) statusRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [busy, status.message]);

  async function checkForUpdates() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setStatus({ message: "Checking for new words and Trivia questions…", error: false });
    try {
      const result = await updateContent();
      if (mounted.current) {
        setStatus({ message: resultMessage(result), error: result.failures.length > 0 });
      }
    } catch {
      if (mounted.current) {
        setStatus({
          message: unavailableMessage,
          error: true,
        });
      }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <section className="mt-3 border-t border-border pt-3" aria-label="Content updates">
      <Button
        type="button"
        disabled={busy}
        aria-busy={busy}
        aria-describedby={descriptionId}
        variant="outline"
        className="w-full justify-start"
        onClick={() => void checkForUpdates()}
      >
        Check for new words
      </Button>
      <p id={descriptionId} className="mt-1 text-typ-micro text-muted-foreground">
        Words and Trivia questions
      </p>
      <p
        ref={statusRef}
        role="status"
        aria-atomic="true"
        className={
          status.message
            ? `mt-2 text-typ-ui ${status.error ? "text-destructive" : "text-muted-foreground"}`
            : undefined
        }
      >
        {status.message}
      </p>
    </section>
  );
}
