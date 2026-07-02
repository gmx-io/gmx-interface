import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo } from "react";

import { useEditingOrderState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { useCancelOrder, usePositionOrdersWithErrors } from "context/SyntheticsStateContext/hooks/orderHooks";
import {
  selectOracleSettings,
  selectPositionsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  OrderErrors,
  PositionOrderInfo,
  isIncreaseOrderType,
  isMarketOrderType,
  isTwapOrder,
} from "domain/synthetics/orders";
import { useDisabledCancelMarketOrderMessage } from "domain/synthetics/orders/useDisabledCancelMarketOrderMessage";
import { getNameByOrderType, getPositionKey } from "domain/synthetics/positions";
import { isFullClosePositionOrder } from "domain/tpsl/utils";
import { calculateDisplayDecimals, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";

import Button from "components/Button/Button";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronRightIcon from "img/ic_chevron_right.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import EditIcon from "img/ic_edit.svg?react";

import { TwapOrderProgress } from "../OrderItem/OrderItem";

export function PositionItemOrdersSmall({
  positionKey,
  onOrdersClick,
  hideActions,
}: {
  positionKey: string;
  onOrdersClick?: (key?: string) => void;
  hideActions?: boolean;
}) {
  const ordersWithErrors = usePositionOrdersWithErrors(positionKey);

  if (ordersWithErrors.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {ordersWithErrors.map((params) => (
        <PositionItemOrder key={params.order.key} onOrdersClick={onOrdersClick} hideActions={hideActions} {...params} />
      ))}
    </div>
  );
}

export function PositionItemOrdersLarge({
  positionKey,
  onOrdersClick,
  hideActions,
}: {
  positionKey: string;
  onOrdersClick?: (key?: string) => void;
  hideActions?: boolean;
}) {
  const ordersWithErrors = usePositionOrdersWithErrors(positionKey);

  const [ordersErrorList, ordersWarningsList] = useMemo(() => {
    const ordersErrorList = ordersWithErrors.filter(({ orderErrors }) => orderErrors.level === "error");
    const ordersWarningsList = ordersWithErrors.filter(({ orderErrors }) => orderErrors.level === "warning");
    return [ordersErrorList, ordersWarningsList];
  }, [ordersWithErrors]);

  if (ordersWithErrors.length === 0) return null;

  return (
    <div>
      <TooltipWithPortal
        className="Position-list-active-orders"
        handle={
          <>
            <Trans>Orders ({ordersWithErrors.length})</Trans>
            {ordersWarningsList.length > 0 || ordersErrorList.length > 0 ? (
              <div
                className={cx("relative top-3 size-6 rounded-full", {
                  "bg-yellow-300": ordersWarningsList.length > 0 && !ordersErrorList.length,
                  "bg-red-500": ordersErrorList.length > 0,
                })}
              />
            ) : null}
          </>
        }
        position="bottom"
        handleClassName={cx([
          "Exchange-list-info-label",
          "Exchange-position-list-orders",
          "clickable",
          "text-typography-secondary",
        ])}
        maxAllowedWidth={370}
        tooltipClassName="!z-10 w-[370px]"
        content={
          <div className="flex max-h-[350px] cursor-auto flex-col gap-8 overflow-y-auto leading-base">
            <div className="font-medium">
              <Trans>Active orders</Trans>
            </div>
            {ordersWithErrors.map((params) => (
              <PositionItemOrder
                key={params.order.key}
                onOrdersClick={onOrdersClick}
                hideActions={hideActions}
                {...params}
              />
            ))}
          </div>
        }
      />
    </div>
  );
}

function PositionItemOrder({
  order,
  orderErrors,
  onOrdersClick,
  hideActions,
}: {
  order: PositionOrderInfo;
  orderErrors: OrderErrors;
  onOrdersClick?: (key?: string) => void;
  hideActions?: boolean;
}) {
  const [, setEditingOrderState] = useEditingOrderState();
  const [isCancelling, cancel] = useCancelOrder(order);
  const handleOrdersClick = useCallback(() => {
    onOrdersClick?.(order.key);
  }, [onOrdersClick, order.key]);

  const errors = orderErrors.errors;

  const handleEditClick = useCallback(() => {
    setEditingOrderState({ orderKey: order.key, source: "PositionsList" });
  }, [order.key, setEditingOrderState]);

  const oracleSettings = useSelector(selectOracleSettings);
  const disabledCancelMarketOrderMessage = useDisabledCancelMarketOrderMessage(order, oracleSettings);

  const isDisabled = isCancelling || Boolean(disabledCancelMarketOrderMessage);

  const cancelButton = (
    <Button variant="secondary" disabled={isDisabled} onClick={cancel} className="px-8">
      <CloseIcon className="size-16" />
    </Button>
  );

  return (
    <div key={order.key}>
      <div className="flex items-start justify-between gap-6">
        <Button variant="secondary" className="w-full !justify-start !pl-12" onClick={handleOrdersClick}>
          <div className="flex items-center justify-between">
            <PositionItemOrderText order={order} />
            <ChevronRightIcon className="ml-4 size-14" />
          </div>
        </Button>
        {!hideActions && !isTwapOrder(order) && !isMarketOrderType(order.orderType) && (
          <Button variant="secondary" onClick={handleEditClick} className="px-8">
            <EditIcon className="size-16" />
          </Button>
        )}
        {!hideActions &&
          (disabledCancelMarketOrderMessage ? (
            <TooltipWithPortal handle={cancelButton} content={disabledCancelMarketOrderMessage} />
          ) : (
            cancelButton
          ))}
      </div>

      {errors.length !== 0 && (
        <div className="mt-8 flex flex-col gap-8 text-start">
          {errors.map((err) => (
            <div
              key={err.key}
              className={cx("hyphens-auto [overflow-wrap:anywhere]", {
                "text-red-500": err.level === "error",
                "text-yellow-300": err.level === "warning",
              })}
            >
              {err.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PositionItemOrderText({ order }: { order: PositionOrderInfo }) {
  const positionsInfoData = useSelector(selectPositionsInfoData);
  const triggerThresholdType = order.triggerThresholdType;
  const isIncrease = isIncreaseOrderType(order.orderType);
  const isTwap = isTwapOrder(order);
  const position = getByKey(
    positionsInfoData,
    getPositionKey(order.account, order.marketAddress, order.targetCollateralToken.address, order.isLong)
  );
  const isFullClose = isFullClosePositionOrder(order, position?.sizeInUsd);

  return (
    <div key={order.key} className="text-start">
      {getNameByOrderType(order.orderType, order.isTwap, { abbr: true })}
      {!isTwap && !isMarketOrderType(order.orderType) ? `: ${triggerThresholdType} ` : null}
      {!isTwap && !isMarketOrderType(order.orderType) && (
        <span className="numbers">
          {formatUsd(order.triggerPrice, {
            displayDecimals: calculateDisplayDecimals(
              order.triggerPrice,
              undefined,
              order.indexToken?.visualMultiplier
            ),
            visualMultiplier: order.indexToken?.visualMultiplier,
          })}
        </span>
      )}
      :{" "}
      <span className="numbers">
        {isFullClose ? (
          <Trans>Full position close</Trans>
        ) : (
          <>
            {isIncrease ? "+" : "-"}
            {formatUsd(order.sizeDeltaUsd)} {isTwap && <TwapOrderProgress order={order} />}
          </>
        )}
      </span>
    </div>
  );
}
