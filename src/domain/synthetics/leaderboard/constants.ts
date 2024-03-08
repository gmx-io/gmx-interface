import { t } from "@lingui/macro";
import { expandDecimals } from "lib/numbers";

export const MIN_COLLATERAL_USD_IN_LEADERBOARD = expandDecimals(500, 30);

export const LEADERBOARD_TIMEFRAMES = {
  test1: {
    from: 1707955200, // 15 feb 2024
    to: 1709769600, // 7 mar 2024
  },
  test2: {
    from: 1709769600, // 7 mar 2024
    to: 1710633600, // 17 mar 2024
  },
  march24: {
    from: 1709856000, // 8 mar 2024
    to: 1711065600, // 22 mar 2024
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
  march24: {
    key: "march24",
    label: t`March '24`,
    href: "/competitions/march24",
    isCompetition: true,
  },
  test1: {
    key: "test1",
    label: "Test Feb '24",
    href: "/competitions/test1",
    isCompetitions: true,
  },
  test2: {
    key: "test2",
    label: "Test March '24",
    href: "/competitions/test2",
    isCompetitions: true,
  },
} as const;

export const LEADERBOARD_PAGES_ORDER = ["leaderboard", "test2", "march24", "test1"] as const;
