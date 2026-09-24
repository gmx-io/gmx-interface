import { ENOUGH_DAYS_SINCE_LISTING_FOR_APY } from '@/config/markets';
import { addDays, isPast } from 'date-fns';

/**
 * We let the APY to stabilize for a few days before showing it to the user
 */

export function isBaseApyReadyToBeShown(listingDate: Date): boolean {
  const enoughDateForApy = addDays(
    listingDate,
    ENOUGH_DAYS_SINCE_LISTING_FOR_APY
  );

  return isPast(enoughDateForApy);
}
