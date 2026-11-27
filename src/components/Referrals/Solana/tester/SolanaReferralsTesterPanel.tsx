// Tester for the Solana Referrals design review: sample states, shown only outside gmx.io. Never merged.
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";

import { isDevelopment } from "config/env";

import Button from "components/Button/Button";

import {
  setSolanaReferralsTester,
  useSolanaReferralsTester,
  type SolanaReferralsTesterPosition,
} from "./solanaReferralsTester";
import { SOLANA_REFERRALS_TESTER_SCENARIOS, type SolanaReferralsTesterScenario } from "./solanaReferralsTesterFixtures";

// The own affiliate code in each state, if any
const OWN_CODES: Partial<Record<SolanaReferralsTesterScenario, string>> = {
  affiliateNew: "SUNWAVE",
  affiliate: "SUNWAVE",
};

const SCENARIO_PRESETS: Record<SolanaReferralsTesterScenario, { label: string; hint: string }> = {
  live: { label: "Live", hint: "Real data. Solana referrals aren't wired yet, so there are no codes or stats" },
  disconnected: { label: "Disconnected", hint: "No wallet connected" },
  noCode: { label: "No referral code", hint: "Wallet connected, no code applied and no own code" },
  trader: { label: "Trader with a code", hint: "Applied code ALPHA, a year of small trades, no own code" },
  affiliateNew: { label: "Affiliate, no referrals", hint: "Own code SUNWAVE, nobody has used it yet" },
  affiliate: { label: "Affiliate with referrals", hint: "Own code SUNWAVE, 14 referees, 46 rewards" },
  big: { label: "Big numbers", hint: "Huge volume, a 12-character code, 12,480 referrals and big GT amounts" },
  loading: { label: "Loading", hint: "Wallet connected, data still loading" },
};

// The promo cards remember "closed" per account in localStorage; clear it and reload to see them again.
function showClosedPromosAgain() {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.includes("referrals-promo-closed"))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage can be blocked; nothing to clear then.
  }
  window.location.reload();
}

const DEFAULT_POSITION_CLASSNAME = "bottom-16 right-16";
const EDGE = 8;
const CLICK_THRESHOLD = 4;

function clamp(position: SolanaReferralsTesterPosition, element: HTMLElement): SolanaReferralsTesterPosition {
  const maxX = Math.max(EDGE, window.innerWidth - element.offsetWidth - EDGE);
  const maxY = Math.max(EDGE, window.innerHeight - element.offsetHeight - EDGE);

  return {
    x: Math.min(Math.max(position.x, EDGE), maxX),
    y: Math.min(Math.max(position.y, EDGE), maxY),
  };
}

// Drag the Tester by a handle. onPointerUp returns true when the gesture was a click, not a drag.
function useDraggable(savedPosition: SolanaReferralsTesterPosition | undefined) {
  const elementRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number; moved: boolean }>();
  const [livePosition, setLivePosition] = useState<SolanaReferralsTesterPosition>();

  const position = livePosition ?? savedPosition;

  // Keep the Tester on screen when it opens, collapses or the window shrinks.
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !savedPosition) return;

    const keepInView = () => {
      const next = clamp(savedPosition, element);
      if (next.x !== savedPosition.x || next.y !== savedPosition.y) setSolanaReferralsTester({ position: next });
    };

    keepInView();
    window.addEventListener("resize", keepInView);
    return () => window.removeEventListener("resize", keepInView);
  });

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    const element = elementRef.current;
    if (!element || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-no-drag]")) return;

    const rect = element.getBoundingClientRect();
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: rect.left,
      startY: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const element = elementRef.current;
    if (!drag || !element) return;

    const dx = event.clientX - drag.pointerX;
    const dy = event.clientY - drag.pointerY;
    if (!drag.moved && Math.hypot(dx, dy) < CLICK_THRESHOLD) return;

    drag.moved = true;
    setLivePosition(clamp({ x: drag.startX + dx, y: drag.startY + dy }, element));
  }, []);

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      dragRef.current = undefined;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!drag) return false;

      if (drag.moved && livePosition) {
        setSolanaReferralsTester({ position: livePosition });
        setLivePosition(undefined);
      }

      return !drag.moved;
    },
    [livePosition]
  );

  const style: CSSProperties | undefined = position ? { left: position.x, top: position.y } : undefined;
  const positionClassName = position ? "" : DEFAULT_POSITION_CLASSNAME;

  return {
    elementRef,
    style,
    positionClassName,
    isDragging: Boolean(livePosition),
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}

