// Tester for the long numbers design review: a sample trader's positions (for Edit margin), theme and language.
// Local only, never merged.
import cx from "classnames";
import { CSSProperties, PointerEvent, ReactNode, useEffect, useRef, useState } from "react";

import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useTheme } from "context/ThemeContext/ThemeContext";
import { dynamicActivate, locales, type Locale } from "lib/i18n";
import { getTokenBySymbolSafe } from "sdk/configs/tokens";

import { findSampleTrader } from "./findSampleTrader";
import { isLongNumbersTesterAllowed, setLongNumbersTester, useLongNumbersTester } from "./longNumbersTester";

function Chip({ isActive, onClick, children }: { isActive?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-6 border-1/2 px-8 py-4 text-12",
        isActive
          ? "border-blue-300 bg-blue-300/20 text-typography-primary"
          : "border-slate-600 text-typography-secondary hover:text-typography-primary"
      )}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-11 uppercase tracking-wide text-typography-secondary">{label}</div>
      <div className="flex flex-wrap gap-4">{children}</div>
    </div>
  );
}

export function LongNumbersTesterPanel() {
  const tester = useLongNumbersTester();
  const chainId = useSelector(selectChainId);
  const { setThemeMode } = useTheme();

  // find a sample trader live, so no wallet address is written into the code
  useEffect(() => {
    if (!isLongNumbersTesterAllowed || !tester.isOn || tester.viewMode !== "sample" || tester.viewAs) return;
    const usdc = getTokenBySymbolSafe(chainId, "USDC");
    if (!usdc) return;
    let isCancelled = false;
    findSampleTrader(chainId, usdc.address)
      .then((account) => {
        if (!isCancelled && account) setLongNumbersTester({ viewAs: account });
      })
      .catch(() => undefined);
    return () => {
      isCancelled = true;
    };
  }, [chainId, tester.isOn, tester.viewMode, tester.viewAs]);

  // Drag the pill anywhere; a short tap still opens or closes the panel. The spot is remembered.
  const pillRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const wasDraggedRef = useRef(false);
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);

  const clamp = (x: number, y: number) => {
    const w = pillRef.current?.offsetWidth ?? 120;
    const h = pillRef.current?.offsetHeight ?? 26;
    return {
      x: Math.min(Math.max(4, x), window.innerWidth - w - 4),
      y: Math.min(Math.max(4, y), window.innerHeight - h - 4),
    };
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    const next = clamp(drag.origX + dx, drag.origY + dy);
    lastPosRef.current = next;
    setLivePos(next);
  };
  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved && lastPosRef.current) {
      wasDraggedRef.current = true;
      setLongNumbersTester({ pillPos: lastPosRef.current });
      setLivePos(null);
    }
  };
  const onPillClick = () => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    setLongNumbersTester({ isPanelOpen: !tester.isPanelOpen });
  };

  if (!isLongNumbersTesterAllowed) {
    return null;
  }

  const shortAccount = tester.viewAs ? `${tester.viewAs.slice(0, 6)}…${tester.viewAs.slice(-4)}` : "searching…";

  const savedPos = livePos ?? tester.pillPos;
  const pos = savedPos ? clamp(savedPos.x, savedPos.y) : null;
  // the panel opens away from the closest screen edge, and grows toward the middle
  const opensUp = !pos || pos.y > window.innerHeight / 2;
  const pillHeight = pillRef.current?.offsetHeight ?? 26;
  const pillWidth = pillRef.current?.offsetWidth ?? 120;
  const alignsRight = Boolean(pos && pos.x + pillWidth / 2 > window.innerWidth / 2);
  const positionStyle: CSSProperties | undefined = pos
    ? {
        ...(alignsRight ? { right: window.innerWidth - pos.x - pillWidth } : { left: pos.x }),
        ...(opensUp ? { bottom: window.innerHeight - pos.y - pillHeight } : { top: pos.y }),
      }
    : undefined;

  return (
    <div
      data-qa="long-numbers-tester"
      style={positionStyle}
      className={cx(
        "fixed z-[1200] flex gap-4",
        opensUp ? "flex-col-reverse" : "flex-col",
        alignsRight ? "items-end" : "items-start",
        { "bottom-80 left-8 md:bottom-16": !pos }
      )}
    >
      <button
        ref={pillRef}
        type="button"
        title="Drag to move, tap to open"
        className={cx(
          "touch-none select-none rounded-full border-1/2 border-yellow-300 bg-slate-950 px-10 py-4 text-12 font-medium text-yellow-300",
          livePos ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onPillClick}
      >
        Tester · Long numbers
      </button>
      {tester.isPanelOpen ? (
        <div className="flex max-h-[60dvh] w-[300px] max-w-[calc(100vw-16px)] flex-col gap-10 overflow-y-auto rounded-8 border-1/2 border-slate-600 bg-slate-950/95 p-10">
          <Row label="Positions of">
            <Chip
              isActive={tester.isOn && tester.viewMode === "sample"}
              onClick={() => setLongNumbersTester({ isOn: true, viewMode: "sample" })}
            >
              Sample trader · {shortAccount}
            </Chip>
            <Chip
              isActive={!tester.isOn || tester.viewMode === "wallet"}
              onClick={() => setLongNumbersTester({ viewMode: "wallet" })}
            >
              My wallet
            </Chip>
            <Chip onClick={() => setLongNumbersTester({ isOn: true, viewMode: "sample", viewAs: "" })}>Find again</Chip>
          </Row>
          <Row label="Try">
            <div className="flex flex-col gap-4 text-12 text-typography-secondary">
              <span>Margin or Pay: type 9 twenty times, it stops at 15 digits</span>
              <span>Positions: Edit margin, Withdraw, type 999999999999999</span>
              <span>Swap USDC to PEPE: Pay 999999999999999, see Minimum receive</span>
            </div>
          </Row>
          <Row label="Theme">
            <Chip onClick={() => setThemeMode("light")}>Light</Chip>
            <Chip onClick={() => setThemeMode("dark")}>Dark</Chip>
          </Row>
          <Row label="Language">
            {(Object.keys(locales) as Locale[])
              .filter((locale) => locale !== "pseudo")
              .map((locale) => (
                <Chip key={locale} onClick={() => dynamicActivate(locale)}>
                  {locales[locale]}
                </Chip>
              ))}
          </Row>
        </div>
      ) : null}
    </div>
  );
}
