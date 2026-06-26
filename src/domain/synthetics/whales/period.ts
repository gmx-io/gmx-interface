export type WhaleWindow = "total" | "30d" | "7d";

export const WHALE_WINDOWS: WhaleWindow[] = ["total", "30d", "7d"];

const WINDOW_DAYS: Record<Exclude<WhaleWindow, "total">, number> = {
  "30d": 30,
  "7d": 7,
};

export function windowToFromTimestamp(window: WhaleWindow, nowSec: number): number | undefined {
  if (window === "total") return undefined;
  return nowSec - WINDOW_DAYS[window] * 86400;
}
