# Theming — semantic colors

## Layers

1. **Primitives** — HSL components on `:root` in `src/index.css` (`--primary`, `--background`, `--border`, …). These feed Tailwind’s `primary`, `muted`, `card`, etc.
2. **Default semantic theme** — `src/themes/default.css` defines `--semantic-*` variables. **Opacity and blends are expressed only here** (e.g. `hsl(var(--primary) / 0.05)`), not in React components.
3. **Tailwind** — `tailwind.config.ts` maps those variables under the **`semantic`** color group (`bg-semantic-primary-soft-bg`, `border-semantic-border-muted`, `bg-semantic-gallery`, …).

Components should use **`semantic-*`** utilities for any tinted surface, soft border, scrim, or gallery chrome—not raw palette utilities with `/opacity` modifiers.

## Adding another theme later

To swap palettes per game or route: load an alternate stylesheet (or swap a class on `<html>`) that overrides **`--semantic-*`** (and optionally primitives). Import order should stay **primitives → theme → app** so derived tokens resolve correctly.

## Token reference (default)

| Token | Typical use |
| --- | --- |
| `--semantic-primary-soft-bg` | Soft primary wash (e.g. highlight panel) |
| `--semantic-primary-well-bg` | Icon / small emphasis well |
| `--semantic-primary-border` | Primary-tinted borders, hover outline |
| `--semantic-primary-hover` | Primary button hover |
| `--semantic-secondary-hover` | Secondary button hover |
| `--semantic-accent-hover-wash` | Card / row hover fill |
| `--semantic-muted-panel-bg` | Muted inset panels |
| `--semantic-border-faint` | Divider / inner borders |
| `--semantic-border-muted` | Shell header rule |
| `--semantic-surface-elevated` | Sticky footer / bar scrim |
| `--semantic-destructive-border-soft` | Warning callout border |
| `--semantic-destructive-surface-soft` | Warning callout background |
| `--semantic-scrim` | Modal / overlay dim |
| `--semantic-gallery-chrome` | UI gallery shell (HSL components) |
| `--semantic-gallery-foreground` | UI gallery default text |
