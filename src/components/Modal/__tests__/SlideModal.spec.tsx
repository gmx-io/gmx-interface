import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("lib/useBreakpoints", () => ({ useBreakpoints: () => ({ isMobile: true }) }));
vi.mock("lib/pwa/blockAutoReload", () => ({ useBlockAutoReload: () => undefined }));
vi.mock("../Modal", () => ({ default: () => null }));

import { SlideModal } from "../SlideModal";

type TestAnimation = EventTarget & { cancel: ReturnType<typeof vi.fn>; commitStyles: ReturnType<typeof vi.fn> };
let animations: TestAnimation[];
const originalAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "animate");

function modal(visible: boolean) {
  return (
    <SlideModal qa="curtain" isVisible={visible} setIsVisible={() => undefined}>
      Content
    </SlideModal>
  );
}

describe("slide modal animation lifecycle", () => {
  beforeEach(() => {
    animations = [];
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => {
        const animation = Object.assign(new EventTarget(), {
          cancel: vi.fn(),
          commitStyles: vi.fn(() => {
            throw new Error("Target element is not rendered");
          }),
        });
        animations.push(animation);
        return animation as unknown as Animation;
      }),
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    if (originalAnimate) Object.defineProperty(HTMLElement.prototype, "animate", originalAnimate);
    else Reflect.deleteProperty(HTMLElement.prototype, "animate");
  });

  it("finishes without requiring the target to be rendered", () => {
    const view = render(modal(true));
    const curtain = view.baseElement.querySelector<HTMLElement>('[data-qa="curtain"]')!;
    curtain.style.display = "none";
    act(() => animations[0].dispatchEvent(new Event("finish")));
    expect(curtain.style.transform).toBe("translateY(-100%)");
    expect(animations[0].commitStyles).not.toHaveBeenCalled();
    expect(animations[0].cancel).toHaveBeenCalledOnce();
  });

  it("cancels the previous animation and ignores its late finish", () => {
    const view = render(modal(true));
    view.rerender(modal(false));
    expect(animations[0].cancel).toHaveBeenCalledOnce();
    act(() => animations[1].dispatchEvent(new Event("finish")));
    act(() => animations[0].dispatchEvent(new Event("finish")));
    const curtain = view.baseElement.querySelector<HTMLElement>('[data-qa="curtain"]')!;
    expect(curtain.style.transform).toBe("translateY(0)");
  });
});

describe("slide modal drag", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "animate").mockImplementation(
      () => Object.assign(new EventTarget(), { cancel: vi.fn() }) as unknown as Animation
    );
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("drags the curtain only on a pull down from the top of a nested list PRO-4546", () => {
    const cases = [
      { listScrollTop: 300, pointerYs: [550], transform: "" },
      { listScrollTop: 0, pointerYs: [250, 550], transform: "" },
      { listScrollTop: 0, pointerYs: [550], transform: "translateY(-550px)" },
    ];

    for (const { listScrollTop, pointerYs, transform } of cases) {
      const view = render(
        <SlideModal qa="curtain" isVisible setIsVisible={() => undefined}>
          <div data-testid="list">Row</div>
        </SlideModal>
      );
      const curtain = view.baseElement.querySelector<HTMLElement>('[data-qa="curtain"]')!;
      Object.defineProperty(curtain, "clientHeight", { value: 700 });
      vi.spyOn(curtain, "getBoundingClientRect").mockReturnValue({ top: window.innerHeight - 700 } as DOMRect);
      const list = view.getByTestId("list");
      list.scrollTop = listScrollTop;

      fireEvent.pointerDown(list, { screenX: 0, screenY: 400 });
      pointerYs.forEach((screenY) => fireEvent.pointerMove(list, { screenX: 0, screenY }));

      expect(curtain.style.transform).toBe(transform);
      cleanup();
    }
  });
});
