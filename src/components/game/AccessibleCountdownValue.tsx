import { useEffect, useRef, useState } from "react";

export function AccessibleCountdownValue({
  secondsLeft,
  formattedValue,
  countdownKey,
}: {
  readonly secondsLeft: number | null;
  readonly formattedValue: string;
  readonly countdownKey: string | number;
}) {
  const [announcement, setAnnouncement] = useState("");
  const activeKeyRef = useRef<string | number | null>(null);
  const previousSecondsRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeKeyRef.current !== countdownKey) {
      activeKeyRef.current = countdownKey;
      previousSecondsRef.current = null;
      setAnnouncement("");
    }

    if (secondsLeft === null) {
      previousSecondsRef.current = null;
      return;
    }

    const previousSeconds = previousSecondsRef.current;

    const nextAnnouncement = getCountdownAnnouncement(previousSeconds, secondsLeft);
    if (nextAnnouncement) {
      setAnnouncement(nextAnnouncement);
    }

    previousSecondsRef.current = secondsLeft;
  }, [countdownKey, secondsLeft]);

  return (
    <>
      <span aria-hidden="true">{formattedValue}</span>
      <span className="sr-only">Time remaining: {formattedValue}</span>
      <span className="sr-only" aria-atomic="true" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}

function getCountdownAnnouncement(
  previousSeconds: number | null,
  secondsLeft: number,
): string | null {
  if (secondsLeft <= 0 && (previousSeconds === null || previousSeconds > 0)) {
    return "Time is up.";
  }

  if (secondsLeft > 0 && secondsLeft <= 10 && (previousSeconds === null || previousSeconds > 10)) {
    return `${secondsLeft} seconds remaining.`;
  }

  return null;
}
