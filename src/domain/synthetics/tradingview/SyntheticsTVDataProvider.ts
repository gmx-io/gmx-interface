import { getChainlinkChartPricesFromGraph } from "domain/prices";
import { TVDataProvider } from "domain/tradingview/TVDataProvider";
import { Bar } from "domain/tradingview/types";
import { sleep } from "lib/sleep";
import { OracleKeeperFetcher } from "../tokens/useOracleKeeperFetcher";

export class SyntheticsTVDataProvider extends TVDataProvider {
  candlesTimeout = 5000;
  oracleKeeperFetcher: OracleKeeperFetcher;

  constructor(p: { resolutions: { [key: number]: string }; oracleKeeperFetcher: OracleKeeperFetcher }) {
    super(p);
    this.oracleKeeperFetcher = p.oracleKeeperFetcher;
  }

  override async getTokenChartPrice(chainId: number, ticker: string, period: string): Promise<Bar[]> {
    const limit = 5000;

    const bars = await Promise.race([
      this.oracleKeeperFetcher.fetchOracleCandles(ticker, period, limit).then((bars) => bars.reverse()),
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

    return bars;
  }

  override async getLimitBars(chainId: number, ticker: string, period: string, limit: number) {
    return this.oracleKeeperFetcher.fetchOracleCandles(ticker, period, limit);
  }
}
