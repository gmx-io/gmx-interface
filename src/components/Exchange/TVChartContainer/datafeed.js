import { getServerUrl } from "config/backend";
import { getTokenBySymbol, getTokens, getWrappedToken } from "config/tokens";
import { getChainlinkChartPricesFromGraph, getChartPricesFromStats, getStablePriceData } from "domain/prices";
import { formatAmount } from "lib/numbers";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";

export const supportedResolutions = { 5: "5m", 15: "15m", 60: "1h", 240: "4h", "1D": "1d" };

const configurationData = {
  supported_resolutions: Object.keys(supportedResolutions),
  supports_marks: false,
  supports_timescale_marks: false,
  supports_time: true,
};

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

async function getPriceOfToken(chainId, symbol, period, isStable) {
  const prices = isStable ? getStablePriceData(period) : await getTokenChartPrice(chainId, symbol, period);
  return prices.map((bar) => {
    return {
      time: bar.time * 1000,
      low: bar.low,
      high: bar.high,
      open: bar.open,
      close: bar.close,
    };
  });
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

let prices;
let lastTicker;
async function getLivePriceBar(chainId, ticker, period, isStable) {
  if (!ticker) return;
  if (!lastTicker || lastTicker !== ticker || !prices) {
    lastTicker = ticker;
    prices = await getPriceOfToken(chainId, ticker, period, isStable);
  }
  const timezoneOffset = -new Date().getTimezoneOffset() * 60;
  const periodSeconds = CHART_PERIODS[period];
  const currentCandleTime = (Math.floor(Date.now() / 1000 / periodSeconds) * periodSeconds + timezoneOffset) * 1000;
  const currentPrice = await getCurrentPrice(chainId, ticker);

  const last = prices[prices.length - 1];
  const averagePriceValue = parseFloat(formatAmount(currentPrice, USD_DECIMALS, 4));
  if (currentCandleTime === last.time) {
    return {
      ...last,
      close: averagePriceValue,
      high: Math.max(last.high, averagePriceValue),
      low: Math.max(last.low, averagePriceValue),
      ticker,
    };
  } else {
    return {
      time: currentCandleTime,
      open: last.close,
      close: averagePriceValue,
      high: averagePriceValue,
      low: averagePriceValue,
      ticker,
    };
  }
}
let intervalId;
const Datafeed = {
  onReady: (callback) => {
    setTimeout(() => callback(configurationData));
  },
  resolveSymbol: async (symbolName, onSymbolResolvedCallback) => {
    const symbolInfo = (ticker) => {
      const [symbol, chainId] = ticker.split("_");
      const stableTokens = getTokens(chainId)
        .filter((t) => t.isStable)
        .map((t) => t.symbol);

      return {
        name: symbol,
        description: symbol + " / USD",
        ticker: symbol,
        session: "24x7",
        minmov: 1,
        pricescale: 100, // 	or 100
        timezone: "UTC",
        has_intraday: true,
        has_daily: true,
        currency_code: "USD",
        chainId: Number(chainId),
        isStable: stableTokens.includes(symbol),
      };
    };
    const symbol = await onSymbolResolvedCallback(symbolInfo(symbolName));

    return symbol;
  },

  getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
    const { from, to } = periodParams;
    if (!supportedResolutions[resolution]) {
      return onErrorCallback("[getBars] Invalid resolution");
    }
    const { ticker, chainId, isStable } = symbolInfo;
    const period = supportedResolutions[resolution].toLowerCase();

    const bars = await getPriceOfToken(chainId, ticker, period, isStable, periodParams);
    const filteredBars =
      resolution === "1D" ? bars.filter((bar) => bar.time >= from * 1000 && bar.time < to * 1000) : bars;
    bars.length > 0 ? onHistoryCallback(filteredBars) : onErrorCallback("Something went wrong!");
  },

  subscribeBars: async (symbolInfo, resolution, onRealtimeCallback) => {
    const { chainId, ticker, isStable } = symbolInfo;
    const period = supportedResolutions[resolution].toLowerCase();
    clearInterval(intervalId);

    intervalId = setInterval(function () {
      getLivePriceBar(chainId, ticker, period, isStable).then((bar) => {
        if (lastTicker === bar.ticker) {
          console.log(bar);
          onRealtimeCallback(bar);
        }
      });
    }, 500);
  },
  unsubscribeBars: () => {
    clearInterval(intervalId);
  },
};

export default Datafeed;
