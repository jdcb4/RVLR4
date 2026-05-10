/**
 * Semantic typography tiers — each maps to a Tailwind `text-typ-*` class backed by
 * CSS variables in `src/index.css`. Prefer these over raw `text-sm` / `text-xl` so
 * size, line-height, and letter-spacing stay aligned when tuning the system.
 */
export const typography = {
  /** Home hero title */
  display: "text-typ-display",
  /** Uppercase kickers, tight categories */
  overline: "text-typ-overline",
  /** `GameShell` header title */
  shellTitle: "text-typ-shell-title",
  /** `GamePanel` main heading */
  panelTitle: "text-typ-panel-title",
  /** Large in-flow headings (e.g. roster when headings are shown) */
  sectionTitle: "text-typ-section-title",
  /** Card / modal titles */
  cardTitle: "text-typ-card-title",
  /** Turn word highlight, hero emphasis */
  highlight: "text-typ-highlight",
  /** Large numeric scores and metric values */
  metric: "text-typ-metric",
  /** Default paragraph size */
  body: "text-typ-body",
  /** Intro / supporting paragraphs with relaxed leading */
  bodyRelaxed: "text-typ-body-relaxed",
  /** Secondary copy, notices, form legends, footnotes */
  ui: "text-typ-ui",
  /** Dense descriptions (e.g. game card blurbs) */
  uiSnug: "text-typ-ui-snug",
  /** Compact UI (header chips, dense lists) */
  micro: "text-typ-micro",
  /** Single-line text inputs */
  input: "text-typ-input",
} as const;

export type TypographyTier = keyof typeof typography;
