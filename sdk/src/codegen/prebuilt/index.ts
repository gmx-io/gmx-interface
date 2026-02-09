/**
 * Json files in this directory are prebuild by scripts from the `scripts/prebuild` directory.
 * No need to edit them manually, use `yarn run prebuild` command instead.
 */
import hashedKinkModelMarketRatesKeys from "./hashedKinkModelMarketRatesKeys.json";
import hashedMarketConfigKeysJson from "./hashedMarketConfigKeys.json";
import hashedMarketValuesKeysJson from "./hashedMarketValuesKeys.json";

export const HASHED_MARKET_VALUES_KEYS = hashedMarketValuesKeysJson;
export const HASHED_MARKET_CONFIG_KEYS = hashedMarketConfigKeysJson;
export const HASHED_KINK_MODEL_MARKET_RATES_KEYS = hashedKinkModelMarketRatesKeys;
