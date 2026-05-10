# Typography tiers

Named **font tiers** connect UI components to Tailwind via **`text-typ-*`** utilities. Each tier maps to **font size**, **line height**, and **letter spacing** stored as CSS variables in `src/index.css`, so you can retune the whole app without hunting for raw `text-sm` / `tracking-tight` usage.

## Files

| File | Role |
|------|------|
| `src/index.css` | `--font-tier-*` CSS variables on `:root` |
| `tailwind.config.ts` | `theme.extend.fontSize` entries (`typ-display`, `typ-ui`, …) |
| `src/typography/tiers.ts` | Exported `typography` map (`typography.display` → `"text-typ-display"`) for autocomplete |

## Tiers (summary)

| Tailwind class | Typical use |
|----------------|-------------|
| `text-typ-display` | Home hero title |
| `text-typ-overline` | Uppercase kickers (`tracking` baked in) |
| `text-typ-shell-title` | `GameShell` header title |
| `text-typ-panel-title` | `GamePanel` main heading |
| `text-typ-section-title` | Large in-flow headings (e.g. roster when headings shown) |
| `text-typ-card-title` | Card titles, app info dialog title |
| `text-typ-highlight` | Turn word highlight |
| `text-typ-metric` | Scores, timer tiles |
| `text-typ-body` | Default paragraph |
| `text-typ-body-relaxed` | Long intro copy |
| `text-typ-ui` | Secondary copy, legends, notices, button labels (via `Button`) |
| `text-typ-ui-snug` | Dense card blurbs |
| `text-typ-micro` | Chips, dense toolbar labels |
| `text-typ-input` | Text inputs |

Combine tiers with **font weight** and **color** utilities (`font-semibold`, `text-muted-foreground`) as needed.

## New games / components

Prefer **`text-typ-{tier}`** or `cn(typography.panelTitle, "font-semibold")` instead of raw Tailwind font sizes. See `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`.
