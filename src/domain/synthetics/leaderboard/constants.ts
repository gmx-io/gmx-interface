import { t } from "@lingui/macro";
import { expandDecimals } from "lib/numbers";
import { LeaderboardPageConfig, LeaderboardPageKey, LeaderboardTimeframe } from "./types";
import { ARBITRUM, AVALANCHE_FUJI } from "config/chains";

export const MIN_COLLATERAL_USD_IN_LEADERBOARD = expandDecimals(500, 30);

export const LEADERBOARD_PAGES_ORDER = ["leaderboard", "march24arbitrum", "march24fuji"] as const;

export const LEADERBOARD_TIMEFRAMES: Record<typeof LEADERBOARD_PAGES_ORDER[number], LeaderboardTimeframe> = {
  march24arbitrum: {
    from: 1709856000, // 8 mar 2024
    to: 1711065600, // 22 mar 2024
  },
  march24fuji: {
    from: 1709856000, // 8 mar 2024
    to: 1711065600, // 22 mar 2024
  },
  leaderboard: {
    from: 0,
    to: undefined,
  },
} as const;

export const LEADERBOARD_PAGES: Record<LeaderboardPageKey, LeaderboardPageConfig> = {
  leaderboard: {
    key: "leaderboard",
    label: t`Global leaderboard`,
    href: "/leaderboard",
    isCompetition: false,
  },
  march24arbitrum: {
    key: "march24arbitrum",
    label: t`March '24`,
    href: "/competitions/march24arbitrum",
    isCompetition: true,
    chainId: ARBITRUM,
  },
  march24fuji: {
    key: "march24fuji",
    label: t`March '24`,
    href: "/competitions/march24fuji",
    isCompetition: true,
    chainId: AVALANCHE_FUJI,
  },
};
