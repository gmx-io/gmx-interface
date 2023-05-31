import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";

export const TRIGGER_PREFIX_ABOVE = ">";
export const TRIGGER_PREFIX_BELOW = "<";

export const TOAST_AUTO_CLOSE_TIME = 7000;
export const LIQUIDATION_PRICE_THRESHOLD = expandDecimals(1000000, USD_DECIMALS); // USD
