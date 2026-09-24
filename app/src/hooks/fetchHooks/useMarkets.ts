import { getGmw379Enabled } from '@/config/featureFlagEnable';
import { useMarkets as useMarketsNew } from './useMarketsNew';
import { useMarkets as useMarketsOld } from './useMarketsOld';

export const useMarkets = getGmw379Enabled() ? useMarketsNew : useMarketsOld;

export { MARKETS_KEY } from './useMarketsNew';
export type { DecodedMarketAccount } from '@/utils/market/decodeMarketAccount';
