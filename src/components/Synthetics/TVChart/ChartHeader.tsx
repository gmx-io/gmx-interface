import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEffectOnce, useMedia } from "react-use";

import { VersionSwitch } from "components/VersionSwitch/VersionSwitch";
import { getToken } from "sdk/configs/tokens";

import { selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectTradeboxTradeFlags } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { useChainId } from "lib/chains";

import { BiChevronDown, BiChevronLeft, BiChevronRight } from "react-icons/bi";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import ChartTokenSelector from "../ChartTokenSelector/ChartTokenSelector";
import { renderNetFeeHeaderTooltipContent } from "../MarketsList/NetFeeHeaderTooltipContent";
import { NetRate1hTooltip } from "./components/NetRate1hTooltip";
import { useChartHeaderFormattedValues } from "./useChartHeaderFormattedValues";

const MIN_FADE_AREA = 24; //px
const MAX_SCROLL_LEFT_TO_END_AREA = 50; //px
const MIN_SCROLL_END_SPACE = 5; // px

function ChartHeaderInfoMobile() {
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

  const isSmallMobile = useMedia("(max-width: 400px)");

  const details = useMemo(() => {
    if (!detailsVisible) {
      return null;
    }

    if (isSwap) {
      return (
        <div
          className={cx("grid gap-14 pt-16", {
            "grid-cols-1 grid-rows-2": isSmallMobile,
            "grid-cols-[repeat(2,_auto)] grid-rows-1": !isSmallMobile,
          })}
        >
          <div>
            <div className="ExchangeChart-info-label mb-4">
              <Trans>24h High</Trans>
            </div>
            <div>${high24}</div>
          </div>
          <div>
            <div className="ExchangeChart-info-label mb-4">
              <Trans>24h Low</Trans>
            </div>
            <div>${low24}</div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={cx("grid gap-14 pt-16", {
          "grid-cols-1 grid-rows-4": isSmallMobile,
          "grid-cols-[repeat(2,_auto)] grid-rows-2": !isSmallMobile,
        })}
      >
        <div>
          <div className="ExchangeChart-info-label mb-4">
            <Trans>24h Volume</Trans>
          </div>
          {dailyVolume}
        </div>

        <div>
          <div className="mb-4 whitespace-nowrap">
            <span className="text-slate-100">
              <Trans>Open Interest</Trans>
            </span>
            <span className="text-slate-100">{" ("}</span>
            <span className="positive">{longOIPercentage}</span>
            <span className="text-slate-100">/</span>
            <span className="negative">{shortOIPercentage}</span>
            <span className="text-slate-100">{")"}</span>
          </div>
          <div className="flex flex-row items-center gap-8">
            <div className="flex flex-row items-center gap-8">{longOIValue}</div>
            <div className="flex flex-row items-center gap-8">{shortOIValue}</div>
          </div>
        </div>

        <div>
          <div className="ExchangeChart-info-label mb-4">
            <Trans>Available Liquidity</Trans>
          </div>
          <div className="flex flex-row items-center gap-8">
            <div className="flex flex-row items-center gap-8">{liquidityLong}</div>
            <div className="flex flex-row items-center gap-8">{liquidityShort}</div>
          </div>
        </div>

        <div>
          <div className="ExchangeChart-info-label mb-4">
            <TooltipWithPortal disableHandleStyle renderContent={renderNetFeeHeaderTooltipContent}>
              <Trans>Net Rate / 1h</Trans>
            </TooltipWithPortal>
          </div>
          <TooltipWithPortal
            disableHandleStyle
            as="div"
            className="inline-flex flex-row items-center gap-8"
            position="bottom-end"
            content={<NetRate1hTooltip />}
          >
            <div>{netRateLong}</div>
            <div>{netRateShort}</div>
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
    isSmallMobile,
    detailsVisible,
    high24,
    low24,
  ]);

  return (
    <div className="mb-10 rounded-4 bg-slate-800 p-16">
      <div className="grid grid-cols-[auto_100px]">
        <div>
          <div className="inline-flex">
            <ChartTokenSelector selectedToken={selectedTokenOption} oneRowLabels={!isSmallMobile} />
          </div>

          <div
            className="mt-8 flex cursor-pointer flex-row items-center gap-8"
            role="button"
            onClick={toggleDetailsVisible}
          >
            <span
              className={cx("inline-flex cursor-pointer items-center justify-center rounded-4", {
                "bg-slate-700": !detailsVisible,
                "bg-slate-500": detailsVisible,
              })}
            >
              {detailsVisible ? <BiChevronDown size={22} /> : <BiChevronRight size={22} />}
            </span>
            <div className="mr-4">{avgPrice}</div>
            <div className="ExchangeChart-daily-change">{dayPriceDelta}</div>
          </div>
        </div>
        <div className="flex items-start justify-center">
          <VersionSwitch />
        </div>
      </div>
      {details}
    </div>
  );
}

function ChartHeaderInfoDesktop() {
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
          <div className="text-body-small">
            <div className="ExchangeChart-info-label mb-4">
              <Trans>24h High</Trans>
            </div>
            <div className="Chart-header-value">${high24}</div>
          </div>
          <div>
            <div className="ExchangeChart-info-label mb-4">
              <Trans>24h Low</Trans>
            </div>
            <div className="Chart-header-value">${low24}</div>
          </div>
        </>
      );
    }

    return (
      <>
        <div>
          <div className="ExchangeChart-info-label mb-4">24h Volume</div>
          <div className="Chart-header-value">{dailyVolume}</div>
        </div>
        <div>
          <div className="ExchangeChart-info-label mb-4 whitespace-nowrap text-[1.25rem]">
            <Trans>Open Interest</Trans>
            {" ("}
            <span className="positive">{longOIPercentage}</span>/<span className="negative">{shortOIPercentage}</span>
            {")"}
          </div>
          <div className="Chart-header-value flex flex-row items-center gap-8">
            <div className="flex flex-row items-center gap-4">{longOIValue}</div>
            <div className="flex flex-row items-center gap-4">{shortOIValue}</div>
          </div>
        </div>
        <div>
          <div className="ExchangeChart-info-label mb-4">
            <Trans>Available Liquidity</Trans>
          </div>
          <div className="Chart-header-value flex flex-row items-center gap-8">
            <div className="flex flex-row items-center gap-4">{liquidityLong}</div>
            <div className="flex flex-row items-center gap-4">{liquidityShort}</div>
          </div>
        </div>
        <div>
          <div className="ExchangeChart-info-label mb-4">
            <TooltipWithPortal disableHandleStyle renderContent={renderNetFeeHeaderTooltipContent}>
              <Trans>Net Rate / 1h</Trans>
            </TooltipWithPortal>
          </div>
          <TooltipWithPortal
            disableHandleStyle
            as="div"
            className="Chart-header-value flex flex-row items-center gap-8"
            position="bottom-end"
            content={<NetRate1hTooltip />}
          >
            <div>{netRateLong}</div>
            <div>{netRateShort}</div>
          </TooltipWithPortal>
        </div>
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
    <div className="Chart-header mb-10 rounded-4">
      <div className="flex items-center justify-start pl-8">
        <ChartTokenSelector selectedToken={selectedTokenOption} oneRowLabels={false} />
      </div>
      <div className="relative flex overflow-hidden">
        <div className="pointer-events-none absolute z-40 flex h-full w-full flex-row justify-between">
          <div
            className={cx("Chart-top-scrollable-fade-left", {
              "!cursor-default": scrollLeft <= 0,
              "opacity-100": scrollLeft > 0,
              "opacity-0": scrollLeft <= 0,
            })}
            style={leftStyles}
            onClick={scrollToLeft}
          >
            {scrollLeft > 0 && <BiChevronLeft className="text-slate-100" size={24} />}
          </div>
          <div
            className={cx("Chart-top-scrollable-fade-right", {
              "!cursor-default": scrollRight <= 0,
              "opacity-100": scrollRight > 0,
              "opacity-0": scrollRight <= 0,
            })}
            style={rightStyles}
            onClick={scrollToRight}
          >
            {scrollRight > 0 && <BiChevronRight className="text-slate-100" size={24} />}
          </div>
        </div>
        <div className="Chart-top-scrollable" ref={scrollableRef}>
          <div className="Chart-price">
            <div className="text-body-medium mb-4">{avgPrice}</div>
            <div className="text-body-small">{dayPriceDelta}</div>
          </div>
          {additionalInfo}
        </div>
      </div>
      <div className="ExchangeChart-info VersionSwitch-wrapper">
        <VersionSwitch />
      </div>
    </div>
  );
}

export function ChartHeader({ isMobile }: { isMobile: boolean }) {
  return isMobile ? <ChartHeaderInfoMobile /> : <ChartHeaderInfoDesktop />;
}
