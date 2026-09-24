import { OrderType } from '@/selectors/order/types';
import { t } from '@lingui/macro';

export function getTriggerNameByOrderType(
  orderType: OrderType | undefined,
  abbr = false
) {
  const triggerStr = abbr ? t`T` : t`Trigger`;
  const takeProfitStr = abbr ? t`TP` : t`Take-Profit`;
  const stopLossStr = abbr ? t`SL` : t`Stop-Loss`;

  if (orderType === OrderType.LimitDecrease) {
    return takeProfitStr;
  }

  if (orderType === OrderType.StopLossDecrease) {
    return stopLossStr;
  }

  return triggerStr;
}
