import { ARBITRUM } from "config/chains";
import { expandDecimals } from "lib/numbers";
import { LeaderboardPageConfig, LeaderboardPageKey } from "./types";

export const MIN_COLLATERAL_USD_IN_LEADERBOARD = expandDecimals(500, 30);

export const LEADERBOARD_PAGES_ORDER = ["leaderboard", "march_13-20_2024", "march_20-27_2024"] as const;

export const LEADERBOARD_PAGES: Record<LeaderboardPageKey, LeaderboardPageConfig> = {
  leaderboard: {
    key: "leaderboard",
    href: "/leaderboard",
    isCompetition: false,
    timeframe: {
      from: 0,
      to: undefined,
    },
  },
  "march_13-20_2024": {
    key: "march_13-20_2024",
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
