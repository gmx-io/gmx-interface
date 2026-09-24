import { getGmw425Enabled } from '@/config/featureFlagEnable';
import { OrderType } from '@/selectors/order/types';
import { getOrderTypeLabel } from '@/utils/order/getOrderTypeLabel';
import { getTriggerNameByOrderType } from '@/utils/order/getTriggerNameByOrderType';
import {
  isCollateralDepositOrder,
  isCollateralWithdrawOrder,
  isDecreaseOrderType,
} from '@/utils/order/isOrderType';
import { t } from '@lingui/macro';
import { BN } from '@coral-xyz/anchor';

export function getOrdersListTypeLabel(order: {
  orderType: OrderType;
  sizeDeltaUsd: BN;
}): string {
  if (!getGmw425Enabled()) {
    return isDecreaseOrderType(order.orderType)
      ? getTriggerNameByOrderType(order.orderType)
      : t`Limit`;
  }

  if (isCollateralDepositOrder(order)) {
    return t`Deposit Collateral`;
  }

  if (isCollateralWithdrawOrder(order)) {
    return t`Withdraw Collateral`;
  }

  return getOrderTypeLabel(order.orderType);
}
