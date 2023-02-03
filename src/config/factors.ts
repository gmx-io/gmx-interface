import { expandDecimals } from "lib/numbers";

export const HIGH_SPREAD_THRESHOLD = expandDecimals(1, 30).div(100); // 1%
