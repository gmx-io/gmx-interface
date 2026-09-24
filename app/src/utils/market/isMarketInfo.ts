import { MarketInfo } from '@/selectors/market/types';
import { GlvInfo } from '@/selectors/glv/types';
import { isGlvInfo } from '@/utils/glv/isGlvInfo';

export const isMarketInfo = (
  market: GlvInfo | MarketInfo
): market is MarketInfo => !isGlvInfo(market);
