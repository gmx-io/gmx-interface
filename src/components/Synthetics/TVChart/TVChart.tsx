import cx from "classnames";
import { Dropdown, DropdownOption } from "components/Dropdown/Dropdown";
import TVChartContainer from "components/TVChartContainer/TVChartContainer";
import { NATIVE_TOKEN_ADDRESS, isChartAvailabeForToken } from "config/tokens";
import { getCandlesDelta, getMidPrice, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { fetchLastOracleCandles, fetchOracleCandles, fetchOracleRecentPrice } from "domain/synthetics/tokens/prices";
import { useLastCandles } from "domain/synthetics/tokens/useLastCandles";
import { Token } from "domain/tokens";
import { TVRequests } from "domain/tradingview/TVRequests";
import { useChainId } from "lib/chains";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatUsd, numberWithCommas } from "lib/numbers";
import { useEffect, useMemo, useRef, useState } from "react";

import "./TVChart.scss";

export type Props = {};

const DEFAULT_PERIOD = "5m";

export function TVChart() {
  const { chainId } = useChainId();
  const { tokensData } = useAvailableTokensData(chainId);

  const dataProvider = useRef<TVRequests>();
  const [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period"], DEFAULT_PERIOD);
  const [chartTokenAddress, setChartTokenAddress] = useState<string>(NATIVE_TOKEN_ADDRESS);
  const chartToken = getTokenData(tokensData, chartTokenAddress);

  const tokens = Object.values(tokensData);
  const tokenOptions: DropdownOption[] = tokens
    .filter((token) => isChartAvailabeForToken(chainId, token.symbol))
    .map((token) => ({
      label: `${token.symbol} / USD`,
      value: token.address,
    }));
  const selectedTokenOption = tokenOptions.find((option) => option.value === chartTokenAddress);
  const currentAveragePrice = getMidPrice(chartToken?.prices);

  const { candles } = useLastCandles(chainId, chartToken?.symbol, period);

  const period24Hours = 24 * 60 * 60;
  const { high, low, deltaPercentage, deltaPercentageStr } =
    getCandlesDelta(candles, parseFloat(formatAmount(currentAveragePrice, USD_DECIMALS, 2)), period24Hours) || {};

  const chartLines = useMemo(() => {
    const lines = [];
    // if (currentOrders.length > 0) {
    //   lines.push(...currentOrders);
    // }

    // if (currentPositions.length > 0) {
    //   currentPositions.forEach((position) => {
    //     lines.push(position.open);
    //     lines.push(position.liquidation);
    //   });
    // }

    return lines;
  }, []);

  function onSelectTokenOption(option: DropdownOption) {
    setChartTokenAddress(option.value);
  }

  function onSelectChartToken(token: Token) {
    setChartTokenAddress(token.address);
  }

  useEffect(() => {
    dataProvider.current = new TVRequests({
      getCurrentPriceOfToken: fetchOracleRecentPrice,
      getTokenChartPrice: fetchOracleCandles,
      getTokenLastChartPrices: fetchLastOracleCandles,
    });
  }, []);

  useEffect(
    function updatePeriod() {
      if (!period || !(period in CHART_PERIODS)) {
        setPeriod(DEFAULT_PERIOD);
      }
    },
    [period, setPeriod]
  );

  if (!chartToken) {
    return null;
  }

  return (
    <div className="ExchangeChart tv">
      <div className="ExchangeChart-top App-box App-box-border">
        <div className="ExchangeChart-top-inner">
          <div>
            <Dropdown
              className="chart-token-selector"
              options={tokenOptions}
              selectedOption={selectedTokenOption}
              onSelect={onSelectTokenOption}
            />
          </div>
          <div>
            <div className="ExchangeChart-main-price">{formatUsd(chartToken?.prices?.maxPrice) || "..."}</div>
            <div className="ExchangeChart-info-label">{formatUsd(chartToken?.prices?.minPrice) || "..."}</div>
          </div>
          <div>
            <div className="ExchangeChart-info-label">24h Change</div>
            <div
              className={cx({
                positive: deltaPercentage && deltaPercentage > 0,
                negative: deltaPercentage && deltaPercentage < 0,
              })}
            >
              {!deltaPercentageStr && "-"}
              {deltaPercentageStr && deltaPercentageStr}
            </div>
          </div>
          <div className="ExchangeChart-additional-info">
            <div className="ExchangeChart-info-label">24h High</div>
            <div>
              {!high && "-"}
              {high && numberWithCommas(high.toFixed(2))}
            </div>
          </div>
          <div className="ExchangeChart-additional-info">
            <div className="ExchangeChart-info-label">24h Low</div>
            <div>
              {!low && "-"}
              {low && numberWithCommas(low.toFixed(2))}
            </div>
          </div>
        </div>
      </div>
      <div className="ExchangeChart-bottom App-box App-box-border">
        <TVChartContainer
          chartLines={chartLines}
          savedShouldShowPositionLines={false}
          symbol={chartToken.symbol}
          chainId={chainId}
          onSelectToken={onSelectChartToken}
          period={period!}
          setPeriod={setPeriod}
          dataProvider={dataProvider.current}
        />
      </div>
    </div>
  );
}
