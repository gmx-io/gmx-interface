import { getChartPricesFromStats } from "../../../../Api";
import { ARBITRUM } from "../../../../Helpers";

const supportedResolutions = { 5: "5m", 15: "15m", 60: "1h", 240: "4h", "1D": "1d" };

const configurationData = {
  supported_resolutions: Object.keys(supportedResolutions),
  supports_marks: false,
  supports_timescale_marks: false,
  supports_time: true,
};

const Datafeed = {
  onReady: (callback) => {
    setTimeout(() => callback(configurationData));
  },
  resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
    const symbolInfo = (symbol) => ({
      name: symbol.symbol,
      description: symbol.baseAsset + " / USD",
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
    return onSymbolResolvedCallback(symbolInfo({ symbol: symbolName, baseAsset: symbolName }));
  },

  getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
    // const { from, to } = periodParams;
    let bars;
    try {
      let prices = await getChartPricesFromStats(ARBITRUM, symbolInfo.ticker, supportedResolutions[resolution]);
      if (prices.length === 0) {
        onHistoryCallback([], { noData: true });
        return;
      }
      bars = prices.map((bar) => {
        return {
          time: bar.time * 1000,
          low: bar.low,
          high: bar.high,
          open: bar.open,
          close: bar.close,
        };
      });
      onHistoryCallback(bars, { noData: false });
    } catch (error) {
      onErrorCallback(error);
    }
  },
  calculateHistoryDepth: (resolution, resolutionBack, intervalBack) => {
    return resolution < 60 ? { resolutionBack: "D", intervalBack: "1" } : undefined;
  },
};

export default Datafeed;
