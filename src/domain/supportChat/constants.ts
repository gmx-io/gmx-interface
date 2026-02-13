import { USD_DECIMALS } from "config/factors";
import { getTimePeriodsInSeconds } from "lib/dates";
import { expandDecimals } from "lib/numbers";

export const INTERCOM_APP_ID = "blsw8a15";

export const SUPPORT_CHAT_MIN_WALLET_PORTFOLIO_USD = expandDecimals(300_000n, USD_DECIMALS);
export const SUPPORT_CHAT_MIN_AGG_30_DAYS_VOLUME = expandDecimals(2_000_000n, USD_DECIMALS);
export const SUPPORT_CHAT_MIN_AGG_ALL_TIME_VOLUME = expandDecimals(30_000_000n, USD_DECIMALS);

export const TIME_PERIODS = getTimePeriodsInSeconds();
