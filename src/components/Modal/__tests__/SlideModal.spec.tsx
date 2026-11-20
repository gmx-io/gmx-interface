import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { createPortal } from "react-dom";
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

describe("slide modal animation lifecycle", () => {
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
  it("drags the curtain only from its own header or on a pull down from the top of its own nested list TRD-31", () => {
    const cases = [
      { listScrollTop: 300, pointerYs: [550], drags: false },
      { listScrollTop: 0, pointerYs: [250, 550], drags: false },
      { listScrollTop: 0, pointerYs: [550], drags: true },
      { listScrollTop: 0, pointerYs: [550], isPortaled: true, drags: false },
      { listScrollTop: 0, pointerYs: [550], isInHeader: true, drags: true },
      { listScrollTop: 0, pointerYs: [550], isInHeader: true, isPortaled: true, drags: false },
    ];

    for (const { listScrollTop, pointerYs, isPortaled, isInHeader, drags } of cases) {
      const listElement = <div data-testid="list">Row</div>;
      const target = isPortaled ? createPortal(listElement, document.body) : listElement;
      const view = render(
        <SlideModal qa="curtain" isVisible setIsVisible={() => undefined} headerContent={isInHeader && target}>
          {!isInHeader && target}
        </SlideModal>
      );
      const curtain = view.baseElement.querySelector<HTMLElement>('[data-qa="curtain"]')!;
      const list = view.getByTestId("list");
      list.scrollTop = listScrollTop;

      fireEvent.pointerDown(list, { screenX: 0, screenY: 400 });
      pointerYs.forEach((screenY) => fireEvent.pointerMove(list, { screenX: 0, screenY }));

      expect(curtain.style.transform !== "").toBe(drags);
      cleanup();
    }
  });
});
