import { TVDataProvider } from "domain/tradingview/TVDataProvider";
import { fetchLastOracleCandles, fetchOracleCandles, fetchOracleRecentPrice } from "../tokens/requests";
import { getChainlinkChartPricesFromGraph } from "domain/prices";
import { sleep } from "lib/sleep";
import { Bar } from "domain/tradingview/types";
import { getMidPrice } from "../tokens";
import { BigNumber } from "ethers";

export class SyntheticsTVDataProvider extends TVDataProvider {
  candlesTimeout = 5000;

  override async getCurrentPriceOfToken(chainId: number, ticker: string) {
    return fetchOracleRecentPrice(chainId, ticker)
      .then((prices) => getMidPrice(prices))
      .catch(() => BigNumber.from(0));
  }

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

  override getTokenLastBars(chainId: number, ticker: string, period: string, limit: number) {
    return fetchLastOracleCandles(chainId, ticker, period, limit);
  }
}
