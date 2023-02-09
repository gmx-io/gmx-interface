import React, { useEffect, useState, useRef, useMemo } from "react";
import cx from "classnames";

import { USD_DECIMALS, SWAP, INCREASE, CHART_PERIODS, getLiquidationPrice } from "lib/legacy";
import { useChartPrices } from "domain/legacy";

import ChartTokenSelector from "./ChartTokenSelector";
import { getTokenInfo } from "domain/tokens/utils";
import { formatAmount, numberWithCommas } from "lib/numbers";
import { getToken, getTokens } from "config/tokens";
import TVChartContainer from "components/TVChartContainer/TVChartContainer";
import { t } from "@lingui/macro";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { availableNetworksForChart } from "components/TVChartContainer/constants";

const PRICE_LINE_TEXT_WIDTH = 15;

export function getChartToken(swapOption, fromToken, toToken, chainId) {
  if (!fromToken || !toToken) {
    return;
  }

  if (swapOption !== SWAP) {
    return toToken;
  }

  if (fromToken.isUsdg && toToken.isUsdg) {
    return getTokens(chainId).find((t) => t.isStable);
  }
  if (fromToken.isUsdg) {
    return toToken;
  }
  if (toToken.isUsdg) {
    return fromToken;
  }

  if (fromToken.isStable && toToken.isStable) {
    return toToken;
  }
  if (fromToken.isStable) {
    return toToken;
  }
  if (toToken.isStable) {
    return fromToken;
  }

  return toToken;
}

const DEFAULT_PERIOD = "4h";

