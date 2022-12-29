import { getServerUrl } from "config/backend";
import { getTokenBySymbol, getWrappedToken } from "config/tokens";
import { getChainlinkChartPricesFromGraph, getChartPricesFromStats, getStablePriceData } from "domain/prices";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";

function formatBar(bar) {
  return {
    ...bar,
    time: bar.time * 1000,
  };
}
export const supportedResolutions = { 5: "5m", 15: "15m", 60: "1h", 240: "4h", "1D": "1d" };
export function getKeyByValue(object, value) {
  return Object.keys(object).find((key) => object[key] === value);
}

const timezoneOffset = -new Date().getTimezoneOffset() * 60;

async function getTokenChartPrice(chainId, symbol, period, to, from) {
  let prices;
  try {
    prices = await getChartPricesFromStats(chainId, symbol, period, to, from);
  } catch (ex) {
    // eslint-disable-next-line no-console
    console.warn(ex, "Switching to graph chainlink data");
    try {
      prices = await getChainlinkChartPricesFromGraph(symbol, period);
    } catch (ex2) {
      // eslint-disable-next-line no-console
      console.warn("getChainlinkChartPricesFromGraph failed", ex2);
      prices = [];
    }
  }
  return prices;
}

async function getCurrentPrice(chainId, symbol) {
  const indexPricesUrl = getServerUrl(chainId, "/prices");
  const indexPrices = await fetch(indexPricesUrl).then((res) => res.json());
  let symbolInfo = getTokenBySymbol(chainId, symbol);
  if (symbolInfo.isNative) {
    symbolInfo = getWrappedToken(chainId);
  }
  return indexPrices[symbolInfo.address];
}

async function getLastHistoryBar(ticker, resolution, chainId) {
  const _prices = await getTokenChartPrice(chainId, ticker, resolution);
  return formatBar({ ..._prices[_prices.length - 1], ticker });
}

export async function getHistoryBars({ ticker, resolution, chainId, isStable, to, from }) {
  const period = supportedResolutions[resolution];
  const bars = isStable ? getStablePriceData(period) : await getTokenChartPrice(chainId, ticker, period, to, from);
  return bars.map(formatBar);
}

const getLastBarAfterInterval = (function () {
  let startTime = 0;
  let lastBar, lastTicker;

  return async function main(ticker, period, chainId) {
    const currentTime = Date.now();
    if (currentTime - startTime > 60000 || lastTicker !== ticker) {
      lastBar = await getLastHistoryBar(ticker, period, chainId);
      startTime = currentTime;
      lastTicker = ticker;
    }
    return lastBar;
  };
})();

export async function getLiveBar({ ticker, resolution, chainId, isStable }) {
  if (isStable || !ticker) return;
  const period = supportedResolutions[resolution];
  const periodSeconds = CHART_PERIODS[period];
  const currentCandleTime = (Math.floor(Date.now() / 1000 / periodSeconds) * periodSeconds + timezoneOffset) * 1000;

  let lastBar = await getLastBarAfterInterval(ticker, period, chainId);

  if (!lastBar) return;

  const currentPrice = await getCurrentPrice(chainId, ticker);
  const averagePriceValue = parseFloat(formatAmount(currentPrice, USD_DECIMALS, 4));
  if (lastBar.time && currentCandleTime === lastBar.time && ticker === lastBar.ticker) {
    return {
      ...lastBar,
      close: averagePriceValue,
      high: Math.max(lastBar.high, averagePriceValue),
      low: Math.min(lastBar.low, averagePriceValue),
      ticker,
    };
  } else {
    const newBar = {
      time: currentCandleTime,
      open: lastBar.close,
      close: averagePriceValue,
      high: Math.max(lastBar.close, averagePriceValue),
      low: Math.min(lastBar.close, averagePriceValue),
      ticker,
    };
    lastBar = newBar;
    return newBar;
  }
}
