import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Curtain, getCurtainStyle } from "../Curtain";

afterEach(() => {
  cleanup();
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
  vi.useRealTimers();
});

describe("Curtain", () => {
  it("accounts for device safe areas", () => {
    expect(getCurtainStyle(48)).toEqual({
      bottom: "var(--safe-area-inset-bottom)",
      left: "var(--safe-area-inset-left)",
      right: "var(--safe-area-inset-right)",
      transform: "translateY(calc(100% - 48px))",
      height: "calc(100dvh - 48px - var(--safe-area-inset-top) - var(--safe-area-inset-bottom))",
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

  it("restores the collapsed position when a landscape drag is interrupted", () => {
    vi.useFakeTimers();
    const animate = vi.fn(() => {
      const animation = {
        addEventListener: (_event: string, listener: EventListener) => listener(new Event("finish")),
        cancel: vi.fn(),
        commitStyles: vi.fn(),
      };

      return animation as unknown as Animation;
    });
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });

    const { getByText } = render(
      <Curtain header={<span>Header</span>}>
        <span>Content</span>
      </Curtain>
    );
    const header = getByText("Header").parentElement?.parentElement;
    const curtain = header?.parentElement;
    const content = getByText("Content").parentElement;

    expect(header).not.toBeNull();
    fireEvent.pointerDown(header!, { screenX: 0, screenY: 100 });
    fireEvent.pointerMove(header!, { screenX: 0, screenY: 80 });

    expect(content?.className).not.toContain("invisible");
    expect(content?.getAttribute("aria-hidden")).toBe("false");

    fireEvent.touchCancel(window);

    expect(animate).toHaveBeenCalledWith(
      { transform: "translateY(calc(100% - 39px))" },
      { duration: 150, easing: "ease-out", fill: "both" }
    );
    expect(content?.className).toContain("invisible");
    expect(content?.getAttribute("aria-hidden")).toBe("true");
    expect(curtain?.style.transform).toBe("translateY(calc(100% - 39px))");

    fireEvent.pointerDown(header!, { screenX: 0, screenY: 100 });
    fireEvent.pointerMove(header!, { screenX: 0, screenY: 80 });
    fireEvent(window, new Event("resize"));
    vi.advanceTimersByTime(50);

    expect(animate).toHaveBeenCalledTimes(2);
    expect(curtain?.style.transform).toBe("translateY(calc(100% - 39px))");
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
