import { GlvOrMarketInfo } from '@/selectors/glv/types';
import { getGlvOrMarketAddress } from '@/utils/glv/getGlvOrMarketAddress';
import { isGlvInfo } from '@/utils/glv/isGlvInfo';
import { GLV_MARKETS } from '@/config/markets';

export function getMarketBadge(market: GlvOrMarketInfo | undefined) {
  if (!market) {
    return undefined;
  }

  if (isGlvInfo(market)) {
    const marketAddress = getGlvOrMarketAddress(market);
    if (!marketAddress) return undefined;

    return GLV_MARKETS[marketAddress]?.shortening ?? 'GLV';
  }

  return market.isSpotOnly
    ? undefined
    : ([market.longToken.symbol, market.shortToken.symbol] as const);
}
