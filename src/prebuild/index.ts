/**
 * Json files in this directory are prebuild by scripts from the `scripts/prebuild` directory.
 * No need to edit them manually, use `yarn run prebuild` command instead.
 */

import type { Market } from "domain/synthetics/markets/types";

import marketsJson from "./markets.json";
import marketInfoHashedKeysJson from "./marketInfoHashedKeys.json";

type PrebuildMarket = Pick<
  Market,
  "marketTokenAddress" | "indexTokenAddress" | "longTokenAddress" | "shortTokenAddress"
>;

type PrebuildMarketInfo = {
  longPoolAmount: string;
  shortPoolAmount: string;
  positionImpactPoolAmount: string;
  swapImpactPoolAmountLong: string;
  swapImpactPoolAmountShort: string;
  longInterestUsingLongToken: string;
  longInterestUsingShortToken: string;
  shortInterestUsingLongToken: string;
  shortInterestUsingShortToken: string;
  longInterestInTokensUsingLongToken: string;
  longInterestInTokensUsingShortToken: string;
  shortInterestInTokensUsingLongToken: string;
  shortInterestInTokensUsingShortToken: string;
};

const prebuildMarkets: {
  [chainId: number]: {
    [marketToken: string]: PrebuildMarket;
  };
} = marketsJson;

const prebuildMarketInfoHashedKeys: {
  [chainId: number]: {
    [marketToken: string]: PrebuildMarketInfo;
  };
} = marketInfoHashedKeysJson;

export { prebuildMarkets, prebuildMarketInfoHashedKeys };
