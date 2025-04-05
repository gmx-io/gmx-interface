import { getIsFlagEnabled } from "config/ab";

export type { MulticallProviderUrls } from "./disabled";
export { MAX_TIMEOUT } from "./disabled";

import { Multicall as MulticallDisabled } from "./disabled";
import { Multicall as MulticallEnabled } from "./enabled";

export const Multicall = getIsFlagEnabled("testMultichain") ? MulticallEnabled : MulticallDisabled;
