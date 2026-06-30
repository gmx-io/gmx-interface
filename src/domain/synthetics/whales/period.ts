export type WhaleWindow = "total" | "90d" | "30d" | "7d";

export const WHALE_WINDOWS: WhaleWindow[] = ["total", "90d", "30d", "7d"];

const WINDOW_DAYS: Record<Exclude<WhaleWindow, "total">, number> = {
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
