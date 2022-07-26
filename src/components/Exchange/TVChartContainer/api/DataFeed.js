import { getChainlinkChartPricesFromGraph, getChartPricesFromStats } from "../../../../Api";
import { ARBITRUM } from "../../../../Helpers";
import historyProvider from "./historyProvider";

const supportedResolutions = { 5: "5m", 15: "15m", 60: "1h", 240: "4h", "1D": "1d" };

const configurationData = {
  supported_resolutions: Object.keys(supportedResolutions),
  supports_marks: false,
  supports_timescale_marks: false,
  supports_time: true,
};

const Datafeed = {
  onReady: (callback) => {
    console.log("[onReady]: Method call");
    setTimeout(() => callback(configurationData));
  },
  resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
    console.log("[resolveSymbol]: Method call", { symbolName });

    // const comps = symbolName.split(":");
    // symbolName = (comps.length > 1 ? comps[1] : symbolName).toUpperCase();

    const symbolInfo = (symbol) => ({
      name: symbol.symbol,
      description: symbol.baseAsset + " / " + "USD",
      ticker: symbol.symbol,
      session: "24x7",
      minmov: 1,
      pricescale: 100, // 	or 100
      timezone: "UTC",
      has_intraday: true,
      has_daily: true,
      has_weekly_and_monthly: true,
      currency_code: "USD",
    });

    // Get symbols
    return onSymbolResolvedCallback(symbolInfo({ symbol: "ETH", baseAsset: "ETH" }));
  },
  getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
    const { from, to, firstDataRequest } = periodParams;
    console.log("[getBars]: Method call", symbolInfo, resolution, from, to);
    let prices;
    try {
      prices = await getChartPricesFromStats(ARBITRUM, symbolInfo.ticker, supportedResolutions[resolution]);
    } catch (ex) {
      console.warn(ex);
      console.warn("Switching to graph chainlink data");
      // try {
      //   prices = await getChainlinkChartPricesFromGraph(symbolInfo.ticker?.toLowerCase(), resolution);
      // } catch (ex2) {
      //   console.warn("getChainlinkChartPricesFromGraph failed");
      //   console.warn(ex2);
      //   return [];
      // }
    }
    if (prices.length > 0) {
      return onHistoryCallback(prices);
    }

    console.log({ prices });
    // const urlParameters = {
    //   e: parsedSymbol.exchange,
    //   fsym: parsedSymbol.fromSymbol,
    //   tsym: parsedSymbol.toSymbol,
    //   toTs: to,
    //   limit: 2000,
    // };
    // const query = Object.keys(urlParameters)
    //   .map((name) => `${name}=${encodeURIComponent(urlParameters[name])}`)
    //   .join("&");
    // try {
    //   const data = await makeApiRequest(`data/histoday?${query}`);
    //   if ((data.Response && data.Response === "Error") || data.Data.length === 0) {
    //     // "noData" should be set if there is no data in the requested period.
    //     onHistoryCallback([], { noData: true });
    //     return;
    //   }
    //   let bars = [];
    //   data.Data.forEach((bar) => {
    //     if (bar.time >= from && bar.time < to) {
    //       bars = [
    //         ...bars,
    //         {
    //           time: bar.time * 1000,
    //           low: bar.low,
    //           high: bar.high,
    //           open: bar.open,
    //           close: bar.close,
    //         },
    //       ];
    //     }
    //   });
    //   console.log(`[getBars]: returned ${bars.length} bar(s)`);
    //   onHistoryCallback(bars, { noData: false });
    // } catch (error) {
    //   console.log("[getBars]: Get error", error);
    //   onErrorCallback(error);
    // }
  },
  subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscribeUID, onResetCacheNeededCallback) => {
    console.log("=====subscribeBars runnning");
  },
  unsubscribeBars: (subscriberUID) => {
    console.log("=====unsubscribeBars running");
  },
  calculateHistoryDepth: (resolution, resolutionBack, intervalBack) => {
    //optional
    console.log("=====calculateHistoryDepth running");
    // while optional, this makes sure we request 24 hours of minute data at a time
    // CryptoCompare's minute data endpoint will throw an error if we request data beyond 7 days in the past, and return no data
    return resolution < 60 ? { resolutionBack: "D", intervalBack: "1" } : undefined;
  },
  getMarks: (symbolInfo, startDate, endDate, onDataCallback, resolution) => {
    //optional
    console.log("=====getMarks running");
  },
  getTimeScaleMarks: (symbolInfo, startDate, endDate, onDataCallback, resolution) => {
    //optional
    console.log("=====getTimeScaleMarks running");
  },
  getServerTime: (cb) => {
    console.log("=====getServerTime running");
  },
};

export default Datafeed;
