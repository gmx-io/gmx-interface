import { describe, expect, it } from "vitest";

import { getCurtainStyle } from "../Curtain";

describe("getCurtainStyle", () => {
  it("combines device safe areas with the browser overlay inset", () => {
    expect(getCurtainStyle(48, 54)).toEqual({
      bottom: "calc(54px + var(--safe-area-inset-bottom))",
      left: "var(--safe-area-inset-left)",
      right: "var(--safe-area-inset-right)",
      transform: "translateY(calc(100% - 48px))",
      height: "calc(100dvh - 102px - var(--safe-area-inset-top) - var(--safe-area-inset-bottom))",
    });
  });
});
