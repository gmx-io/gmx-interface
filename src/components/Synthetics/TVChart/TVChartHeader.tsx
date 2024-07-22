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
import { formatRatePercentage, formatUsd, numberWithCommas } from "lib/numbers";
import { useEffect } from "react";

import { ReactComponent as LongIcon } from "img/long.svg";
import { ReactComponent as ShortIcon } from "img/short.svg";

import ChartTokenSelector from "../ChartTokenSelector/ChartTokenSelector";
import { formatAmountHuman } from "pages/SyntheticsStats/SyntheticsStats";

const DEFAULT_PERIOD = "5m";

function TVChartHeaderInfoMobile() {
  return null;
}

function TVChartHeaderInfoDesktop() {
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

  const info = useSelector(selectChartHeaderInfo);

  return (
    <div className="ExchangeChart-info">
      <div className="ExchangeChart-top-inner">
        <ChartTokenSelector selectedToken={selectedTokenOption} options={tokenOptions} />
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

        <div className="ExchangeChart-additional-info">
          <div className="ExchangeChart-info-label">
            <Trans>Net Rate / 1h</Trans>
          </div>
          <div className="flex flex-row items-center gap-8">
            <div className="positive flex flex-row items-center gap-8">
              <LongIcon className="text-green-500" />
              {info?.netRateHourlyLong ? formatRatePercentage(info?.netRateHourlyLong) : "-"}
            </div>
            <div className="negative flex flex-row items-center gap-8">
              <ShortIcon className="text-red-500" />
              {info?.netRateHourlyShort ? formatRatePercentage(info?.netRateHourlyShort) : "-"}
            </div>
          </div>
        </div>

        <div className="ExchangeChart-additional-info">
          <div className="ExchangeChart-info-label">
            <Trans>Open Interest</Trans>
          </div>
          <div className="flex flex-row items-center gap-8">
            <div className="flex flex-row items-center gap-8">
              <LongIcon /> {info?.openInterestLong ? formatUsd(info?.openInterestLong) : "-"}
            </div>
            <div className="flex flex-row items-center gap-8">
              <ShortIcon />
              {info?.openInterestShort ? formatUsd(info?.openInterestShort) : "-"}
            </div>
          </div>
        </div>

        <div className="ExchangeChart-additional-info Chart-24h-low">
          <div className="ExchangeChart-info-label">24h Low</div>
          <div>{dayPriceDelta?.low ? numberWithCommas(dayPriceDelta?.low.toFixed(oraclePriceDecimals)) : "-"}</div>
        </div>
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

  return (
    <div className="ExchangeChart-header">
      {isMobile ? <TVChartHeaderInfoMobile /> : <TVChartHeaderInfoDesktop />}
      <div className="ExchangeChart-info VersionSwitch-wrapper">
        <VersionSwitch />
      </div>
    </div>
  );
}
