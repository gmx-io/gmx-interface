import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { isIncreaseOrderType } from "domain/synthetics/orders";
import { TwapPositionOrderInfo } from "domain/synthetics/orders";
import { TwapSwapOrderInfo } from "domain/synthetics/orders";
import { formatDateTime } from "lib/dates";
import { formatUsd } from "lib/numbers";
import { OrderType } from "sdk/types/orders";

export default function TwapOrdersList({ order }: { order: TwapSwapOrderInfo | TwapPositionOrderInfo }) {
  const sortedOrders = useMemo(
    () => order.orders.sort((a, b) => Number(a.validFromTime) - Number(b.validFromTime)),
    [order.orders]
  );

  const executedOrders = useMemo(() => {
    const latestOrder = sortedOrders[sortedOrders.length - 1];
    const firstOrder = sortedOrders[0];
    const timeDelta = (latestOrder.validFromTime - latestOrder.updatedAtTime) / BigInt(order.numberOfParts);
    return new Array(order.numberOfParts - order.orders.length).fill(0).map((_, i) => {
      const validFromTime = firstOrder.updatedAtTime - timeDelta * BigInt(i);
      return {
        key: `executed-order-${i}`,
        orderType: latestOrder.orderType,
        sizeDeltaUsd: latestOrder.sizeDeltaUsd,
        validFromTime,
      };
    });
  }, [order.numberOfParts, order.orders, sortedOrders]);

  return (
    <div className="max-h-[216px] overflow-y-auto">
      <table>
        {executedOrders.map((o) => (
          <TwapOrderItem key={o.key} order={o} isExecuted={true} />
        ))}
        {sortedOrders.map((o) => (
          <TwapOrderItem key={o.key} order={o} isExecuted={false} />
        ))}
      </table>
    </div>
  );
}

function TwapOrderItem({
  order,
  isExecuted,
}: {
  order: { orderType: OrderType; sizeDeltaUsd: bigint; validFromTime: bigint; key: string };
  isExecuted: boolean;
}) {
  const sizeText = formatUsd(order.sizeDeltaUsd * (isIncreaseOrderType(order.orderType) ? 1n : -1n), {
    displayPlus: true,
  });

  return (
    <tr key={order.key} className="gap-x-8 border-b border-gray-700 last:border-b-0">
      <td className="py-8 pr-8 text-slate-100">{formatDateTime(Number(order.validFromTime))}</td>
      <td className="py-8 pr-8">{sizeText}</td>
      <td className="py-8 text-right">
        <Trans>{isExecuted ? "Executed" : "Pending"}</Trans>
      </td>
    </tr>
  );
}
