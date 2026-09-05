import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist", "build", "coverage", ".claude", ".turbo", ".wrangler", "**/*.generated.*"],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // Preserve the Hooks checks used by this app; React Compiler is not enabled.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      ...jsxA11y.configs.recommended.rules,
      // Game components use a domain `role` prop; validate ARIA on DOM elements.
      "jsx-a11y/aria-role": ["error", { ignoreNonDOM: true }],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Minimal naming rule — types/interfaces/classes are PascalCase. Stronger
      // project-specific conventions (game tokens, mode modifiers, cross-game
      // parallel actions) are checked by `pnpm run audit:names`, see docs/NAMING.md.
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "typeLike", format: ["PascalCase"] },
      ],
    },
  },
  {
    // This module exports route configuration, not a Fast Refresh boundary.
    files: ["src/app/router.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  prettier,
);
