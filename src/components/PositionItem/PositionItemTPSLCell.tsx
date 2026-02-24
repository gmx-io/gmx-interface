import cx from "classnames";
import { useMemo } from "react";

import { usePositionOrdersWithErrors } from "context/SyntheticsStateContext/hooks/orderHooks";
import {
  PositionOrderInfo,
  isLimitDecreaseOrderType,
  isStopLossOrderType,
  isTwapOrder,
} from "domain/synthetics/orders";
import { formatUsd } from "lib/numbers";

import EditIcon from "img/ic_edit.svg?react";
import PlusCircleIcon from "img/ic_plus_circle.svg?react";

export function PositionItemTPSLCell({
  positionKey,
  markPrice,
  marketDecimals,
  visualMultiplier,
  isLarge,
  onOpenTPSLModal,
  isDisabled = false,
}: {
  positionKey: string;
  markPrice: bigint;
  marketDecimals: number | undefined;
  visualMultiplier?: number;
  isLarge: boolean;
  onOpenTPSLModal: () => void;
  isDisabled?: boolean;
}) {
  const ordersWithErrors = usePositionOrdersWithErrors(positionKey);

  const { closestTp, tpCount, closestSl, slCount } = useMemo(
    () =>
      getClosestTpSlOrders({
        ordersWithErrors,
        markPrice,
      }),
    [ordersWithErrors, markPrice]
  );

  const hasTpOrSl = tpCount > 0 || slCount > 0;

  if (!isLarge) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4">
          <span className={cx("numbers", "text-green-500")}>
            {closestTp ? (
              <>
                {formatUsd(closestTp.triggerPrice, {
                  displayDecimals: marketDecimals,
                  visualMultiplier,
                })}
                {tpCount > 1 && ` (${tpCount})`}
              </>
            ) : (
              "—"
            )}
          </span>
          <span className="text-typography-inactive">•</span>
          <span className={cx("numbers", "text-red-500")}>
            {closestSl ? (
              <>
                {formatUsd(closestSl.triggerPrice, {
                  displayDecimals: marketDecimals,
                  visualMultiplier,
                })}
                {slCount > 1 && ` (${slCount})`}
              </>
            ) : (
              "—"
            )}
          </span>
        </div>
        <button
          onClick={isDisabled ? undefined : onOpenTPSLModal}
          disabled={isDisabled}
          className={cx(
            "flex size-20 items-center justify-center rounded-4 text-typography-secondary",
            isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:text-typography-primary"
          )}
        >
          {hasTpOrSl ? <EditIcon width={16} height={16} /> : <PlusCircleIcon width={16} height={16} />}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col gap-2">
        <span className={cx("numbers", "text-green-500")}>
          {closestTp ? (
            <>
              {formatUsd(closestTp.triggerPrice, {
                displayDecimals: marketDecimals,
                visualMultiplier,
              })}
              {tpCount > 1 && <span className="ml-2">({tpCount})</span>}
            </>
          ) : (
            "—"
          )}
        </span>
        <span className={cx("numbers", "text-red-500")}>
          {closestSl ? (
            <>
              {formatUsd(closestSl.triggerPrice, {
                displayDecimals: marketDecimals,
                visualMultiplier,
              })}
              {slCount > 1 && <span className="ml-2">({slCount})</span>}
            </>
          ) : (
            "—"
          )}
        </span>
      </div>
      <button
        onClick={isDisabled ? undefined : onOpenTPSLModal}
        disabled={isDisabled}
        className={cx(
          "flex size-20 items-center justify-center rounded-4 text-typography-secondary",
          isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:text-typography-primary"
        )}
      >
        {hasTpOrSl ? <EditIcon width={16} height={16} /> : <PlusCircleIcon width={16} height={16} />}
      </button>
    </div>
  );
}

function getClosestTpSlOrders(p: { ordersWithErrors: { order: PositionOrderInfo }[]; markPrice: bigint }): {
  closestTp: PositionOrderInfo | undefined;
  closestSl: PositionOrderInfo | undefined;
  tpCount: number;
  slCount: number;
} {
  const tpOrders: PositionOrderInfo[] = [];
  const slOrders: PositionOrderInfo[] = [];

  for (const { order } of p.ordersWithErrors) {
    if (isTwapOrder(order)) continue;
    if (isLimitDecreaseOrderType(order.orderType)) {
      tpOrders.push(order);
    } else if (isStopLossOrderType(order.orderType)) {
      slOrders.push(order);
    }
  }

  let closestTp: PositionOrderInfo | undefined;
  let closestTpDistance = BigInt(Number.MAX_SAFE_INTEGER) * 10n ** 30n;
  for (const order of tpOrders) {
    const distance =
      order.triggerPrice > p.markPrice ? order.triggerPrice - p.markPrice : p.markPrice - order.triggerPrice;
    if (distance < closestTpDistance) {
      closestTpDistance = distance;
      closestTp = order;
    }
  }

  let closestSl: PositionOrderInfo | undefined;
  let closestSlDistance = BigInt(Number.MAX_SAFE_INTEGER) * 10n ** 30n;
  for (const order of slOrders) {
    const distance =
      order.triggerPrice > p.markPrice ? order.triggerPrice - p.markPrice : p.markPrice - order.triggerPrice;
    if (distance < closestSlDistance) {
      closestSlDistance = distance;
      closestSl = order;
    }
  }

  return {
    closestTp,
    tpCount: tpOrders.length,
    closestSl,
    slCount: slOrders.length,
  };
}
