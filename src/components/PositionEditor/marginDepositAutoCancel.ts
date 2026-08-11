/**
 * Margin deposits are always created with auto-cancel, so the position must have a free auto-cancel slot.
 * The order being replaced frees its own slot within the same batch.
 */
export function getIsAutoCancelLimitReached(p: {
  positionOrders: { key: string; autoCancel: boolean }[];
  replacingOrderKey: string | undefined;
  maxAutoCancelOrders: bigint | undefined;
}): boolean {
  const { positionOrders, replacingOrderKey, maxAutoCancelOrders } = p;

  if (maxAutoCancelOrders === undefined) {
    return false;
  }

  const autoCancelOrdersCount = positionOrders.filter(
    (order) => order.autoCancel && order.key !== replacingOrderKey
  ).length;

  return autoCancelOrdersCount >= Number(maxAutoCancelOrders);
}
