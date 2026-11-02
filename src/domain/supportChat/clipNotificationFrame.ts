const NOTIFICATION_FRAME_SELECTOR = 'iframe[name="intercom-notification-stack-frame"]';
const NOTIFICATION_CARD_SELECTOR = '[data-testid="notification-preview"]';
// the desktop dismiss button sticks out of the card's top right corner by this much
const DISMISS_BUTTON_OVERHANG = 8;

// rounded down so float noise never clips into the card
const toInset = (value: number) => `${Math.floor(Math.max(0, value) * 100) / 100}px`;

/**
 * Intercom's notification iframe is bigger than its cards, and the empty edges still catch clicks
 * (footer, sidebar icons, mobile Long/Short bar). The edges are measured from the rendered cards,
 * since their size depends on Intercom's own mobile/touch checks. Undefined if there is nothing to measure.
 */
export function getNotificationFrameClipPath(frame: HTMLIFrameElement): string | undefined {
  const frameWindow = frame.contentWindow;
  const cards = Array.from(frame.contentDocument?.querySelectorAll<HTMLElement>(NOTIFICATION_CARD_SELECTOR) ?? []);

  if (!frameWindow || cards.length === 0) {
    return undefined;
  }

  let stack: HTMLElement | null = cards[0];
  while (stack && frameWindow.getComputedStyle(stack).position !== "fixed") {
    stack = stack.parentElement;
  }

  const frameRect = frame.getBoundingClientRect();
  // the stack sits above the bottom of the frame's viewport, which can be a fraction taller than the frame
  const bottom = stack
    ? parseFloat(frameWindow.getComputedStyle(stack).bottom) - (frameWindow.innerHeight - frameRect.height)
    : NaN;

  if (!Number.isFinite(bottom)) {
    return undefined;
  }

  // cards are centered and never wider than max-width; their rects keep an off-center card uncut
  const maxWidth = frameWindow.getComputedStyle(cards[0]).maxWidth;
  let left = maxWidth.endsWith("px") ? (frameRect.width - parseFloat(maxWidth)) / 2 : 0;
  let right = left;
  for (const card of cards) {
    const cardRect = card.getBoundingClientRect();
    left = Math.min(left, cardRect.left);
    right = Math.min(right, frameRect.width - cardRect.right);
  }

  return `inset(0px ${toInset(right - DISMISS_BUTTON_OVERHANG)} ${toInset(bottom)} ${toInset(left)})`;
}

export function clipNotificationFrame(): () => void {
  let frame: HTMLIFrameElement | null = null;
  let isStopped = false;

  const updateClip = () => {
    if (!frame || isStopped) {
      return;
    }

    const clipPath = getNotificationFrameClipPath(frame) ?? "";
    if (frame.style.clipPath !== clipPath) {
      frame.style.clipPath = clipPath;
    }

    // the stack can still be moving into place, so measure again once Intercom's transitions end
    const settlingAnimations =
      frame.contentDocument
        ?.getAnimations?.()
        .filter(
          (animation) => animation.playState === "running" && animation.effect?.getComputedTiming().endTime !== Infinity
        ) ?? [];

    if (settlingAnimations.length > 0) {
      void Promise.allSettled(settlingAnimations.map((animation) => animation.finished)).then(updateClip);
    }
  };

  const frameContentObserver = new MutationObserver(updateClip);
  const frameResizeObserver = new ResizeObserver(updateClip);

  const observeFrameDocument = () => {
    frameContentObserver.disconnect();

    // observe the document, not its <html>: in Firefox Intercom rewrites it via document.open().
    // Cast since the Document.dispatchEvent override in typings.d.ts breaks Document -> Node assignability
    const frameDocument = frame?.contentDocument as Node | null | undefined;
    if (frameDocument) {
      frameContentObserver.observe(frameDocument, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }

    updateClip();
  };

  const findFrame = () => {
    if (frame?.isConnected) {
      return;
    }

    frame?.removeEventListener("load", observeFrameDocument);
    frameResizeObserver.disconnect();

    frame = document.querySelector<HTMLIFrameElement>(NOTIFICATION_FRAME_SELECTOR);

    if (frame) {
      frame.addEventListener("load", observeFrameDocument);
      frameResizeObserver.observe(frame);
    }

    observeFrameDocument();
  };

  const pageObserver = new MutationObserver(findFrame);
  pageObserver.observe(document.body, { childList: true, subtree: true });
  findFrame();

  return () => {
    isStopped = true;
    pageObserver.disconnect();
    frameContentObserver.disconnect();
    frameResizeObserver.disconnect();

    if (frame) {
      frame.removeEventListener("load", observeFrameDocument);
      frame.style.clipPath = "";
    }
  };
}
