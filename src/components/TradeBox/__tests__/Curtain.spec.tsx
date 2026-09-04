import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("lib/wallets/oneKeyUiCompat", () => ({
  getOverlayedBottomInset: () => 0,
  useOverlayedBottomInset: () => 0,
}));

import { Curtain, getCurtainStyle } from "../Curtain";

afterEach(cleanup);

describe("Curtain", () => {
  it("combines device safe areas with the browser overlay inset", () => {
    expect(getCurtainStyle(48, 54)).toEqual({
      bottom: "calc(54px + var(--safe-area-inset-bottom))",
      left: "var(--safe-area-inset-left)",
      right: "var(--safe-area-inset-right)",
      transform: "translateY(calc(100% - 48px))",
      height: "calc(100dvh - 102px - var(--safe-area-inset-top) - var(--safe-area-inset-bottom))",
    });
  });

  it("hides its content while collapsed", () => {
    const { getByText } = render(
      <Curtain header={<span>Header</span>}>
        <span>Content</span>
      </Curtain>
    );
    const content = getByText("Content").parentElement;

    expect(content?.className).toContain("invisible");
    expect(content?.getAttribute("aria-hidden")).toBe("true");
  });

  it("extends its background through the bottom safe area", () => {
    const { container } = render(
      <Curtain header={<span>Header</span>} dataQa="curtain">
        <span>Content</span>
      </Curtain>
    );
    const curtain = container.querySelector('[data-qa="curtain"]');

    expect(curtain?.className).toContain("after:h-[var(--safe-area-inset-bottom)]");
    expect(curtain?.className).toContain("after:bg-slate-900");
  });
});
