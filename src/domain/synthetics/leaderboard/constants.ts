import { t } from "@lingui/macro";
import { expandDecimals } from "lib/numbers";
import { LeaderboardPageConfig, LeaderboardPageKey } from "./types";
import { ARBITRUM, AVALANCHE_FUJI } from "config/chains";

export const MIN_COLLATERAL_USD_IN_LEADERBOARD = expandDecimals(500, 30);

export const LEADERBOARD_PAGES_ORDER = [
  "leaderboard",
  "march_8-22_2024",
  "march24fuji",
  "march_13-20_2024",
  "march_20-27_2024",
] as const;

export const LEADERBOARD_PAGES: Record<LeaderboardPageKey, LeaderboardPageConfig> = {
  leaderboard: {
    key: "leaderboard",
    label: t`Global leaderboard`,
    href: "/leaderboard",
    isCompetition: false,
    timeframe: {
      from: 0,
      to: undefined,
    },
  },
  "march_8-22_2024": {
    key: "march_8-22_2024",
    label: t`TEST 8-22 Mar`,
    href: "/competitions/march_8-22_2024",
    isCompetition: true,
    chainId: ARBITRUM,
    enabled: false,
    timeframe: {
      from: 1709856000, // 8 mar 2024
      to: 1711065600, // 22 mar 2024
    },
  },
  march24fuji: {
    key: "march24fuji",
    label: t`Test`,
    href: "/competitions/march24fuji",
    isCompetition: true,
    chainId: AVALANCHE_FUJI,
    enabled: false,
    timeframe: {
      from: 1709856000, // 8 mar 2024
      to: 1711065600, // 22 mar 2024
    },
  },
  "march_13-20_2024": {
    key: "march_13-20_2024",
    label: t`STIP 13-20 Mar`,
    href: "/competitions/march_13-20_2024",
    isCompetition: true,
    chainId: ARBITRUM,
    enabled: true,
    timeframe: {
      from: 1710288000, // 13 mar 2024
      to: 1710892800, // 20 mar 2024
    },
  },
  "march_20-27_2024": {
    key: "march_20-27_2024",
    label: t`STIP 20-27 Mar`,
    href: "/competitions/march_20-27_2024",
    isCompetition: true,
    chainId: ARBITRUM,
    enabled: true,
    timeframe: {
      from: 1710892800, // 20 mar 2024
      to: 1711497600, // 27 mar 2024
    },
  },
};
