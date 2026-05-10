import { describe, expect, it } from "vitest";

import {
  DEFAULT_IMPOSTER_THEME_ID,
  resolveImposterWordBank,
} from "./themeWords";

describe("resolveImposterWordBank", () => {
  const bank = ["a", "b", "c"];

  it("returns full bank for default theme", () => {
    expect(resolveImposterWordBank(DEFAULT_IMPOSTER_THEME_ID, bank)).toEqual(
      bank,
    );
    expect(resolveImposterWordBank("", bank)).toEqual(bank);
  });

  it("falls back to full bank for unknown theme until subsets exist", () => {
    expect(resolveImposterWordBank("places", bank)).toEqual(bank);
  });
});
