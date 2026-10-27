import { afterEach, describe, expect, it } from "vitest";

import { clipNotificationFrame, getNotificationFrameClipPath } from "./clipNotificationFrame";

const FRAME_WIDTH = 400;

function createFrame({ height = 110, viewportHeight = 110 } = {}) {
  const frame = document.createElement("iframe");
  frame.name = "intercom-notification-stack-frame";
  // happy-dom 21 leaves contentWindow null for an iframe with neither src nor srcdoc
  frame.srcdoc = "";
  frame.getBoundingClientRect = () => new DOMRect(15, 780, FRAME_WIDTH, height);
  document.body.appendChild(frame);
  Object.defineProperty(frame.contentWindow, "innerHeight", { value: viewportHeight });
  return frame;
}

function renderCard(frame: HTMLIFrameElement, { maxWidth, left }: { maxWidth: string; left?: number }) {
  const frameDocument = frame.contentDocument!;
  const stack = frameDocument.createElement("div");
  stack.style.position = "fixed";
  stack.style.bottom = "32px";
  const card = frameDocument.createElement("div");
  card.dataset.testid = "notification-preview";
  card.style.maxWidth = maxWidth;
  card.getBoundingClientRect = () => {
    const width = parseFloat(card.style.maxWidth) || 340;
    return new DOMRect(left ?? (FRAME_WIDTH - width) / 2, 10, width, 68);
  };
  stack.appendChild(card);
  frameDocument.body.appendChild(stack);
  return card;
}

const flushMutations = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("getNotificationFrameClipPath", () => {
  it("does not clip a frame without cards", () => {
    expect(getNotificationFrameClipPath(createFrame())).toBeUndefined();
  });

  it("cuts the empty edges around the desktop card, keeping room for the dismiss button", () => {
    const frame = createFrame();
    renderCard(frame, { maxWidth: "340px" });

    expect(getNotificationFrameClipPath(frame)).toBe("inset(0px 22px 32px 30px)");
  });

  it("follows the wider touch card", () => {
    const frame = createFrame();
    renderCard(frame, { maxWidth: "384px" });

    expect(getNotificationFrameClipPath(frame)).toBe("inset(0px 0px 32px 8px)");
  });

  it("never cuts a card that is not centered", () => {
    const frame = createFrame();
    renderCard(frame, { maxWidth: "340px", left: 10 });

    expect(getNotificationFrameClipPath(frame)).toBe("inset(0px 22px 32px 10px)");
  });

  it("only clips the bottom when the card width is not in pixels", () => {
    const frame = createFrame();
    renderCard(frame, { maxWidth: "90%" });

    expect(getNotificationFrameClipPath(frame)).toBe("inset(0px 0px 32px 0px)");
  });

  it("measures the bottom gap from the frame box when its viewport is rounded up", () => {
    const frame = createFrame({ height: 121.8, viewportHeight: 122 });
    renderCard(frame, { maxWidth: "384px" });

    expect(getNotificationFrameClipPath(frame)).toBe("inset(0px 0px 31.79px 8px)");
  });
});

describe("clipNotificationFrame", () => {
  it("clips the frame once Intercom renders it and follows card changes until stopped", async () => {
    const stop = clipNotificationFrame();

    const frame = createFrame();
    await flushMutations();
    expect(frame.style.clipPath).toBe("");

    const card = renderCard(frame, { maxWidth: "340px" });
    await flushMutations();
    expect(frame.style.clipPath).toBe("inset(0px 22px 32px 30px)");

    card.style.maxWidth = "384px";
    await flushMutations();
    expect(frame.style.clipPath).toBe("inset(0px 0px 32px 8px)");

    stop();
    expect(frame.style.clipPath).toBe("");

    card.style.maxWidth = "340px";
    await flushMutations();
    expect(frame.style.clipPath).toBe("");
  });

  it("drops the clip when the cards are gone", async () => {
    const stop = clipNotificationFrame();
    const frame = createFrame();
    const card = renderCard(frame, { maxWidth: "340px" });
    await flushMutations();

    card.remove();
    await flushMutations();
    expect(frame.style.clipPath).toBe("");

    stop();
  });

  it("measures again once a running transition ends", async () => {
    const stop = clipNotificationFrame();
    const frame = createFrame();
    const card = renderCard(frame, { maxWidth: "340px" });
    await flushMutations();

    const { promise: finished, resolve: finishTransition } = Promise.withResolvers<void>();
    const transition = {
      playState: "running",
      effect: { getComputedTiming: () => ({ endTime: 300 }) },
      finished,
    };
    frame.contentDocument!.getAnimations = () => [transition as unknown as Animation];
    card.className = "entering";
    await flushMutations();
    expect(frame.style.clipPath).toBe("inset(0px 22px 32px 30px)");

    frame.getBoundingClientRect = () => new DOMRect(15, 780, FRAME_WIDTH, 109.5);
    transition.playState = "finished";
    finishTransition();
    await flushMutations();
    expect(frame.style.clipPath).toBe("inset(0px 22px 31.5px 30px)");

    stop();
  });
});
