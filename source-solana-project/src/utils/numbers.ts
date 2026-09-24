import { getGmw213Enabled } from '@/config/featureFlagEnable';

const KMB_UPPER = getGmw213Enabled();

export const formatNumber = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}${KMB_UPPER ? 'B' : 'b'}`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}${KMB_UPPER ? 'M' : 'm'}`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}${KMB_UPPER ? 'K' : 'k'}`;
  }
  return value.toFixed(2);
};
