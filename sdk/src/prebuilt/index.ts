/**
 * Json files in this directory are prebuild by scripts from the `scripts/prebuild` directory.
 * No need to edit them manually, use `yarn run prebuild` command instead.
 */
import {
  KinkModelMarketRateMulticallRequestConfig,
  MarketConfigMulticallRequestConfig,
  MarketValuesMulticallRequestConfig,
} from "modules/markets/types";
import type { MarketsGraph } from "swap/buildMarketsAdjacencyGraph";
import type { SwapRoutes } from "types/trade";
import hashedKinkModelMarketRatesKeys from "./hashedKinkModelMarketRatesKeys.json";
import hashedMarketConfigKeysJson from "./hashedMarketConfigKeys.json";
import hashedMarketValuesKeysJson from "./hashedMarketValuesKeys.json";
import marketsAdjacencyGraph from "./marketsAdjacencyGraph.json";
import reachableTokens from "./reachableTokens.json";
import swapRoutes from "./swapRoutes.json";

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

type HashedKinkModelMarketRatesConfigKeys = Record<
  keyof KinkModelMarketRateMulticallRequestConfig[`${string}-dataStore`]["calls"],
  string
>;

const HASHED_KINK_MODEL_MARKET_RATES_KEYS: {
  [chainId: number]: {
    [marketToken: string]: HashedKinkModelMarketRatesConfigKeys;
  };
} = hashedKinkModelMarketRatesKeys;

const TOKEN_SWAP_PATHS: {
  [chainId: number]: SwapRoutes;
} = swapRoutes;

const REACHABLE_TOKENS: {
  [chainId: number]: {
    [token: string]: string[];
  };
} = reachableTokens;

const MARKETS_ADJACENCY_GRAPH: {
  [chainId: number]: MarketsGraph;
} = marketsAdjacencyGraph;

export {
  HASHED_KINK_MODEL_MARKET_RATES_KEYS,
  HASHED_MARKET_CONFIG_KEYS,
  HASHED_MARKET_VALUES_KEYS,
  MARKETS_ADJACENCY_GRAPH,
  REACHABLE_TOKENS,
  TOKEN_SWAP_PATHS,
};
