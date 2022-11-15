import { getServerUrl } from "config/backend";
import { getTokenBySymbol, getWrappedToken } from "config/tokens";
import { fillGaps, getChainlinkChartPricesFromGraph, getChartPricesFromStats, getStablePriceData } from "domain/prices";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { supportedResolutions } from "./datafeed";

function formatBar(bar) {
  return {
    ...bar,
    time: bar.time * 1000,
  };
}

let lastTicker;
let lastBar;
const timezoneOffset = -new Date().getTimezoneOffset() * 60;

async function getTokenChartPrice(chainId, symbol, period) {
  let prices;
  try {
    prices = await getChartPricesFromStats(chainId, symbol, period);
  } catch (ex) {
    console.warn(ex);
    console.warn("Switching to graph chainlink data");
    try {
      prices = await getChainlinkChartPricesFromGraph(symbol, period);
    } catch (ex2) {
      console.warn("getChainlinkChartPricesFromGraph failed");
      console.warn(ex2);
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
  return formatBar(_prices[_prices.length - 1]);
}

async function getFilledPrice(chainId, ticker, period, isStable) {
  const _prices = isStable ? getStablePriceData(period) : await getTokenChartPrice(chainId, ticker, period);
  const last = _prices[_prices.length - 1];
  const periodSeconds = CHART_PERIODS[period];
  const currentCandleTime = Math.floor(Date.now() / 1000 / periodSeconds) * periodSeconds + timezoneOffset;

  if (currentCandleTime !== last.time && !isStable) {
    const currentPrice = await getCurrentPrice(chainId, ticker);
    const formattedCurrentPrice = parseFloat(formatAmount(currentPrice, USD_DECIMALS, 4));
    _prices.push({
      ...last,
      close: formattedCurrentPrice,
      high: Math.max(last.high, formattedCurrentPrice),
      low: Math.min(last.low, formattedCurrentPrice),
      time: currentCandleTime,
      open: last.close,
      ticker,
    });
  }
  return fillGaps(_prices, periodSeconds);
}

export async function getHistoryBars({ ticker, resolution, firstDataRequest, chainId, isStable }) {
  const period = supportedResolutions[resolution];
  if (firstDataRequest) {
  }
  const bars = await getFilledPrice(chainId, ticker, period, isStable);

  return bars.map(formatBar);
}
export async function getLiveBar({ ticker, resolution, chainId, isStable }) {
  if (isStable || !ticker) return;
  const period = supportedResolutions[resolution];
  const periodSeconds = CHART_PERIODS[period];
  const currentCandleTime = (Math.floor(Date.now() / 1000 / periodSeconds) * periodSeconds + timezoneOffset) * 1000;
  if (!lastBar || lastTicker !== ticker) {
    lastTicker = ticker;
    lastBar = await getLastHistoryBar(ticker, period, chainId);
  }

  const currentPrice = await getCurrentPrice(chainId, ticker);
  const averagePriceValue = parseFloat(formatAmount(currentPrice, USD_DECIMALS, 4));
  let finalBar;
  if (lastBar.time && currentCandleTime === lastBar.time) {
    finalBar = {
      ...lastBar,
      time: lastBar.time,
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
      high: averagePriceValue,
      low: averagePriceValue,
      ticker,
    };
    lastBar = newBar;
    finalBar = newBar;
  }
  return finalBar.ticker === lastTicker && finalBar;
}
