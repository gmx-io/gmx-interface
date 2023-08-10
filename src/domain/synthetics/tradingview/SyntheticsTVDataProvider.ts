import { TVDataProvider } from "domain/tradingview/TVDataProvider";
import { fetchLastOracleCandles, fetchOracleCandles } from "../tokens/requests";
import { getChainlinkChartPricesFromGraph } from "domain/prices";
import { sleep } from "lib/sleep";
import { Bar } from "domain/tradingview/types";

export class SyntheticsTVDataProvider extends TVDataProvider {
  candlesTimeout = 5000;

  override async getTokenChartPrice(chainId: number, ticker: string, period: string): Promise<Bar[]> {
    return Promise.race([
      fetchOracleCandles(chainId, ticker, period),
      sleep(this.candlesTimeout).then(() => Promise.reject(`Oracle candles timeout`)),
    ])
      .catch((ex) => {
        // eslint-disable-next-line no-console
        console.warn(ex, "Switching to graph chainlink data");
        return Promise.race([
          getChainlinkChartPricesFromGraph(ticker, period) as Promise<Bar[]>,
          sleep(this.candlesTimeout).then(() => Promise.reject(`Chainlink candles timeout`)),
        ]);
      })
      .catch((ex) => {
        // eslint-disable-next-line no-console
        console.warn("Load history candles failed", ex);
        return [] as Bar[];
      });
  }

  override getLimitBars(chainId: number, ticker: string, period: string, limit: number) {
    return fetchLastOracleCandles(chainId, ticker, period, limit);
  }
}
