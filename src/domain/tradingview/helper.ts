import { getServerUrl } from "config/backend";
import { getTokenBySymbol, getWrappedToken } from "config/tokens";
import {
  getChainlinkChartPricesFromGraph,
  getChartPricesFromStats,
  getLimitChartPricesFromStats,
  getStablePriceData,
  timezoneOffset,
} from "domain/prices";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";

export const supportedResolutions = { 5: "5m", 15: "15m", 60: "1h", 240: "4h", "1D": "1d" };
const LAST_BAR_REFRESH_INTERVAL = 15000; // 15 seconds

export function getPeriodFromResolutions(value, object = supportedResolutions) {
  return Object.keys(object).find((key) => object[key] === value);
}

function formatTimeInBar(bar) {
  return {
    ...bar,
    time: bar.time * 1000,
  };
}

async function getTokenChartPrice(chainId, symbol, period) {
  let prices;
  try {
    prices = await getChartPricesFromStats(chainId, symbol, period);
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

async function getCurrentPriceOfToken(chainId, symbol) {
  try {
    const indexPricesUrl = getServerUrl(chainId, "/prices");
    const response = await fetch(indexPricesUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const indexPrices = await response.json();
    let symbolInfo = getTokenBySymbol(chainId, symbol);
    if (symbolInfo.isNative) {
      symbolInfo = getWrappedToken(chainId);
    }
    return indexPrices[symbolInfo.address];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

export async function getHistoryBars({ ticker, resolution, chainId, isStable, countBack }) {
  const period = supportedResolutions[resolution];
  const bars = isStable ? getStablePriceData(period, countBack) : await getTokenChartPrice(chainId, ticker, period);
  return bars.map(formatTimeInBar);
}

const getLastBarAfterInterval = (function () {
  let startTime = 0;
  let lastBar, lastTicker, lastPeriod;

  return async function main(ticker, period, chainId) {
    const currentTime = Date.now();
    if (currentTime - startTime > LAST_BAR_REFRESH_INTERVAL || lastTicker !== ticker || lastPeriod !== period) {
      const prices = await getLimitChartPricesFromStats(chainId, ticker, period, 1);
      lastBar = formatTimeInBar({ ...prices[prices.length - 1], ticker });
      startTime = currentTime;
      lastTicker = ticker;
      lastPeriod = period;
    }
    return lastBar;
  };
})();

export async function getLiveBar({ ticker, resolution, chainId }) {
  const period = supportedResolutions[resolution];
  if (!ticker || !period || !chainId) return;

  const periodSeconds = CHART_PERIODS[period];
  const currentCandleTime = (Math.floor(Date.now() / 1000 / periodSeconds) * periodSeconds + timezoneOffset) * 1000;

  let lastBar = await getLastBarAfterInterval(ticker, period, chainId);

  if (!lastBar) return;

  const currentPrice = await getCurrentPriceOfToken(chainId, ticker);
  const averagePriceValue = parseFloat(formatAmount(currentPrice, USD_DECIMALS, 4));
  if (lastBar.time && currentCandleTime === lastBar.time && ticker === lastBar.ticker) {
    return {
      ...lastBar,
      close: averagePriceValue,
      high: Math.max(lastBar.open, lastBar.high, averagePriceValue),
      low: Math.min(lastBar.open, lastBar.low, averagePriceValue),
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
