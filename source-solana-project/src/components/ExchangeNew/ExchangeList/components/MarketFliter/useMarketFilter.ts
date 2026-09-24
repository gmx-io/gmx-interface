import { isSwapOrderType } from '@/utils/order/isOrderType';
import { OrderType } from '@/selectors/order/types';
import { PublicKey } from '@solana/web3.js';

interface OrderForMarketFilter {
  marketTokenAddress?: PublicKey;
  isLong?: boolean;
  orderType?: OrderType;
  positionAddress?: PublicKey;
}

export const useMarketFilter = (selectedMarketKeys: string[]) => {
  const filterByMarket = (order: OrderForMarketFilter): boolean => {
    if (selectedMarketKeys.length === 0) {
      return true;
    }

    const hasDirectionParent = selectedMarketKeys.includes('direction');
    const hasMarketsParent = selectedMarketKeys.includes('markets');
    const hasPositionsParent = selectedMarketKeys.includes(
      'open_positions_with_orders'
    );

    if (hasDirectionParent) {
      return true;
    }

    if (hasMarketsParent) {
      return !!order.marketTokenAddress;
    }

    if (hasPositionsParent) {
      return !!order.positionAddress;
    }

    let passFilter = false;

    // Direction (Longs/Shorts/Swaps)
    if (
      selectedMarketKeys.includes('Longs') &&
      order.isLong &&
      !isSwapOrderType(order.orderType)
    ) {
      passFilter = true;
    }

    if (
      selectedMarketKeys.includes('Shorts') &&
      !order.isLong &&
      !isSwapOrderType(order.orderType)
    ) {
      passFilter = true;
    }

    if (
      selectedMarketKeys.includes('Swaps') &&
      isSwapOrderType(order.orderType)
    ) {
      passFilter = true;
    }

    if (order.marketTokenAddress) {
      const orderMarketTokenStr = order.marketTokenAddress.toBase58();
      if (selectedMarketKeys.includes(orderMarketTokenStr)) {
        passFilter = true;
      }
    }

    if (order.positionAddress) {
      const orderPositionStr = order.positionAddress.toBase58();
      if (selectedMarketKeys.includes(orderPositionStr)) {
        passFilter = true;
      }
    }

    return passFilter;
  };

  return { filterByMarket };
};
