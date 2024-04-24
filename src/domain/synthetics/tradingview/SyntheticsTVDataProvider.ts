import { getChainlinkChartPricesFromGraph } from "domain/prices";
import { TVDataProvider } from "domain/tradingview/TVDataProvider";
import { Bar, FromOldToNewArray } from "domain/tradingview/types";
import { sleep } from "lib/sleep";
import { OracleFetcher } from "../tokens/useOracleKeeperFetcher";

export class SyntheticsTVDataProvider extends TVDataProvider {
  candlesTimeout = 5000;
  oracleKeeperFetcher: OracleFetcher;

  constructor(params: { resolutions: { [key: number]: string }; oracleFetcher: OracleFetcher }) {
    super(params);
    this.oracleKeeperFetcher = params.oracleFetcher;
  }

  override async getTokenChartPrice(chainId: number, ticker: string, period: string): Promise<FromOldToNewArray<Bar>> {
    const limit = 5000;

    const bars: FromOldToNewArray<Bar> = await Promise.race([
      this.oracleKeeperFetcher.fetchOracleCandles(ticker, period, limit).then((bars) => bars.reverse()),
      sleep(this.candlesTimeout).then(() => Promise.reject(`Oracle candles timeout`)),
    ])
      .catch((ex) => {
        // eslint-disable-next-line no-console
        console.warn(ex, "Switching to graph chainlink data");
        return Promise.race([
          getChainlinkChartPricesFromGraph(ticker, period),
          sleep(this.candlesTimeout).then(() => Promise.reject(`Chainlink candles timeout`)),
        ]);
      })
      .catch((ex) => {
        // eslint-disable-next-line no-console
        console.warn("Load history candles failed", ex);
        return [];
      });

    return bars;
  }

  override async getLimitBars(
    _chainId: number,
    ticker: string,
    period: string,
    limit: number
  ): Promise<FromOldToNewArray<Bar>> {
    const limitBars = (await this.oracleKeeperFetcher.fetchOracleCandles(ticker, period, limit)).reverse();

    return limitBars;
  }
}
