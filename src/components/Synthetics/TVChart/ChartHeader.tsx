import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import { useEffectOnce } from "react-use";

import { selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectTradeboxTradeFlags } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useBreakpoints } from "lib/breakpoints";
import { useChainId } from "lib/chains";
import { getToken } from "sdk/configs/tokens";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChartTokenSelector from "../ChartTokenSelector/ChartTokenSelector";
import { renderNetFeeHeaderTooltipContent } from "../MarketsList/NetFeeHeaderTooltipContent";
import { NetRate1hTooltip } from "./components/NetRate1hTooltip";
import { useChartHeaderFormattedValues } from "./useChartHeaderFormattedValues";

const MIN_FADE_AREA = 24; //px
const MAX_SCROLL_LEFT_TO_END_AREA = 50; //px
const MIN_SCROLL_END_SPACE = 5; // px

function ChartHeaderMobile() {
  const { chartToken } = useSelector(selectChartToken);
  const { isSwap } = useSelector(selectTradeboxTradeFlags);

  const { chainId } = useChainId();
  const chartTokenAddress = chartToken?.address;

  const selectedTokenOption = chartTokenAddress ? getToken(chainId, chartTokenAddress) : undefined;
  const [detailsVisible, setDetailsVisible] = useState(false);

  const {
    avgPrice,
    dailyVolume,
    dayPriceDelta,
    high24,
    liquidityLong,
    liquidityShort,
    longOIPercentage,
    longOIValue,
    low24,
    netRateLong,
    netRateShort,
    shortOIPercentage,
    shortOIValue,
  } = useChartHeaderFormattedValues();

  useEffect(() => {
    if (isSwap) {
      setDetailsVisible(false);
    }
  }, [isSwap]);

  const toggleDetailsVisible = useCallback(() => {
    setDetailsVisible((prev) => !prev);
  }, [setDetailsVisible]);

  const details = useMemo(() => {
    if (!detailsVisible) {
      return null;
    }

    if (isSwap) {
      return (
        <div className="grid grid-cols-[auto_auto] grid-rows-2 gap-14">
          <div>
            <div className="mb-4 text-[11px] font-medium uppercase text-slate-100">
              <Trans>24h High</Trans>
            </div>
            <div className="numbers">${high24}</div>
          </div>
          <div>
            <div className="mb-4 text-[11px] font-medium uppercase text-slate-100">
              <Trans>24h Low</Trans>
            </div>
            <div className="numbers">${low24}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-[auto_auto] grid-rows-2 gap-16">
        <div>
          <div className="mb-4 text-[11px] font-medium uppercase text-slate-100">
            <Trans>24h Volume</Trans>
          </div>
          <div className="numbers">{dailyVolume}</div>
        </div>

        <div>
          <div className="mb-4 whitespace-nowrap text-[11px] font-medium text-slate-100">
            <span className="whitespace-nowrap text-[11px] font-medium uppercase text-slate-100">
              <Trans>Open Interest</Trans>
            </span>
            <span>{" ("}</span>
            <span className="numbers">{longOIPercentage}</span>
            <span>/</span>
            <span className="numbers">{shortOIPercentage}</span>
            <span>{")"}</span>
          </div>
          <div className="flex flex-row items-center gap-8 ">
            <div className="flex flex-row items-center gap-8 numbers">{longOIValue}</div>
            <div className="flex flex-row items-center gap-8 numbers">{shortOIValue}</div>
          </div>
        </div>

        <div>
          <div className="mb-4 text-[11px] font-medium uppercase text-slate-100">
            <Trans>Available Liquidity</Trans>
          </div>
          <div className="flex flex-row items-center gap-8">
            <div className="flex flex-row items-center gap-8 numbers">{liquidityLong}</div>
            <div className="flex flex-row items-center gap-8 numbers">{liquidityShort}</div>
          </div>
        </div>

        <div>
          <div className="mb-4 text-[11px] font-medium uppercase text-slate-100">
            <TooltipWithPortal styleType="none" renderContent={renderNetFeeHeaderTooltipContent}>
              <Trans>Net Rate / 1h</Trans>
            </TooltipWithPortal>
          </div>
          <TooltipWithPortal
            styleType="none"
            as="div"
            className="inline-flex flex-row items-center gap-8"
            position="bottom-end"
            content={<NetRate1hTooltip />}
          >
            <div className="numbers">{netRateLong}</div>
            <div className="numbers">{netRateShort}</div>
          </TooltipWithPortal>
        </div>
      </div>
    );
  }, [
    dailyVolume,
    isSwap,
    liquidityLong,
    liquidityShort,
    longOIPercentage,
    longOIValue,
    netRateLong,
    netRateShort,
    shortOIPercentage,
    shortOIValue,
    detailsVisible,
    high24,
    low24,
  ]);

  return (
    <div className="rounded-8 bg-slate-800">
      <div className="flex items-start justify-between">
        <div className="inline-flex">
          <ChartTokenSelector selectedToken={selectedTokenOption} oneRowLabels={false} />
        </div>

        <div
          className="flex cursor-pointer flex-row items-start gap-8 p-8"
          role="button"
          onClick={toggleDetailsVisible}
        >
          <div className="flex flex-col items-end">
            <div className="mr-4 font-medium numbers">{avgPrice}</div>
            <div className="ExchangeChart-daily-change text-body-small numbers">{dayPriceDelta}</div>
          </div>
          <span className={cx("inline-flex cursor-pointer items-center justify-center rounded-4 pt-6 text-slate-100")}>
            {detailsVisible ? (
              <FaChevronUp className="-ml-6 -mt-2" size={12} />
            ) : (
              <FaChevronDown className="-ml-6 -mt-2" size={12} />
            )}
          </span>
        </div>
      </div>

      {details ? <div className="border-t-[1px] border-t-slate-600 p-16">{details}</div> : null}
    </div>
  );
}

function ChartHeaderDesktop() {
  const { chartToken } = useSelector(selectChartToken);
  const { isSwap } = useSelector(selectTradeboxTradeFlags);

  const scrollableRef = useRef<HTMLDivElement | null>(null);

  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollRight, setScrollRight] = useState(0);
  const [maxFadeArea, setMaxFadeArea] = useState(75);

  const { chainId } = useChainId();
  const chartTokenAddress = chartToken?.address;

  const selectedTokenOption = chartTokenAddress ? getToken(chainId, chartTokenAddress) : undefined;

  const setScrolls = useCallback(() => {
    const scrollable = scrollableRef.current;
    if (!scrollable) {
      return;
    }

    if (scrollable.scrollWidth > scrollable.clientWidth) {
      setScrollLeft(scrollable.scrollLeft);
      const right = scrollable.scrollWidth - scrollable.clientWidth - scrollable.scrollLeft;
      setScrollRight(right < MIN_SCROLL_END_SPACE ? 0 : right);
      setMaxFadeArea(scrollable.clientWidth / 10);
    } else {
      setScrollLeft(0);
      setScrollRight(0);
    }
  }, [scrollableRef]);

  useEffectOnce(() => {
    setScrolls();

    window.addEventListener("resize", setScrolls);
    scrollableRef.current?.addEventListener("scroll", setScrolls);

    return () => {
      window.removeEventListener("resize", setScrolls);
      scrollableRef.current?.removeEventListener("scroll", setScrolls);
    };
  });

  const leftStyles = useMemo(() => {
    return {
      width: `${Math.max(MIN_FADE_AREA, Math.min(scrollLeft + 8, maxFadeArea))}px`,
    };
  }, [scrollLeft, maxFadeArea]);

  const rightStyles = useMemo(() => {
    return {
      width: `${Math.max(MIN_FADE_AREA, Math.min(scrollRight + 8, maxFadeArea))}px`,
    };
  }, [scrollRight, maxFadeArea]);

  const {
    avgPrice,
    dailyVolume,
    dayPriceDelta,
    high24,
    liquidityLong,
    liquidityShort,
    longOIPercentage,
    longOIValue,
    low24,
    netRateLong,
    netRateShort,
    shortOIPercentage,
    shortOIValue,
    info,
  } = useChartHeaderFormattedValues();

  useEffect(() => {
    if (info) {
      setScrolls();
    }
  }, [info, setScrolls]);

  const additionalInfo = useMemo(() => {
    if (isSwap) {
      return (
        <>
          <ChartHeaderItem label={<Trans>24h High</Trans>} value={<span className="numbers">${high24}</span>} />
          <ChartHeaderItem label={<Trans>24h Low</Trans>} value={<span className="numbers">${low24}</span>} />
        </>
      );
    }

    return (
      <>
        <ChartHeaderItem label={<Trans>24h Volume</Trans>} value={<span className="numbers">{dailyVolume}</span>} />

        <ChartHeaderItem
          label={
            <Trans>
              Open Interest (<span className="numbers">{longOIPercentage}</span>/
              <span className="numbers">{shortOIPercentage}</span>)
            </Trans>
          }
          value={
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 numbers">{longOIValue}</div>
              <span className="text-slate-100">/</span>
              <div className="flex items-center gap-4 numbers">{shortOIValue}</div>
            </div>
          }
        />

        <ChartHeaderItem
          label={<Trans>Available Liquidity</Trans>}
          value={
            <div className="flex items-center gap-4">
              <span className="numbers">{liquidityLong}</span>
              <span className="text-slate-100">/</span>
              <span className="numbers">{liquidityShort}</span>
            </div>
          }
        />

        <ChartHeaderItem
          label={
            <TooltipWithPortal styleType="none" renderContent={renderNetFeeHeaderTooltipContent}>
              <Trans>Net Rate / 1h</Trans>
            </TooltipWithPortal>
          }
          value={
            <TooltipWithPortal
              styleType="none"
              as="div"
              className="Chart-header-value flex flex-row items-center gap-8"
              position="bottom-end"
              content={<NetRate1hTooltip />}
            >
              <div className="flex items-center gap-4">
                <div className="numbers">{netRateLong}</div>
                <span className="text-slate-100">/</span>
                <div className="numbers">{netRateShort}</div>
              </div>
            </TooltipWithPortal>
          }
        />
      </>
    );
  }, [
    dailyVolume,
    isSwap,
    liquidityLong,
    liquidityShort,
    longOIPercentage,
    longOIValue,
    netRateLong,
    netRateShort,
    shortOIPercentage,
    shortOIValue,
    high24,
    low24,
  ]);

  const scrollTo = useCallback(
    (dir: 1 | -1) => {
      if (!scrollableRef.current) {
        return;
      }

      let nextNonVisibleElement: Element | undefined;

      const { left: containerLeft, width: containerWidth } = scrollableRef.current.getBoundingClientRect();
      const containerRight = containerLeft + containerWidth;

      for (const child of scrollableRef.current.children) {
        const { left: childLeft, right: childRight, width: childWidth } = child.getBoundingClientRect();
        const childVisibleLeft = Math.max(childLeft, containerLeft);
        const childVisibleRight = Math.min(childRight, containerRight);
        const isVisible = childVisibleRight - childVisibleLeft === childWidth;

        if (dir === 1 && childLeft > containerLeft && !isVisible) {
          nextNonVisibleElement = child;
          break;
        } else if (dir === -1 && childRight < containerRight && !isVisible) {
          nextNonVisibleElement = child;
        }
      }

      if (!nextNonVisibleElement) {
        return;
      }

      let proposedScrollLeft = dir * nextNonVisibleElement.getBoundingClientRect().width;
      const nextLeftScroll = scrollableRef.current.scrollLeft + proposedScrollLeft;

      /**
       * This part is to prevent scrolling to visible area of element but leaving a small margin to the end (MAX_SCROLL_LEFT_TO_END_AREA),
       * it's better to scroll to the end in such cases
       */
      if (
        (dir === 1 && containerWidth - nextLeftScroll < MAX_SCROLL_LEFT_TO_END_AREA) ||
        (dir === -1 && nextLeftScroll < MAX_SCROLL_LEFT_TO_END_AREA)
      ) {
        proposedScrollLeft = dir * containerWidth;
      }

      scrollableRef.current.scrollBy({
        left: proposedScrollLeft,
        behavior: "smooth",
      });
      setScrolls();
    },
    [scrollableRef, setScrolls]
  );

  const scrollToLeft = useCallback(() => scrollTo(-1), [scrollTo]);
  const scrollToRight = useCallback(() => scrollTo(1), [scrollTo]);

  return (
    <div className="flex gap-16 overflow-hidden">
      <div className="flex shrink-0 items-center justify-start">
        <ChartTokenSelector selectedToken={selectedTokenOption} oneRowLabels={true} />
      </div>
      <div className="relative flex overflow-hidden">
        <div className="pointer-events-none absolute z-40 flex h-full w-full flex-row justify-between">
          <div
            className={cx("Chart-top-scrollable-fade-left", {
              "!pointer-events-none opacity-0": scrollLeft <= 0,
              "opacity-100": scrollLeft > 0,
            })}
            style={leftStyles}
            onClick={scrollToLeft}
          >
            {scrollLeft > 0 && <BiChevronLeft className="text-slate-100" size={24} />}
          </div>
          <div
            className={cx("Chart-top-scrollable-fade-right", {
              "!pointer-events-none opacity-0": scrollRight <= 0,
              "opacity-100": scrollRight > 0,
            })}
            style={rightStyles}
            onClick={scrollToRight}
          >
            {scrollRight > 0 && <BiChevronRight className="text-slate-100" size={24} />}
          </div>
        </div>
        <div className={cx("flex gap-20 overflow-x-auto scrollbar-hide")} ref={scrollableRef}>
          <div className="Chart-price">
            <div className="mb-2 text-[13px] numbers">{avgPrice}</div>
            <div className="text-body-small numbers">{dayPriceDelta}</div>
          </div>
          {additionalInfo}
        </div>
      </div>
    </div>
  );
}

const ChartHeaderItem = ({ label, value }: { label: ReactNode; value: ReactNode }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.08em] text-slate-100">
        {label}
      </div>
      <div className="text-body-medium numbers">{value}</div>
    </div>
  );
};

export default function ChartHeader() {
  const { isMobile } = useBreakpoints();

  return isMobile ? <ChartHeaderMobile /> : <ChartHeaderDesktop />;
}
