import { TradeFlags } from '@/selectors/trade/types';

export function getTradeFlagsForCollateralEdit(
  isLong: boolean | undefined,
  isIncrease: boolean
): TradeFlags {
  return {
    isMarket: true,
    isIncrease,
    isLimit: false,
    isLong: Boolean(isLong),
    isShort: !isLong,
    isSwap: false,
    isPosition: true,
    isTrigger: false,
  };
}
