import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEffectOnce } from "react-use";

import { VersionSwitch } from "components/VersionSwitch/VersionSwitch";
import { getToken, isChartAvailabeForToken } from "config/tokens";

import { selectAvailableChartTokens, selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectSelectedMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { selectTradeboxTradeFlags } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { use24hPriceDelta } from "domain/synthetics/tokens/use24PriceDelta";
import { Token } from "domain/tokens";

import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";

import { ReactComponent as LongIcon } from "img/long.svg";
import { ReactComponent as ShortIcon } from "img/short.svg";
import { BiChevronDown, BiChevronRight } from "react-icons/bi";

import ChartTokenSelector from "../ChartTokenSelector/ChartTokenSelector";
import { useChartHeaderFormattedValues } from "./useChartHeaderFormattedValues";

function TVChartHeaderInfoMobile() {
  const chartToken = useSelector(selectChartToken);

  const availableTokens = useSelector(selectAvailableChartTokens);

  const { chainId } = useChainId();
  const chartTokenAddress = chartToken?.address;

  const tokenOptions: Token[] | undefined = availableTokens?.filter((token) =>
    isChartAvailabeForToken(chainId, token.symbol)
  );

  const oraclePriceDecimals = useSelector(selectSelectedMarketPriceDecimals);

  const selectedTokenOption = chartTokenAddress ? getToken(chainId, chartTokenAddress) : undefined;
  const dayPriceDelta = use24hPriceDelta(chainId, chartToken?.symbol);

  const avgPrice = bigMath.avg(chartToken?.prices?.maxPrice, chartToken?.prices?.minPrice);

  const { isSwap } = useSelector(selectTradeboxTradeFlags);

  const [detailsVisible, setDetailsVisible] = useState(false);

  const { liquidityLong, liquidityShort, netRateLong, netRateShort, longOIValue, shortOIValue, dailyVolume } =
    useChartHeaderFormattedValues();

  useEffect(() => {
    if (isSwap) {
      setDetailsVisible(false);
    }
  }, [isSwap]);

  const toggleDetailsVisible = useCallback(() => {
    setDetailsVisible((prev) => !prev);
  }, [setDetailsVisible]);

  return (
    <div className="mb-10">
      <div className="grid grid-cols-[auto_100px]">
        <div>
          <ChartTokenSelector selectedToken={selectedTokenOption} options={tokenOptions} isMobile />

          <div
            className="flex cursor-pointer flex-row gap-8"
            role="button"
            onClick={isSwap ? undefined : toggleDetailsVisible}
          >
            {!isSwap && (
              <span className="inline-flex cursor-pointer items-center justify-center rounded-4 bg-slate-500 p-2">
                {detailsVisible ? <BiChevronDown /> : <BiChevronRight />}
              </span>
            )}
            <div className="ExchangeChart-avg-price">
              {formatUsd(avgPrice, {
                displayDecimals: oraclePriceDecimals,
              }) || "..."}
            </div>
            <div className="ExchangeChart-daily-change">
              <div
                className={cx({
                  positive: dayPriceDelta?.deltaPercentage && dayPriceDelta?.deltaPercentage > 0,
                  negative: dayPriceDelta?.deltaPercentage && dayPriceDelta?.deltaPercentage < 0,
                })}
              >
                {dayPriceDelta?.deltaPercentageStr || "-"}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <VersionSwitch />
        </div>
      </div>
      {detailsVisible && (
        <div className="pt-16">
          <div className="mb-14 flex flex-row items-center justify-start gap-24">
            <div>
              <div className="ExchangeChart-info-label">
                <Trans>Available Liquidity</Trans>
              </div>
              <div className="flex flex-row items-center gap-8">
                <div className="flex flex-row items-center gap-8">
                  <LongIcon />
                  {liquidityLong}
                </div>
                <div className="flex flex-row items-center gap-8">
                  <ShortIcon />
                  {liquidityShort}
                </div>
              </div>
            </div>

            <div>
              <div className="ExchangeChart-info-label">
                <Trans>Net Rate / 1h</Trans>
              </div>
              <div className="flex flex-row items-center gap-8">
                <div className="positive flex flex-row items-center gap-8">
                  <LongIcon className="fill-green-500" />
                  {netRateLong}
                </div>
                <div className="negative flex flex-row items-center gap-8">
                  <ShortIcon className="fill-red-500" />
                  {netRateShort}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center justify-start gap-24">
            <div>
              <div className="ExchangeChart-info-label">
                <Trans>Open Interest</Trans>
              </div>
              <div className="flex flex-row items-center gap-8">
                <div className="flex flex-row items-center gap-8">
                  <LongIcon />
                  {longOIValue}
                </div>
                <div className="flex flex-row items-center gap-8">
                  <ShortIcon />
                  {shortOIValue}
                </div>
              </div>
            </div>

            <div className=" Chart-24h-low">
              <div className="ExchangeChart-info-label">
                <Trans>24h Volume</Trans>
              </div>
              {dailyVolume}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TVChartHeaderInfoDesktop() {
  const chartToken = useSelector(selectChartToken);
  const scrollableRef = useRef<HTMLDivElement | null>(null);

  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollRight, setScrollRight] = useState(0);
  const [maxFadeArea, setMaxFadeArea] = useState(75);

  const availableTokens = useSelector(selectAvailableChartTokens);

  const { chainId } = useChainId();
  const chartTokenAddress = chartToken?.address;

  const tokenOptions: Token[] | undefined = availableTokens?.filter((token) =>
    isChartAvailabeForToken(chainId, token.symbol)
  );

  const oraclePriceDecimals = useSelector(selectSelectedMarketPriceDecimals);

  const selectedTokenOption = chartTokenAddress ? getToken(chainId, chartTokenAddress) : undefined;
  const dayPriceDelta = use24hPriceDelta(chainId, chartToken?.symbol);

  const avgPrice = bigMath.avg(chartToken?.prices?.maxPrice, chartToken?.prices?.minPrice);

  const { isSwap } = useSelector(selectTradeboxTradeFlags);

  const setScrolls = useCallback(() => {
    const scrollable = scrollableRef.current;
    if (!scrollable) {
      return;
    }

    if (scrollable.scrollWidth > scrollable.clientWidth) {
      setScrollLeft(scrollable.scrollLeft);
      setScrollRight(scrollable.scrollWidth - scrollable.clientWidth - scrollable.scrollLeft);
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
      width: `${Math.min(scrollLeft + 8, maxFadeArea)}px`,
    };
  }, [scrollLeft, maxFadeArea]);

  const rightStyles = useMemo(() => {
    return {
      width: `${Math.min(scrollRight + 8, maxFadeArea)}px`,
    };
  }, [scrollRight, maxFadeArea]);

  const { liquidityLong, liquidityShort, netRateLong, netRateShort, longOIValue, shortOIValue, dailyVolume } =
    useChartHeaderFormattedValues();

  const additionalInfo = useMemo(() => {
    if (isSwap) {
      return null;
    }

    return (
      <>
        <div>
          <div className="ExchangeChart-info-label">
            <Trans>Available Liquidity</Trans>
          </div>
          <div className="Chart-header-value flex flex-row items-center gap-8">
            <div className="flex flex-row items-center gap-4">
              <LongIcon />
              {liquidityLong}
            </div>
            <div className="flex flex-row items-center gap-4">
              <ShortIcon />
              {liquidityShort}
            </div>
          </div>
        </div>
        <div>
          <div className="ExchangeChart-info-label">
            <Trans>Net Rate / 1h</Trans>
          </div>
          <div className="Chart-header-value flex flex-row items-center gap-8">
            <div className="positive flex flex-row items-center gap-4">
              <LongIcon className="fill-green-500" />
              {netRateLong}
            </div>
            <div className="negative flex flex-row items-center gap-4">
              <ShortIcon className="fill-red-500" />
              {netRateShort}
            </div>
          </div>
        </div>
        <div>
          <div className="ExchangeChart-info-label">
            <Trans>Open Interest</Trans>
          </div>
          <div className="Chart-header-value flex flex-row items-center gap-8">
            <div className="flex flex-row items-center gap-4">
              <LongIcon />
              {longOIValue}
            </div>
            <div className="flex flex-row items-center gap-4">
              <ShortIcon />
              {shortOIValue}
            </div>
          </div>
        </div>
        <div className="Chart-24h-low">
          <div className="ExchangeChart-info-label">24h Volume</div>
          <div className="Chart-header-value">{dailyVolume}</div>
        </div>
      </>
    );
  }, [liquidityLong, liquidityShort, netRateLong, netRateShort, longOIValue, shortOIValue, dailyVolume, isSwap]);

  return (
    <div className="Chart-header mb-10">
      <div className="flex items-center justify-start">
        <ChartTokenSelector selectedToken={selectedTokenOption} options={tokenOptions} isMobile={false} />
      </div>
      <div className="Chart-top-scrollable-container">
        <div className="Chart-top-scrollable-fade-overlay">
          <div
            className={cx("Chart-top-scrollable-fade-left", {
              "opacity-100": scrollLeft > 0,
              "opacity-0": scrollLeft <= 0,
            })}
            style={leftStyles}
          ></div>
          <div
            className={cx("Chart-top-scrollable-fade-right", {
              "opacity-100": scrollRight > 0,
              "opacity-0": scrollRight <= 0,
            })}
            style={rightStyles}
          ></div>
        </div>
        <div className="Chart-top-scrollable" ref={scrollableRef}>
          <div className="Chart-price">
            <div className="ExchangeChart-avg-price">
              {formatUsd(avgPrice, {
                displayDecimals: oraclePriceDecimals,
              }) || "..."}
            </div>
            <div className="ExchangeChart-daily-change">
              <div
                className={cx({
                  positive: dayPriceDelta?.deltaPercentage && dayPriceDelta?.deltaPercentage > 0,
                  negative: dayPriceDelta?.deltaPercentage && dayPriceDelta?.deltaPercentage < 0,
                })}
              >
                {dayPriceDelta?.deltaPercentageStr || "-"}
              </div>
            </div>
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

export function TVChartHeader({ isMobile }: { isMobile: boolean }) {
  return isMobile ? <TVChartHeaderInfoMobile /> : <TVChartHeaderInfoDesktop />;
}
