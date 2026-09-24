import { useGtHistoryDataLegacy } from './useGtHistoryDataLegacy';
import { getGmw331Enabled } from '@/config/featureFlagEnable';
import { useGtHistoryDataPaginated } from './useGtHistoryDataPaginated';

export type { GtHistoryItem } from './useGtHistoryDataPaginated';

export const useGtHistoryData = (
  page: number = 1,
  pageSize: number = 20,
  selectedActionKeys: string[] = []
) => {
  const isGmw331Enabled = getGmw331Enabled();
  const legacy = useGtHistoryDataLegacy(!isGmw331Enabled);
  const paginated = useGtHistoryDataPaginated(
    page,
    pageSize,
    selectedActionKeys,
    isGmw331Enabled
  );

  if (isGmw331Enabled) {
    return paginated;
  }

  return {
    gtHistory: legacy.gtHistory,
    hasMore: false,
    isLoading: legacy.isLoading,
  };
};
