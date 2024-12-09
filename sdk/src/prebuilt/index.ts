/**
 * Json files in this directory are prebuild by scripts from the `scripts/prebuild` directory.
 * No need to edit them manually, use `yarn run prebuild` command instead.
 */
import hashedMarketValuesKeysJson from "./hashedMarketValuesKeys.json";
import hashedMarketConfigKeysJson from "./hashedMarketConfigKeys.json";
import { MarketConfigMulticallRequestConfig, MarketValuesMulticallRequestConfig } from "modules/markets/types";

type HashedMarketValuesKeys = Omit<
  Record<keyof MarketValuesMulticallRequestConfig[`${string}-dataStore`]["calls"], string>,
  "claimableFundingAmountLong" | "claimableFundingAmountShort"
>;

const HASHED_MARKET_VALUES_KEYS: {
  [chainId: number]: {
    [marketToken: string]: HashedMarketValuesKeys;
  };
} = hashedMarketValuesKeysJson;

type HashedMarketConfigKeys = Record<keyof MarketConfigMulticallRequestConfig[`${string}-dataStore`]["calls"], string>;

const HASHED_MARKET_CONFIG_KEYS: {
  [chainId: number]: {
    [marketToken: string]: HashedMarketConfigKeys;
  };
} = hashedMarketConfigKeysJson;

export { HASHED_MARKET_VALUES_KEYS, HASHED_MARKET_CONFIG_KEYS };
