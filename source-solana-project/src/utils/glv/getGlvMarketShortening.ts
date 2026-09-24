import { GLV_MARKETS } from '@/config/markets';

export function getGlvMarketShortening(address: string): string {
  return GLV_MARKETS[address]?.shortening || '';
}
