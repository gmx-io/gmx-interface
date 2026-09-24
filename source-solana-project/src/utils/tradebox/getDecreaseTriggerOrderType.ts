import { BN } from '@coral-xyz/anchor';
import { OrderType } from '@/selectors/order/types';

export function getDecreaseTriggerOrderType(p: {
  triggerPrice: BN;
  markPrice: BN;
  isLong: boolean;
}): OrderType.LimitDecrease | OrderType.StopLossDecrease {
  const { triggerPrice, markPrice, isLong } = p;

  const isTriggerAboveMarkPrice = triggerPrice.gt(markPrice);

  if (isTriggerAboveMarkPrice) {
    return isLong ? OrderType.LimitDecrease : OrderType.StopLossDecrease;
  } else {
    return isLong ? OrderType.StopLossDecrease : OrderType.LimitDecrease;
  }
}