export default function ExchangeTVChart(props) {
  const {
    swapOption,
    fromTokenAddress,
    toTokenAddress,
    infoTokens,
    chainId,
    positions,
    savedShouldShowPositionLines,
    orders,
    setToTokenAddress,
  } = props;
  const [currentSeries] = useState();

  let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period"], DEFAULT_PERIOD);
  if (!(period in CHART_PERIODS)) {
    period = DEFAULT_PERIOD;
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress);
  const toToken = getTokenInfo(infoTokens, toTokenAddress);

  const [chartToken, setChartToken] = useState({
    maxPrice: null,
    minPrice: null,
  });
  useEffect(() => {
    const tmp = getChartToken(swapOption, fromToken, toToken, chainId);
    setChartToken(tmp);
  }, [swapOption, fromToken, toToken, chainId]);

  const currentOrders = useMemo(() => {
    if (!chartToken) {
      return [];
    }

    return orders
      .filter((order) => {
        if (order.type === SWAP) {
          // we can't show non-stable to non-stable swap orders with existing charts
          // so to avoid users confusion we'll show only long/short orders
          return false;
        }

        const indexToken = getToken(chainId, order.indexToken);
        return order.indexToken === chartToken.address || (chartToken.isNative && indexToken.isWrapped);
      })
      .map((order) => {
        const indexToken = getToken(chainId, order.indexToken);
        const longOrShortText = order.isLong ? t`Long` : t`Short`;
        const orderTypeText = order.type === INCREASE ? t`Inc.` : t`Dec.`;
        let tokenSymbol;
        if (indexToken && indexToken.symbol) {
          tokenSymbol = indexToken.isWrapped ? indexToken.baseSymbol : indexToken.symbol;
        }
        const title = `${orderTypeText} ${tokenSymbol} ${longOrShortText}`;
        return { title, price: parseFloat(formatAmount(order.triggerPrice, USD_DECIMALS, 2)) };
      });
  }, [orders, chartToken, chainId]);

  const currentPositions = useMemo(() => {
    if (!positions || !chartToken) {
      return [];
    }
    return positions
      .filter((p) => p.indexToken.address === chartToken.address)
      .map((position) => {
        const longOrShortText = position.isLong ? t`Long` : t`Short`;
        return {
          open: {
            price: parseFloat(formatAmount(position.averagePrice, USD_DECIMALS, 2)),
            title: t`Open ${position.indexToken.symbol} ${longOrShortText}`,
          },
          liquidation: {
            price: parseFloat(formatAmount(getLiquidationPrice(position), USD_DECIMALS, 2)),
            title: t`Liq. ${position.indexToken.symbol} ${longOrShortText}`,
          },
        };
      });
  }, [chartToken, positions]);

  const chartLines = useMemo(() => {
    const lines = [];
    if (currentOrders.length > 0) {
      lines.push(...currentOrders);
    }

    if (currentPositions.length > 0) {
      currentPositions.forEach((position) => {
        lines.push(position.open);
        lines.push(position.liquidation);
      });
    }

    return lines;
  }, [currentOrders, currentPositions]);

  const ref = useRef(null);

  const currentAveragePrice =
    chartToken.maxPrice && chartToken.minPrice ? chartToken.maxPrice.add(chartToken.minPrice).div(2) : null;
  const [priceData, updatePriceData] = useChartPrices(
    chainId,
    chartToken.symbol,
    chartToken.isStable,
    period,
    currentAveragePrice
  );

  useEffect(() => {
    const interval = setInterval(() => {
      updatePriceData(undefined, true);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [updatePriceData]);

  useEffect(() => {
    const lines = [];
    if (currentSeries && savedShouldShowPositionLines) {
      if (currentOrders && currentOrders.length > 0) {
        currentOrders.forEach((order) => {
          const indexToken = getToken(chainId, order.indexToken);
          let tokenSymbol;
          if (indexToken && indexToken.symbol) {
            tokenSymbol = indexToken.isWrapped ? indexToken.baseSymbol : indexToken.symbol;
          }
          const title = `${order.type === INCREASE ? "Inc." : "Dec."} ${tokenSymbol} ${
            order.isLong ? "Long" : "Short"
          }`;
          const color = "#3a3e5e";
          lines.push(
            currentSeries.createPriceLine({
              price: parseFloat(formatAmount(order.triggerPrice, USD_DECIMALS, 2)),
              color,
              title: title.padEnd(PRICE_LINE_TEXT_WIDTH, " "),
            })
          );
        });
      }
      if (currentPositions && currentPositions.length > 0) {
        const color = "#3a3e5e";

        positions.forEach((position) => {
          lines.push(
            currentSeries.createPriceLine({
              price: parseFloat(formatAmount(position.averagePrice, USD_DECIMALS, 2)),
              color,
              title: `Open ${position.indexToken.symbol} ${position.isLong ? "Long" : "Short"}`.padEnd(
                PRICE_LINE_TEXT_WIDTH,
                " "
              ),
            })
          );

          const liquidationPrice = getLiquidationPrice(position);
          lines.push(
            currentSeries.createPriceLine({
              price: parseFloat(formatAmount(liquidationPrice, USD_DECIMALS, 2)),
              color,
              title: `Liq. ${position.indexToken.symbol} ${position.isLong ? "Long" : "Short"}`.padEnd(
                PRICE_LINE_TEXT_WIDTH,
                " "
              ),
            })
          );
        });
      }
    }
    return () => {
      lines.forEach((line) => currentSeries.removePriceLine(line));
    };
  }, [currentOrders, currentSeries, chainId, savedShouldShowPositionLines, currentPositions, positions]);

  let high;
  let low;
  let deltaPrice;
  let delta;
  let deltaPercentage;
  let deltaPercentageStr;

  const now = parseInt(Date.now() / 1000);
  const timeThreshold = now - 24 * 60 * 60;

  if (priceData) {
    for (let i = priceData.length - 1; i > 0; i--) {
      const price = priceData[i];
      if (price.time < timeThreshold) {
        break;
      }
      if (!low) {
        low = price.low;
      }
      if (!high) {
        high = price.high;
      }

      if (price.high > high) {
        high = price.high;
      }
      if (price.low < low) {
        low = price.low;
      }

      deltaPrice = price.open;
    }
  }

  if (deltaPrice && currentAveragePrice) {
    const average = parseFloat(formatAmount(currentAveragePrice, USD_DECIMALS, 2));
    delta = average - deltaPrice;
    deltaPercentage = (delta * 100) / average;
    if (deltaPercentage > 0) {
      deltaPercentageStr = `+${deltaPercentage.toFixed(2)}%`;
    } else {
      deltaPercentageStr = `${deltaPercentage.toFixed(2)}%`;
    }
    if (deltaPercentage === 0) {
      deltaPercentageStr = "0.00";
    }
  }

  if (!chartToken) {
    return null;
  }

  const onSelectToken = (token) => {
    const tmp = getTokenInfo(infoTokens, token.address);
    setChartToken(tmp);
    setToTokenAddress(swapOption, token.address);
  };

  return (
    <div className="ExchangeChart tv" ref={ref}>
      <div className="ExchangeChart-top App-box App-box-border">
        <div className="ExchangeChart-top-inner">
          <div>
            <div className="ExchangeChart-title">
              <ChartTokenSelector
                chainId={chainId}
                selectedToken={chartToken}
                swapOption={swapOption}
                infoTokens={infoTokens}
                onSelectToken={onSelectToken}
                className="chart-token-selector"
              />
            </div>
          </div>
          <div>
            <div className="ExchangeChart-main-price">
              {chartToken.maxPrice && formatAmount(chartToken.maxPrice, USD_DECIMALS, 2, true)}
            </div>
            <div className="ExchangeChart-info-label">
              ${chartToken.minPrice && formatAmount(chartToken.minPrice, USD_DECIMALS, 2, true)}
            </div>
          </div>
          <div>
            <div className="ExchangeChart-info-label">24h Change</div>
            <div className={cx({ positive: deltaPercentage > 0, negative: deltaPercentage < 0 })}>
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
        {availableNetworksForChart.includes(chainId) && chartToken.symbol && chainId ? (
          <TVChartContainer
            chartLines={chartLines}
            savedShouldShowPositionLines={savedShouldShowPositionLines}
            symbol={chartToken.symbol}
            chainId={chainId}
            onSelectToken={onSelectToken}
            period={period}
            setPeriod={setPeriod}
          />
        ) : (
          <p className="ExchangeChart-error">Sorry, chart is not supported on this network yet.</p>
        )}
      </div>
    </div>
  );
}
