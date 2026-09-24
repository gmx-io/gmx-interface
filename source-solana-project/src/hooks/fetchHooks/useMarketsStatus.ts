import { getGmw379Enabled } from '@/config/featureFlagEnable';
import { useMarketsStatus as useMarketsStatusNew } from './useMarketsStatusNew';
import { useMarketsStatus as useMarketsStatusOld } from './useMarketsStatusOld';

export const useMarketsStatus = getGmw379Enabled()
  ? useMarketsStatusNew
  : useMarketsStatusOld;
