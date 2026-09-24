import { BN_ZERO } from '@/config/constants';
import { PositionOrderInfo } from '@/selectors/order/types';
import { Token } from '@/selectors/token/types';

export function sortPositionOrders(
  orders: PositionOrderInfo[],
  tokenSortOrder?: string[]
): PositionOrderInfo[] {
  return orders.sort((a, b) => {
    if (tokenSortOrder) {
      const indexA = getTokenIndex(a.marketInfo.indexToken, tokenSortOrder);
      const indexB = getTokenIndex(b.marketInfo.indexToken, tokenSortOrder);
      if (indexA !== indexB) return indexA - indexB;
    } else {
      const nameComparison = a.marketInfo.name.localeCompare(b.marketInfo.name);
      if (nameComparison) return nameComparison;
    }

    // Compare by trigger price

    if (a.triggerPrice && b.triggerPrice) {
      const triggerPriceComparison = a.triggerPrice.sub(b.triggerPrice);
      if (!triggerPriceComparison.isZero())
        return triggerPriceComparison.lt(BN_ZERO) ? -1 : 1;
    }

    // Compare by order type
    const orderTypeComparison = a.orderType - b.orderType;
    if (orderTypeComparison) return orderTypeComparison;

    // Finally, sort by size delta USD
    return b.sizeDeltaUsd.sub(a.sizeDeltaUsd).lt(BN_ZERO) ? -1 : 1;
  });
}

function getTokenIndex(token: Token, referenceArray: string[]): number {
  return referenceArray.indexOf(
    token.wrappedAddress?.toBase58() &&
      referenceArray.includes(token.wrappedAddress.toBase58())
      ? token.wrappedAddress.toBase58()
      : token.address.toBase58()
  );
}