export function SolanaReferralsTesterPanel() {
  const { scenario, isCollapsed, position } = useSolanaReferralsTester();
  const drag = useDraggable(position);

  if (!isDevelopment()) return null;

  const dragHandlers = {
    onPointerDown: drag.onPointerDown,
    onPointerMove: drag.onPointerMove,
  };

  if (isCollapsed) {
    return createPortal(
      <button
        ref={(element) => {
          drag.elementRef.current = element;
        }}
        type="button"
        style={drag.style}
        className={`fixed z-[1100] flex touch-none select-none items-center gap-6 rounded-full border-1/2 border-slate-600 bg-slate-900 px-12 py-6 text-13 font-medium text-typography-primary hover:border-blue-300 ${drag.positionClassName} ${drag.isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        title="Click to open, drag to move the local tester"
        {...dragHandlers}
        onPointerUp={(event) => {
          if (drag.onPointerUp(event)) setSolanaReferralsTester({ isCollapsed: false });
        }}
        onClick={(event) => {
          if (event.detail === 0) setSolanaReferralsTester({ isCollapsed: false });
        }}
      >
        Tester
        <span className="text-blue-300">· {SCENARIO_PRESETS[scenario].label}</span>
      </button>,
      document.body
    );
  }

  return createPortal(
    <section
      ref={(element) => {
        drag.elementRef.current = element;
      }}
      style={drag.style}
      className={`fixed z-[1100] flex w-[320px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-8 border-1/2 border-slate-600 bg-slate-900 text-13 shadow-lg ${drag.positionClassName}`}
      aria-label="Tester"
    >
      <div
        className={`flex touch-none select-none items-center justify-between gap-8 border-b border-slate-600 p-12 ${drag.isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        title="Drag to move. Double-click to put it back in the corner."
        {...dragHandlers}
        onPointerUp={drag.onPointerUp}
        onDoubleClick={() => setSolanaReferralsTester({ position: undefined })}
      >
        <div className="min-w-0">
          <div className="text-14 font-medium text-typography-primary">Tester</div>
          <div className="truncate text-12 text-blue-300">{SCENARIO_PRESETS[scenario].label}</div>
        </div>
        <div data-no-drag>
          <Button variant="ghost" size="small" onClick={() => setSolanaReferralsTester({ isCollapsed: true })}>
            Hide
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-8 p-12">
        <div className="text-12 font-medium uppercase text-typography-secondary">Solana Referrals state</div>
        <div className="flex flex-wrap gap-6">
          {SOLANA_REFERRALS_TESTER_SCENARIOS.map((option) => (
            <Button
              key={option}
              variant={option === scenario ? "primary" : "secondary"}
              size="small"
              title={SCENARIO_PRESETS[option].hint}
              onClick={() => setSolanaReferralsTester({ scenario: option })}
            >
              {SCENARIO_PRESETS[option].label}
            </Button>
          ))}
        </div>
        <div className="text-12 text-typography-secondary">{SCENARIO_PRESETS[scenario].hint}.</div>
        <div className="text-12 text-typography-secondary">
          Try codes when applying: UNUSED (not found), WRONG (the letter O isn&apos;t allowed)
          {OWN_CODES[scenario] ? `, your own code ${OWN_CODES[scenario]} (not allowed)` : ""}. When creating: TAKEN
          (already taken).
        </div>
        <button
          type="button"
          className="self-start text-12 text-blue-300 hover:text-typography-primary"
          onClick={showClosedPromosAgain}
        >
          Show closed promo cards again
        </button>
      </div>
    </section>,
    document.body
  );
}
