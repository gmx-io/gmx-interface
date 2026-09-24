import { GlvInfo, GlvOrMarketInfo } from '@/selectors/glv/types';

export function isGlvInfo(market?: GlvOrMarketInfo): market is GlvInfo {
  return Boolean(market && 'glvToken' in market);
}
