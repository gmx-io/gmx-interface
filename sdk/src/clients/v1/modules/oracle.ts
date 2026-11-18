import fetch from "cross-fetch";
import { getAddress } from "viem";

import type { GmxSdk } from "clients/v1";
import { buildUrl } from "utils/buildUrl";
import { MarketSdkConfig } from "utils/markets/types";

export type TickersResponse = {
  minPrice: string;
  maxPrice: string;
  oracleDecimals: number;
  tokenSymbol: string;
  tokenAddress: string;
  updatedAt: number;
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
    const response = await fetch(buildUrl(this.url, "/markets/state"));
    if (!response.ok) {
      throw new Error(`Failed to fetch market state: ${response.status}`);
    }

    const { markets }: { markets: { marketToken: string; isMarketClosed: boolean }[] } = await response.json();
    return markets.filter((market) => market.isMarketClosed).map((market) => getAddress(market.marketToken));
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
