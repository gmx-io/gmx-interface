// Tester for the DES-103 design review (copied from DES-96): close markets on demand and show a trader's positions. Local only, never merged.
import cx from "classnames";
import { CSSProperties, PointerEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useTheme } from "context/ThemeContext/ThemeContext";
import { dynamicActivate, locales, type Locale } from "lib/i18n";

import { isClosedMarketsTesterAllowed, setClosedMarketsTester, useClosedMarketsTester } from "./closedMarketsTester";
import { findSampleTrader } from "./findSampleTrader";

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

export function ClosedMarketsTesterPanel() {
  const tester = useClosedMarketsTester();
  const marketsInfoData = useSelector(selectMarketsInfoData);

  const chainId = useSelector(selectChainId);
  const { setThemeMode } = useTheme();
  // the sample trader is searched in the closed markets (or all TradFi markets while none are closed)
  const searchMarkets = useMemo(
    () =>
      Object.values(marketsInfoData ?? {})
        .filter((marketInfo) =>
          tester.closedSymbols.length
            ? tester.closedSymbols.includes(marketInfo.indexToken.symbol)
            : (marketInfo.indexToken as { categories?: string[] }).categories?.includes("tradfi")
        )
        .map((marketInfo) => marketInfo.marketTokenAddress),
    [marketsInfoData, tester.closedSymbols]
  );

  // find a sample trader live, so no wallet address is written into the code
  useEffect(() => {
    if (!isClosedMarketsTesterAllowed || !tester.isOn || tester.viewMode !== "sample" || tester.viewAs) return;
    let isCancelled = false;
    findSampleTrader(chainId, searchMarkets)
      .then((account) => {
        if (!isCancelled && account) setClosedMarketsTester({ viewAs: account });
      })
      .catch(() => undefined);
    return () => {
      isCancelled = true;
    };
  }, [chainId, searchMarkets, tester.isOn, tester.viewMode, tester.viewAs]);

  const tradFiSymbols = useMemo(() => {
    const symbols = new Set<string>();
    for (const marketInfo of Object.values(marketsInfoData ?? {})) {
      const categories = (marketInfo.indexToken as { categories?: string[] }).categories;
      if (categories?.includes("tradfi") && !marketInfo.isSpotOnly) {
        symbols.add(marketInfo.indexToken.symbol);
      }
    }
    return [...symbols].sort();
  }, [marketsInfoData]);

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
      setClosedMarketsTester({ pillPos: lastPosRef.current });
      setLivePos(null);
    }
  };
  const onPillClick = () => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    setClosedMarketsTester({ isPanelOpen: !tester.isPanelOpen });
  };

  if (!isClosedMarketsTesterAllowed) {
    return null;
  }

  const savedPos = livePos ?? tester.pillPos;
  const pos = savedPos && typeof window !== "undefined" ? clamp(savedPos.x, savedPos.y) : null;
  // The panel opens away from the closest screen edge: above the pill in the lower half, below it in the upper half.
  const opensUp = !pos || pos.y > window.innerHeight / 2;
  const pillHeight = pillRef.current?.offsetHeight ?? 26;
  const pillWidth = pillRef.current?.offsetWidth ?? 120;
  // ...and toward the middle: in the right half it grows to the left, so it never runs off screen.
  const alignsRight = Boolean(pos && pos.x + pillWidth / 2 > window.innerWidth / 2);
  const positionStyle: CSSProperties | undefined = pos
    ? {
        ...(alignsRight ? { right: window.innerWidth - pos.x - pillWidth } : { left: pos.x }),
        ...(opensUp ? { bottom: window.innerHeight - pos.y - pillHeight } : { top: pos.y }),
      }
    : undefined;

  const toggleSymbol = (symbol: string) => {
    const closedSymbols = tester.closedSymbols.includes(symbol)
      ? tester.closedSymbols.filter((s) => s !== symbol)
      : [...tester.closedSymbols, symbol];
    setClosedMarketsTester({ isOn: true, closedSymbols });
  };

  return (
    <div
      data-qa="closed-markets-tester"
      style={positionStyle}
      className={cx(
        "fixed z-[1200] flex gap-4",
        opensUp ? "flex-col-reverse" : "flex-col",
        alignsRight ? "items-end" : "items-start",
        {
          "bottom-80 left-8 md:bottom-16": !pos,
        }
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
        Tester ·{" "}
        {tester.isOn ? (tester.closedSymbols.length ? `${tester.closedSymbols.length} closed` : "all open") : "Live"}
      </button>
      {tester.isPanelOpen ? (
        <div className="flex max-h-[60dvh] w-[300px] max-w-[calc(100vw-16px)] flex-col gap-10 overflow-y-auto rounded-8 border-1/2 border-slate-600 bg-slate-950/95 p-10">
          <Row label="Closed markets (change live, no reload)">
            {tradFiSymbols.map((symbol) => (
              <Chip
                key={symbol}
                isActive={tester.isOn && tester.closedSymbols.includes(symbol)}
                onClick={() => toggleSymbol(symbol)}
              >
                {symbol}
              </Chip>
            ))}
            <Chip onClick={() => setClosedMarketsTester({ isOn: true, closedSymbols: tradFiSymbols })}>
              Close all TradFi
            </Chip>
            <Chip onClick={() => setClosedMarketsTester({ isOn: true, closedSymbols: [] })}>Reopen all</Chip>
            <Chip isActive={!tester.isOn} onClick={() => setClosedMarketsTester({ isOn: !tester.isOn })}>
              Live data
            </Chip>
          </Row>
          <Row label="Positions and orders of">
            <Chip
              isActive={tester.viewMode === "sample"}
              onClick={() => setClosedMarketsTester({ viewMode: "sample", viewAs: "" })}
            >
              Sample trader (found live)
            </Chip>
            <Chip
              isActive={tester.viewMode === "wallet"}
              onClick={() => setClosedMarketsTester({ viewMode: "wallet" })}
            >
              My wallet
            </Chip>
            <Chip onClick={() => setClosedMarketsTester({ viewMode: "sample", viewAs: "" })}>Find again</Chip>
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
