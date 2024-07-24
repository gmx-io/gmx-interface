import { Trans } from "@lingui/macro";
import cx from "classnames";
import { VersionSwitch } from "components/VersionSwitch/VersionSwitch";
import { getToken, isChartAvailabeForToken } from "config/tokens";
import {
  selectAvailableChartTokens,
  selectChartHeaderInfo,
  selectChartToken,
} from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectSelectedMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { use24hPriceDelta } from "domain/synthetics/tokens/use24PriceDelta";
import { Token } from "domain/tokens";
import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmountHuman, formatPercentageDisplay, formatRatePercentage, formatUsd } from "lib/numbers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEffectOnce } from "react-use";

import { ReactComponent as LongIcon } from "img/long.svg";
import { ReactComponent as ShortIcon } from "img/short.svg";

import { use24hVolume } from "domain/synthetics/tokens/use24Volume";
import { BiChevronDown, BiChevronRight } from "react-icons/bi";

import ChartTokenSelector from "../ChartTokenSelector/ChartTokenSelector";

const DEFAULT_PERIOD = "5m";

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

  const dailyVolume = use24hVolume();

  const info = useSelector(selectChartHeaderInfo);

  const [detailsVisible, setDetailsVisible] = useState(false);

  const toggleDetailsVisible = useCallback(() => {
    setDetailsVisible((prev) => !prev);
  }, [setDetailsVisible]);

  return (
    <div className="Chart-header--mobile">
      <div className="Chart-header--mobile-top">
        <div>
          <ChartTokenSelector selectedToken={selectedTokenOption} options={tokenOptions} />

          <div className="flex cursor-pointer flex-row gap-8" role="button" onClick={toggleDetailsVisible}>
            <span className="inline-flex cursor-pointer items-center justify-center rounded-4 bg-slate-500 p-2">
              {detailsVisible ? <BiChevronDown /> : <BiChevronRight />}
            </span>
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
                  {info?.liquidityLong ? formatAmountHuman(info?.liquidityLong, USD_DECIMALS) : "-"}
                </div>
                <div className="flex flex-row items-center gap-8">
                  <ShortIcon />
                  {info?.liquidityShort ? formatAmountHuman(info?.liquidityShort, USD_DECIMALS) : "-"}
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
                  {info?.netRateHourlyLong ? formatRatePercentage(info?.netRateHourlyLong) : "-"}
                </div>
                <div className="negative flex flex-row items-center gap-8">
                  <ShortIcon className="fill-red-500" />
                  {info?.netRateHourlyShort ? formatRatePercentage(info?.netRateHourlyShort) : "-"}
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
                  <LongIcon /> {info?.openInterestLong ? formatAmountHuman(info?.openInterestLong, USD_DECIMALS) : "-"}
                </div>
                <div className="flex flex-row items-center gap-8">
                  <ShortIcon />
                  {info?.openInterestShort ? formatAmountHuman(info?.openInterestShort, USD_DECIMALS) : "-"}
                </div>
              </div>
            </div>

            <div className=" Chart-24h-low">
              <div className="ExchangeChart-info-label">24h Volume</div>
              {dailyVolume ? formatAmountHuman(dailyVolume, USD_DECIMALS) : "-"}
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

  const dailyVolume = use24hVolume();

  const info = useSelector(selectChartHeaderInfo);

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

  const longOIValue = useMemo(() => {
    if (info?.longOpenInterestPercentage !== undefined && info.openInterestLong !== undefined) {
      return (
        <span className="whitespace-nowrap">
          {formatAmountHuman(info?.openInterestLong, USD_DECIMALS)} (
          {formatPercentageDisplay(info.longOpenInterestPercentage)})
        </span>
      );
    }

    return "-";
  }, [info?.longOpenInterestPercentage, info?.openInterestLong]);

  const shortOIValue = useMemo(() => {
    if (info?.longOpenInterestPercentage !== undefined && info.openInterestShort !== undefined) {
      return (
        <span className="whitespace-nowrap">
          {formatAmountHuman(info?.openInterestShort, USD_DECIMALS)} (
          {formatPercentageDisplay(100 - info.longOpenInterestPercentage)})
        </span>
      );
    }

    return "-";
  }, [info?.longOpenInterestPercentage, info?.openInterestShort]);

  return (
    <div className="Chart-header">
      <div className="flex items-center justify-center">
        <ChartTokenSelector selectedToken={selectedTokenOption} options={tokenOptions} />
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

          <div className="ExchangeChart-additional-info">
            <div className="ExchangeChart-info-label">
              <Trans>Available Liquidity</Trans>
            </div>
            <div className="Chart-header-value flex flex-row items-center gap-8">
              <div className="flex flex-row items-center gap-4">
                <LongIcon />
                {info?.liquidityLong ? formatAmountHuman(info?.liquidityLong, USD_DECIMALS) : "-"}
              </div>
              <div className="flex flex-row items-center gap-4">
                <ShortIcon />
                {info?.liquidityShort ? formatAmountHuman(info?.liquidityShort, USD_DECIMALS) : "-"}
              </div>
            </div>
          </div>

          <div className="ExchangeChart-additional-info">
            <div className="ExchangeChart-info-label">
              <Trans>Net Rate / 1h</Trans>
            </div>
            <div className="Chart-header-value flex flex-row items-center gap-8">
              <div className="positive flex flex-row items-center gap-4">
                <LongIcon className="fill-green-500" />
                {info?.netRateHourlyLong ? formatRatePercentage(info?.netRateHourlyLong) : "-"}
              </div>
              <div className="negative flex flex-row items-center gap-4">
                <ShortIcon className="fill-red-500" />
                {info?.netRateHourlyShort ? formatRatePercentage(info?.netRateHourlyShort) : "-"}
              </div>
            </div>
          </div>

          <div className="ExchangeChart-additional-info">
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

          <div className="ExchangeChart-additional-info Chart-24h-low">
            <div className="ExchangeChart-info-label">24h Volume</div>
            <div className="Chart-header-value">{dailyVolume ? formatAmountHuman(dailyVolume, USD_DECIMALS) : "-"}</div>
          </div>
        </div>
      </div>
      <div className="ExchangeChart-info VersionSwitch-wrapper">
        <VersionSwitch />
      </div>
    </div>
  );
}

export function TVChartHeader({ isMobile }: { isMobile: boolean }) {
  const { chainId } = useChainId();

  let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period-v2"], DEFAULT_PERIOD);

  if (!period || !(period in CHART_PERIODS)) {
    period = DEFAULT_PERIOD;
  }

  useEffect(
    function updatePeriod() {
      if (!period || !(period in CHART_PERIODS)) {
        setPeriod(DEFAULT_PERIOD);
      }
    },
    [period, setPeriod]
  );

  return isMobile ? <TVChartHeaderInfoMobile /> : <TVChartHeaderInfoDesktop />;
}
