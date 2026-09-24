import { GLV_MARKETS } from '@/config/markets';

export function getGlvMarketSubtitle(address: string): string {
  return GLV_MARKETS[address]?.subtitle || '';
}
