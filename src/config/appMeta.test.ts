import { describe, expect, it } from "vitest";

import { APP_DISPLAY_NAME } from "@/config/appMeta";

describe("app metadata", () => {
  it("uses the RVLRY product name in shared chrome", () => {
    expect(APP_DISPLAY_NAME).toBe("RVLRY");
  });
});
