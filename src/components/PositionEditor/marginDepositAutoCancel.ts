/** Margin deposits always auto-cancel; the order being replaced frees its own slot. */
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
