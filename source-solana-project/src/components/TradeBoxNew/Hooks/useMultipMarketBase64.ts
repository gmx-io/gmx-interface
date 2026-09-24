import { getGmw379Enabled } from '@/config/featureFlagEnable';
import { useMultipMarketBase64 as useMultipMarketBase64New } from './useMultipMarketBase64New';
import { useMultipMarketBase64 as useMultipMarketBase64Old } from './useMultipMarketBase64Old';

export const useMultipMarketBase64 = getGmw379Enabled()
  ? useMultipMarketBase64New
  : useMultipMarketBase64Old;
