import { GLV_MARKETS } from '@/config/markets';

export function getGlvMarketName(address: string) {
  return GLV_MARKETS[address]?.name;
}
