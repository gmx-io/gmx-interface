import { MarketInfo } from '@/selectors/market/types';
import { GlvInfo } from '@/selectors/glv/types';
import { isMarketInfo } from '@/utils/market/isMarketInfo';

export function getGlvOrMarketAddress(
  marketOrGlvInfo?: MarketInfo | GlvInfo
): string | undefined {
  if (!marketOrGlvInfo) return undefined;

  return isMarketInfo(marketOrGlvInfo)
    ? marketOrGlvInfo.marketTokenAddress.toBase58()
    : marketOrGlvInfo.glvTokenAddress.toBase58();
}
