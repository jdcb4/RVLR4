import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./gallery.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /** Semantic colors — values come from theme CSS (see src/themes/default.css). */
        semantic: {
          "primary-soft-bg": "var(--semantic-primary-soft-bg)",
          "primary-well-bg": "var(--semantic-primary-well-bg)",
          "primary-border": "var(--semantic-primary-border)",
          "primary-hover": "var(--semantic-primary-hover)",
          "secondary-hover": "var(--semantic-secondary-hover)",
          "accent-hover-wash": "var(--semantic-accent-hover-wash)",
          "muted-panel-bg": "var(--semantic-muted-panel-bg)",
          "border-faint": "var(--semantic-border-faint)",
          "border-muted": "var(--semantic-border-muted)",
          "surface-elevated": "var(--semantic-surface-elevated)",
          "destructive-border-soft": "var(--semantic-destructive-border-soft)",
          "destructive-surface-soft": "var(--semantic-destructive-surface-soft)",
          scrim: "var(--semantic-scrim)",
          gallery: {
            DEFAULT: "hsl(var(--semantic-gallery-chrome))",
            header: "hsl(var(--semantic-gallery-chrome) / 0.95)",
            foreground: "hsl(var(--semantic-gallery-foreground))",
          },
        },
      },
      fontSize: {
        "typ-display": [
          "var(--font-tier-display-size)",
          {
            lineHeight: "var(--font-tier-display-leading)",
            letterSpacing: "var(--font-tier-display-tracking)",
          },
        ],
        "typ-overline": [
          "var(--font-tier-overline-size)",
          {
            lineHeight: "var(--font-tier-overline-leading)",
            letterSpacing: "var(--font-tier-overline-tracking)",
          },
        ],
        "typ-shell-title": [
          "var(--font-tier-shell-title-size)",
          {
            lineHeight: "var(--font-tier-shell-title-leading)",
            letterSpacing: "var(--font-tier-shell-title-tracking)",
          },
        ],
        "typ-panel-title": [
          "var(--font-tier-panel-title-size)",
          {
            lineHeight: "var(--font-tier-panel-title-leading)",
            letterSpacing: "var(--font-tier-panel-title-tracking)",
          },
        ],
        "typ-section-title": [
          "var(--font-tier-section-title-size)",
          {
            lineHeight: "var(--font-tier-section-title-leading)",
            letterSpacing: "var(--font-tier-section-title-tracking)",
          },
        ],
        "typ-card-title": [
          "var(--font-tier-card-title-size)",
          {
            lineHeight: "var(--font-tier-card-title-leading)",
            letterSpacing: "var(--font-tier-card-title-tracking)",
          },
        ],
        "typ-highlight": [
          "var(--font-tier-highlight-size)",
          {
            lineHeight: "var(--font-tier-highlight-leading)",
            letterSpacing: "var(--font-tier-highlight-tracking)",
          },
        ],
        "typ-metric": [
          "var(--font-tier-metric-size)",
          {
            lineHeight: "var(--font-tier-metric-leading)",
            letterSpacing: "var(--font-tier-metric-tracking)",
          },
        ],
        "typ-body": [
          "var(--font-tier-body-size)",
          {
            lineHeight: "var(--font-tier-body-leading)",
            letterSpacing: "var(--font-tier-body-tracking)",
          },
        ],
        "typ-body-relaxed": [
          "var(--font-tier-body-relaxed-size)",
          {
            lineHeight: "var(--font-tier-body-relaxed-leading)",
            letterSpacing: "var(--font-tier-body-relaxed-tracking)",
          },
        ],
        "typ-ui": [
          "var(--font-tier-ui-size)",
          {
            lineHeight: "var(--font-tier-ui-leading)",
            letterSpacing: "var(--font-tier-ui-tracking)",
          },
        ],
        "typ-ui-snug": [
          "var(--font-tier-ui-snug-size)",
          {
            lineHeight: "var(--font-tier-ui-snug-leading)",
            letterSpacing: "var(--font-tier-ui-snug-tracking)",
          },
        ],
        "typ-micro": [
          "var(--font-tier-micro-size)",
          {
            lineHeight: "var(--font-tier-micro-leading)",
            letterSpacing: "var(--font-tier-micro-tracking)",
          },
        ],
        "typ-input": [
          "var(--font-tier-input-size)",
          {
            lineHeight: "var(--font-tier-input-leading)",
            letterSpacing: "var(--font-tier-input-tracking)",
          },
        ],
      },
      keyframes: {
        "confetti-fall": {
          "0%": {
            transform: "translateY(-14vh) rotate(0deg)",
            opacity: "1",
          },
          "100%": {
            transform: "translateY(105vh) rotate(680deg)",
            opacity: "0.28",
          },
        },
      },
      animation: {
        "confetti-fall": "confetti-fall linear forwards",
      },
    },
  },
  plugins: [],
};

export default config;
