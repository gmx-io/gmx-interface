import { DAY_MS } from "lib/dates";

export function getWeekAgoTimestamp(): number {
  const last7Days = new Date(Date.now() - 7 * DAY_MS);
  return Math.floor(last7Days.getTime() / 1000);
}
