# Theming — semantic colors

## Layers

1. **Primitives** — HSL components on `:root` in `src/index.css` (`--primary`, `--background`, `--border`, …). These feed Tailwind’s `primary`, `muted`, `card`, etc.
2. **Default semantic theme** — `src/themes/default.css` defines `--semantic-*` variables. **Opacity and blends are expressed only here** (e.g. `hsl(var(--primary) / 0.05)`), not in React components.
3. **Tailwind** — `tailwind.config.ts` maps those variables under the **`semantic`** color group (`bg-semantic-primary-soft-bg`, `border-semantic-border-muted`, `bg-semantic-gallery`, …).

Components should use **`semantic-*`** utilities for any tinted surface, soft border, scrim, or gallery chrome—not raw palette utilities with `/opacity` modifiers.

## App-wide chooser (0.29.0)

Settings on the game picker offers Classic (the unchanged original), After-Hours Social, The Margin Note, Recess and Midnight Observatory. Selection commits through native SQLite under `app.appearance.v1` before the UI changes. Startup loads it before rendering the app; read failures leave Classic usable and expose Retry in Settings. Failed writes retain the previous selection and show a retry message. Game sessions are independent.

`src/themes/themePreference.ts` owns validation, loading and selection; `ThemeChooser.tsx` renders native radio controls. `variants.css` overrides primitives, semantic tokens, display fonts and scoped decorative details via `html[data-theme]`. Classic has no overrides. Licensed fonts are bundled under `public/fonts` for offline use. Control positions, game logic and touch sizes remain shared; category and skip colours are adapted for contrast in dark themes. Reduced-motion preferences disable theme press motion.

## Extending themes

To swap palettes per game or route: load an alternate stylesheet (or swap a class on `<html>`) that overrides **`--semantic-*`** (and optionally primitives). Import order should stay **primitives → theme → app** so derived tokens resolve correctly.

## Token reference (default)

| Token                                 | Typical use                              |
| ------------------------------------- | ---------------------------------------- |
| `--semantic-primary-soft-bg`          | Soft primary wash (e.g. highlight panel) |
| `--semantic-primary-well-bg`          | Icon / small emphasis well               |
| `--semantic-primary-border`           | Primary-tinted borders, hover outline    |
| `--semantic-primary-hover`            | Primary button hover                     |
| `--semantic-secondary-hover`          | Secondary button hover                   |
| `--semantic-accent-hover-wash`        | Card / row hover fill                    |
| `--semantic-muted-panel-bg`           | Muted inset panels                       |
| `--semantic-border-faint`             | Divider / inner borders                  |
| `--semantic-border-muted`             | Shell header rule                        |
| `--semantic-surface-elevated`         | Sticky footer / bar scrim                |
| `--semantic-destructive-border-soft`  | Warning callout border                   |
| `--semantic-destructive-surface-soft` | Warning callout background               |
| `--semantic-scrim`                    | Modal / overlay dim                      |
| `--semantic-gallery-chrome`           | UI gallery shell (HSL components)        |
| `--semantic-gallery-foreground`       | UI gallery default text                  |

## Recess material treatment (0.30.0)

Joe approved Option B of the isolated recess-materials study. src/themes/recess-materials.css loads after variants.css and scopes every rule to Recess. game-ticket, material-clue, material-callout and material-winner are presentation hooks; other themes ignore the new hooks. Pseudo-element paper layers are non-interactive, behind upright contents, with reserved gutters. Category colours retain semantic identity. Controls keep shared sizes and use pressed shadows; reduced motion suppresses translation. The study remains a historical proposal, not a runtime dependency.
