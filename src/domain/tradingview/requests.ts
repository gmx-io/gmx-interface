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
import { formatTimeInBar, LAST_BAR_REFRESH_INTERVAL, supportedResolutions } from "./utils";

let lastBar;

const getTokenChartPrice = async (chainId: number, symbol: string, period: string) => {
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
};

async function getCurrentPriceOfToken(chainId: number, symbol: string) {
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

export async function getHistoryBars(
  chainId: number,
  ticker: string,
  resolution: string,
  isStable: boolean,
  countBack: number
) {
  const period = supportedResolutions[resolution];
  try {
    const bars = isStable ? getStablePriceData(period, countBack) : await getTokenChartPrice(chainId, ticker, period);
    return bars.map(formatTimeInBar);
  } catch {
    throw new Error("Failed to get history bars");
  }
}

const getLastBarAfterInterval = (function () {
  let startTime = 0;
  let lastTicker, lastPeriod;

  return async function main(ticker, period, chainId) {
    if (!ticker || !period || !chainId) {
      throw new Error("Invalid input. Ticker, period, and chainId are required parameters.");
    }
    const currentTime = Date.now();
    if (currentTime - startTime > LAST_BAR_REFRESH_INTERVAL || lastTicker !== ticker || lastPeriod !== period) {
      const prices = await getLimitChartPricesFromStats(chainId, ticker, period, 1);
      if (prices?.length) {
        lastBar = formatTimeInBar({ ...prices[prices.length - 1], ticker });
        startTime = currentTime;
        lastTicker = ticker;
        lastPeriod = period;
      }
    }
    return lastBar;
  };
})();

export async function getLiveBar(chainId: number, ticker: string, resolution: string) {
  const period = supportedResolutions[resolution];
  if (!ticker || !period || !chainId) return;

  const periodSeconds = CHART_PERIODS[period];
  // Converts current time to seconds, rounds down to nearest period, adds timezone offset, and converts back to milliseconds
  const currentCandleTime = (Math.floor(Date.now() / 1000 / periodSeconds) * periodSeconds + timezoneOffset) * 1000;
  try {
    lastBar = await getLastBarAfterInterval(ticker, period, chainId);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

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
