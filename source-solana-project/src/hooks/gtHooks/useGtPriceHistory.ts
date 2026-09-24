import { useGtPriceHistoryLegacy } from './useGtPriceHistoryLegacy';
import { getGmw331Enabled } from '@/config/featureFlagEnable';
import { useGtPriceHistoryPaginated } from './useGtPriceHistoryPaginated';

export type { GtPriceDataPoint } from './useGtPriceHistoryPaginated';

export const useGtPriceHistory = (days: number = 0) => {
  const isGmw331Enabled = getGmw331Enabled();
  const legacy = useGtPriceHistoryLegacy(days, !isGmw331Enabled);
  const paginated = useGtPriceHistoryPaginated(days, isGmw331Enabled);

  if (isGmw331Enabled) {
    return paginated;
  }

  return legacy;
};
