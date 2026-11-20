import fetch from "cross-fetch";

import type { GmxSdk } from "clients/v1";
import { buildUrl } from "utils/buildUrl";
import { MarketSdkConfig } from "utils/markets/types";

export type TickersResponse = {
  /** Contract price format: USD * 10^(30 - token decimals) */
  minPrice: string;
  /** Contract price format: USD * 10^(30 - token decimals) */
  maxPrice: string;
  /** @deprecated The API never sends this field. A later release deletes it. */
  oracleDecimals: number;
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
