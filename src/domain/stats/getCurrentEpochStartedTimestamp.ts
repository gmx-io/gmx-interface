import { DAY_OF_THE_WEEK_EPOCH_STARTS_UTC } from "config/constants";

export function getCurrentEpochStartedTimestamp(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysSinceWednesday = (dayOfWeek + (7 - DAY_OF_THE_WEEK_EPOCH_STARTS_UTC)) % 7;

  const lastWednesday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceWednesday, 0, 0, 0)
  );

  return Math.floor(lastWednesday.getTime() / 1000);
}
