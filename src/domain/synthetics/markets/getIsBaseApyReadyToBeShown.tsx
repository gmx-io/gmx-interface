import { addDays, isPast } from "date-fns";

import { ENOUGH_DAYS_SINCE_LISTING_FOR_APY } from "config/markets";

/**
 * We let the APY to stabilize for a few days before showing it to the user
 */
export function getIsBaseApyReadyToBeShown(listingDate: Date): boolean {
  const enoughDateForApy = addDays(listingDate, ENOUGH_DAYS_SINCE_LISTING_FOR_APY);

  return isPast(enoughDateForApy);
}
