import fetch from "cross-fetch";

import type { GmxSdk } from "../index";
import { buildUrl } from "utils/buildUrl";

export type TickersResponse = {
  minPrice: string;
  maxPrice: string;
  oracleDecimals: number;
  tokenSymbol: string;
  tokenAddress: string;
  updatedAt: number;
}[];

export type TokensResponse = {
  symbol: string;
  address: string;
  decimals: number;
  synthetic: boolean;
}[];

export type ApiMarket = {
  marketToken: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
  isListed: boolean;
};
export type MarketsResponse = ApiMarket[];

export class Oracle {
  private url: string;

  constructor(public sdk: GmxSdk) {
    this.url = sdk.config.oracleUrl;
  }

  getMarkets(): Promise<MarketsResponse> {
    return fetch(buildUrl(this.url!, "/markets"))
      .then((res) => res.json())
      .then((res) => {
        if (!res.markets || !res.markets.length) {
          throw new Error("Invalid markets response");
        }

        return res;
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      });
  }

  getTokens(): Promise<TokensResponse> {
    return fetch(buildUrl(this.url!, "/tokens"))
      .then((res) => res.json())
      .then((res) =>
        res.tokens.map(({ synthetic, ...rest }) => {
          return {
            ...rest,
            isSynthetic: synthetic,
          };
        })
      )
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      });
  }

  getTickers(): Promise<TickersResponse> {
    return fetch(buildUrl(this.url!, "/prices/tickers"))
      .then((res) => res.json())
      .then((res) => {
        if (!res.length) {
          throw new Error("Invalid tickers response");
        }

        return res;
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      });
  }
}
