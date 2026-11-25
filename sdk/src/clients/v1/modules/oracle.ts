import fetch from "cross-fetch";
import { getAddress } from "viem";

import type { GmxSdk } from "clients/v1";
import { buildUrl } from "utils/buildUrl";
import { HttpClient } from "utils/http/http";
import { MarketSdkConfig } from "utils/markets/types";

const MARKET_STATE_TIMEOUT_MS = 1_500;

export type TickersResponse = {
  /** Contract price format: USD * 10^(30 - token decimals) */
  minPrice: string;
  /** Contract price format: USD * 10^(30 - token decimals) */
  maxPrice: string;
  tokenSymbol: string;
  tokenAddress: string;
  /** Update time in milliseconds */
  updatedAt: number;
  /** Price time in seconds */
  timestamp: number;
}[];

type RawTokenResponse = {
  symbol: string;
  address: string;
  decimals: number;
  synthetic: boolean;
};

export type TokensResponse = (Omit<RawTokenResponse, "synthetic"> & {
  isSynthetic: boolean;
})[];

export class Oracle {
  private url: string;

  constructor(public sdk: GmxSdk) {
    this.url = sdk.config.oracleUrl;
  }

  getMarkets(): Promise<MarketSdkConfig[]> {
    return fetch(buildUrl(this.url!, "/markets"))
      .then((res) => res.json())
      .then((res) => {
        if (!res.markets || !res.markets.length) {
          throw new Error("Invalid markets response");
        }

        return res.markets;
      });
  }

  async getClosedMarketAddresses(): Promise<string[]> {
    try {
      const client = new HttpClient(this.url, MARKET_STATE_TIMEOUT_MS);
      const { markets } = await client.fetchJson<{ markets?: { marketToken: string; isMarketClosed: boolean }[] }>(
        "/markets/state"
      );
      if (!Array.isArray(markets)) return [];

      return markets.filter((market) => market.isMarketClosed).map((market) => getAddress(market.marketToken));
    } catch {
      return [];
    }
  }

  getTokens(): Promise<TokensResponse> {
    return fetch(buildUrl(this.url!, "/tokens"))
      .then((res) => res.json())
      .then((res: { tokens: RawTokenResponse[] }) =>
        res.tokens.map(({ synthetic, ...rest }) => {
          return {
            ...rest,
            isSynthetic: synthetic,
          };
        })
      );
  }

  getTickers(): Promise<TickersResponse> {
    return fetch(buildUrl(this.url!, "/prices/tickers"))
      .then((res) => res.json())
      .then((res) => {
        if (!res.length) {
          throw new Error("Invalid tickers response");
        }

        return res;
      });
  }
}
