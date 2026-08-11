import { describe, expect, it } from "vitest";

import { IS_EXPRESS_AVAILABLE_UI_FLAG, UiFlags, getIsExpressAvailable } from "./useUiFlagsRequest";

function flags(enabled: boolean): UiFlags {
  return { [IS_EXPRESS_AVAILABLE_UI_FLAG]: { enabled, createdAt: "", updatedAt: "" } };
}

describe("getIsExpressAvailable", () => {
  it("only an explicit false takes express away", () => {
    expect(getIsExpressAvailable(flags(false))).toBe(false);
    expect(getIsExpressAvailable(flags(true))).toBe(true);
  });

  // a keeper that is unreachable, or a chain that never published the flag, must not disable
  // express for everyone — the per-request failure path covers a relay that is actually down
  it("stays available when the flag is missing entirely", () => {
    expect(getIsExpressAvailable(undefined)).toBe(true);
    expect(getIsExpressAvailable({})).toBe(true);
  });
});
