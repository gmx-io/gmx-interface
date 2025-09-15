import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";

export const HIGH_SPREAD_THRESHOLD = expandDecimals(1, USD_DECIMALS) / 100n; // 1%;
export const HIGH_TRADE_VOLUME_FOR_FEEDBACK = expandDecimals(6_000_000, 30); // 2mx
export const HIGH_LIQUIDITY_FOR_FEEDBACK = expandDecimals(1_000_000, USD_DECIMALS); // 1m

export const DAY_OF_THE_WEEK_EPOCH_STARTS_UTC = 3;

export const TIME_SPENT_ON_EARN_PAGE_FOR_INVITATION_TOAST = 10_000; // 10s
