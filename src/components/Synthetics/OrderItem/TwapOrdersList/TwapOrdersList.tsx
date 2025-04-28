import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import { isIncreaseOrderType, isSwapOrderType } from "domain/synthetics/orders";
import { Token } from "domain/tokens";
import { formatDateTime } from "lib/dates";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { OrderType, TwapOrderInfo } from "sdk/types/orders";

import TokenIcon from "components/TokenIcon/TokenIcon";

export default function TwapOrdersList({ order }: { order: TwapOrderInfo }) {
  const sortedOrders = useMemo(
    () => order.orders.sort((a, b) => Number(a.validFromTime) - Number(b.validFromTime)),
    [order.orders]
  );

  const executedOrders = useMemo(() => {
    const lastToExecuteOrder = sortedOrders[sortedOrders.length - 1];
    const firstToExecuteOrder = sortedOrders[0];
    const timeDelta =
      (lastToExecuteOrder.validFromTime - lastToExecuteOrder.updatedAtTime) / BigInt(order.numberOfParts);
    return new Array(order.numberOfParts - sortedOrders.length).fill(0).map((_, i) => {
      const validFromTime = firstToExecuteOrder.updatedAtTime - timeDelta * BigInt(i);
      return {
        key: `executed-order-${i}`,
        orderType: lastToExecuteOrder.orderType,
        sizeDeltaUsd: lastToExecuteOrder.sizeDeltaUsd,
        initialCollateralDeltaAmount: lastToExecuteOrder.initialCollateralDeltaAmount,
        initialCollateralToken: lastToExecuteOrder.initialCollateralToken,
        targetCollateralToken: lastToExecuteOrder.targetCollateralToken,
        validFromTime,
      };
    });
  }, [order.numberOfParts, sortedOrders]);

  return (
    <div className="max-h-[216px] overflow-y-auto pl-8 pr-12">
      <div className="text-body-small">
        <table>
          {executedOrders.map((o) => (
            <TwapOrderItem key={o.key} order={o} isExecuted={true} />
          ))}
          {sortedOrders.map((o) => (
            <TwapOrderItem key={o.key} order={o} isExecuted={false} />
          ))}
        </table>
      </div>
    </div>
  );
}

function TwapOrderItem({
  order,
  isExecuted,
}: {
  order: {
    orderType: OrderType;
    sizeDeltaUsd: bigint;
    validFromTime: bigint;
    key: string;
    initialCollateralDeltaAmount: bigint;
    initialCollateralToken: Token;
    targetCollateralToken: Token;
  };
  isExecuted: boolean;
}) {
  const sizeText = formatUsd(order.sizeDeltaUsd * (isIncreaseOrderType(order.orderType) ? 1n : -1n), {
    displayPlus: true,
  });

  if (isSwapOrderType(order.orderType)) {
    const fromTokenText = formatBalanceAmount(
      order.initialCollateralDeltaAmount,
      order.initialCollateralToken.decimals
    );
    const fromTokenIcon = <TokenIcon symbol={order.initialCollateralToken.symbol} displaySize={18} importSize={24} />;
    const toTokenIcon = <TokenIcon symbol={order.targetCollateralToken.symbol} displaySize={18} importSize={24} />;

    return (
      <tr key={order.key} className="gap-x-8 border-b border-gray-700 last:border-b-0">
        <td className="py-8 pr-8 text-slate-100">{formatDateTime(Number(order.validFromTime))}</td>
        <td className="py-8 pr-8">
          <div className={cx("inline-flex flex-wrap gap-y-8 whitespace-pre-wrap")}>
            <Trans>
              <span>{fromTokenText} </span>
              {fromTokenIcon}
              <span> to </span>

              {toTokenIcon}
            </Trans>
          </div>
        </td>
        <td className="py-8 text-right">
          <Trans>{isExecuted ? "Executed" : "Pending"}</Trans>
        </td>
      </tr>
    );
  }

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
