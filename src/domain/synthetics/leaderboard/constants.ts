import { expandDecimals } from "lib/numbers";

export const MIN_COLLATERAL_USD_IN_LEADERBOARD = expandDecimals(500, 30);

export const COMPETITIONS_TIMEFRAMES_SECS = {
  test1: {
    from: 1706745600, // 1 feb 2024
    to: 1707955200, // 15 feb 2024
  },
  test2: {
    from: 1707868800, // 14 feb 2024
    to: 1708041600, // 16 feb 2024
  },
  test3: {
    from: 1707955200, // 15 feb 2024
    to: 1709769600, // 7 mar 2024
  },
} as const;
