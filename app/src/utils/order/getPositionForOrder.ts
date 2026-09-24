import { BN_ZERO } from '@/config/constants';
import { Order } from '@/selectors/order/types';
import { PositionsInfo } from '@/selectors/position/types';

export function getPositionForOrder(order: Order, positionsMap: PositionsInfo) {
  const positionAddress = order.orderRelatedPositionAddress;

  if (!positionAddress) {
    return null;
  }

  const position = positionsMap[positionAddress.toBase58()];

  return position && position.sizeInTokens && position.sizeInTokens.gt(BN_ZERO)
    ? position
    : null;
}
