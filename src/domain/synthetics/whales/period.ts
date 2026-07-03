export type WhaleWindow = "total" | "1y" | "180d" | "90d" | "30d" | "7d";

export const WHALE_WINDOWS: WhaleWindow[] = ["total", "1y", "180d", "90d", "30d", "7d"];

// The whale leaderboard's `periodAccountStats` source only supports all-time or
// windows shorter than 90 days, so it offers this reduced set.
export const LEADERBOARD_WINDOWS: WhaleWindow[] = ["total", "30d", "7d"];

// Windows that scan a lot of history (>= 90 days, incl. all-time) and are slow to load.
export const LONG_WHALE_WINDOWS: WhaleWindow[] = ["total", "1y", "180d", "90d"];

export function isLongWhaleWindow(window: WhaleWindow): boolean {
  return LONG_WHALE_WINDOWS.includes(window);
}

const WINDOW_DAYS: Record<Exclude<WhaleWindow, "total">, number> = {
  "1y": 365,
  "180d": 180,
  "90d": 90,
  "30d": 30,
  "7d": 7,
};

export function windowToFromTimestamp(window: WhaleWindow, nowSec: number): number | undefined {
  if (window === "total") return undefined;
  const from = nowSec - WINDOW_DAYS[window] * 86400;
  // periodAccountStats requires `from` aligned to 00:00:00 UTC (whole days).
  return from - (from % 86400);
}
