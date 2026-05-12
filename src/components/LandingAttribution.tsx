import packageJson from "../../package.json";

/**
 * Small attribution line for landing-page footers. Discrete enough to fade
 * into the background; readable to anyone who looks for it.
 */
export function LandingAttribution() {
  return (
    <p className="mt-6 text-center text-typ-ui-snug text-muted-foreground/70">
      by{" "}
      <a
        className="underline-offset-2 hover:underline"
        href="https://github.com/jdcb4"
        rel="noreferrer noopener"
        target="_blank"
      >
        jdcb4
      </a>{" "}
      · v{packageJson.version}
    </p>
  );
}
