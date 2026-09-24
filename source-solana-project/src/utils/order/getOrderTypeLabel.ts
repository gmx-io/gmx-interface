import { OrderType } from '@/selectors/order/types';
import { t } from '@lingui/macro';

export function getOrderTypeLabel(orderType: OrderType): string {
  const orderTypeLabels = {
    [OrderType.MarketSwap]: t`Market Swap`,
    [OrderType.LimitSwap]: t`Limit Swap`,
    [OrderType.MarketIncrease]: t`Market Increase`,
    [OrderType.LimitIncrease]: t`Limit Increase`,
    [OrderType.MarketDecrease]: t`Market Decrease`,
    [OrderType.LimitDecrease]: t`Take-Profit`,
    [OrderType.StopLossDecrease]: t`Stop-Loss`,
    [OrderType.Liquidation]: t`Liquidation`,
    [OrderType.AutoDeleveraging]: t`Auto Deleveraging`,
  };

  return orderTypeLabels[orderType] || t`Unknown Order Type`;
}
