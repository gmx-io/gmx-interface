import { differenceInDays, differenceInHours } from "date-fns";

import { getCurrentEpochStartedTimestamp } from "domain/stats";

export function getFormattedFeesDuration() {
  const epochStartedTimestamp = getCurrentEpochStartedTimestamp();

  const now = new Date();
  const epochStartedDate = new Date(epochStartedTimestamp * 1000);
  const days = differenceInDays(now, epochStartedDate);
  let restHours = differenceInHours(now, epochStartedDate, { roundingMethod: "round" }) - days * 24;
  if (days === 0) {
    restHours = Math.max(restHours, 1);
  }

  const daysStr = days > 0 ? `${days}d` : "";
  const hoursStr = restHours > 0 ? `${restHours}h` : "";
  return [daysStr, hoursStr].filter(Boolean).join(" ");
}
