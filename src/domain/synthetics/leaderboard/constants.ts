import { t } from "@lingui/macro";
import { expandDecimals } from "lib/numbers";

export const MIN_COLLATERAL_USD_IN_LEADERBOARD = expandDecimals(500, 30);

export const LEADERBOARD_TIMEFRAMES = {
  test: {
    from: 1707955200, // 15 feb 2024
    to: 1709769600, // 7 mar 2024
  },
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
  test4: {
    from: 1704067200, // 1 jan 2024
    to: 1705622400, // 19 jan 2024
  },
  march24abspnl: {
    from: 1709841600, // 8 mar 2024
    to: 1711051200, // 22 mar 2024
  },
  march24relpnl: {
    from: 1709841600, // 8 mar 2024
    to: 1711051200, // 22 mar 2024
  },
  all: {
    from: 0,
    to: undefined,
  },
} as const;

export const LEADERBOARD_PAGES = {
  leaderboard: {
    key: "leaderboard",
    label: t`Global leaderboard`,
    href: "/leaderboard",
    isCompetition: false,
  },
  march24abspnl: {
    key: "march24abspnl",
    label: t`Top PnL $ March '24`,
    href: "/competitions/march24abspnl",
    isCompetition: true,
  },
  march24relpnl: {
    key: "march24relpnl",
    label: t`Top Pnl % March '24`,
    href: "/competitions/march24relpnl",
    isCompetition: true,
  },
  test: {
    key: "test",
    label: "Test March '24",
    href: "/competitions/test",
    isCompetitions: true,
  },
  test2: {
    key: "test2",
    label: "Test Feb '24",
    href: "/competitions/test2",
    isCompetitions: true,
  },
} as const;

export const LEADERBOARD_PAGES_ORDER = ["leaderboard", "march24abspnl", "march24relpnl", "test", "test2"] as const;
