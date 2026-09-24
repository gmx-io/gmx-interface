import { BN_ZERO } from '@/config/constants';
import { SwapOrderInfo } from '@/selectors/order/types';
import { Token } from '@/selectors/token/types';

export function sortSwapOrders(
  orders: SwapOrderInfo[],
  tokenSortOrder?: string[]
): SwapOrderInfo[] {
  return orders.sort((a, b) => {
    if (tokenSortOrder) {
      const indexA = getTokenIndex(a.targetCollateralToken, tokenSortOrder);
      const indexB = getTokenIndex(b.targetCollateralToken, tokenSortOrder);
      if (indexA !== indexB) return indexA - indexB;
    } else {
      const collateralComparison = a.targetCollateralToken.symbol.localeCompare(
        b.targetCollateralToken.symbol
      );
      if (collateralComparison) return collateralComparison;
    }

    return a.minOutputAmount.sub(b.minOutputAmount).lt(BN_ZERO) ? -1 : 1;
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
