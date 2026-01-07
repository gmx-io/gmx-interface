import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo } from "react";

import {
  usePositionsConstants,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useEditingOrderState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { useCancelOrder } from "context/SyntheticsStateContext/hooks/orderHooks";
import { selectIsSetAcceptablePriceImpactEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isLimitDecreaseOrderType, OrderType, PositionOrderInfo } from "domain/synthetics/orders";
import { PositionInfo, getIsPositionInfoLoaded } from "domain/synthetics/positions";
import { getDecreasePositionAmounts } from "domain/synthetics/trade";
import { formatDeltaUsd, formatUsd, formatBalanceAmount, formatPercentage } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";
import { bigMath } from "sdk/utils/bigmath";

import Button from "components/Button/Button";
import { Table, TableTh, TableTheadTr } from "components/Table/Table";
import { TableTd, TableTr } from "components/Table/Table";

import CloseIcon from "img/ic_close.svg?react";
import EditIcon from "img/ic_edit.svg?react";

type Props = {
  orders: PositionOrderInfo[];
  position: PositionInfo;
  marketDecimals: number | undefined;
  isMobile: boolean;
  onEdit?: (orderKey: string) => void;
};

export function TPSLOrdersList({ orders, position, marketDecimals, isMobile, onEdit }: Props) {
  const [, setEditingOrderState] = useEditingOrderState();

  const handleEditOrder = useCallback(
    (orderKey: string) => {
      if (onEdit) {
        onEdit(orderKey);
        return;
      }
      setEditingOrderState({ orderKey, source: "PositionsList" });
    },
    [onEdit, setEditingOrderState]
  );

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-32 text-typography-secondary">
        <Trans>No TP/SL orders</Trans>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex max-h-[70vh] flex-col gap-12 overflow-y-auto pb-60 pt-8">
        {orders.map((order) => (
          <TPSLOrderCard
            key={order.key}
            order={order}
            position={position}
            marketDecimals={marketDecimals}
            onEdit={handleEditOrder}
          />
        ))}
      </div>
    );
  }

  return (
    <Table>
      <thead className="text-body-small">
        <TableTheadTr>
          <TableTh className="w-[15%]">
            <Trans>Type</Trans>
          </TableTh>
          <TableTh className="w-[20%]">
            <Trans>Size (% of Position)</Trans>
          </TableTh>
          <TableTh className="w-[15%]">
            <Trans>Trigger Price</Trans>
          </TableTh>
          <TableTh className="w-[18%]">
            <Trans>Est. PnL</Trans>
          </TableTh>
          <TableTh className="w-[20%]">
            <Trans>Receive</Trans>
          </TableTh>
          <TableTh className="w-[12%]"></TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <TPSLOrderRow
            key={order.key}
            order={order}
            position={position}
            marketDecimals={marketDecimals}
            onEdit={handleEditOrder}
          />
        ))}
      </tbody>
    </Table>
  );
}

function useTPSLOrderViewModel({
  order,
  position,
  marketDecimals,
  onEdit,
}: {
  order: PositionOrderInfo;
  position: PositionInfo;
  marketDecimals: number | undefined;
  onEdit?: (orderKey: string) => void;
}) {
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants();
  const uiFeeFactor = useUiFeeFactor();
  const userReferralInfo = useUserReferralInfo();
  const isSetAcceptablePriceImpactEnabled = useSelector(selectIsSetAcceptablePriceImpactEnabled);
  const [isCancelling, cancelOrder] = useCancelOrder(order);

  const orderType = useMemo(
    () => (isLimitDecreaseOrderType(order.orderType) ? t`Take Profit` : t`Stop Loss`),
    [order.orderType]
  );

  const triggerPriceDisplay = useMemo(
    () =>
      `${order.triggerThresholdType} ${formatUsd(order.triggerPrice, {
        displayDecimals: marketDecimals,
        visualMultiplier: order.indexToken?.visualMultiplier,
      })}`,
    [marketDecimals, order.indexToken?.visualMultiplier, order.triggerPrice, order.triggerThresholdType]
  );

  const sizeDisplay = useMemo(() => {
    const isFullClose = order.sizeDeltaUsd === position.sizeInUsd;

    if (isFullClose) {
      return <Trans>Full Position Close</Trans>;
    }

    const sizePercentage =
      position.sizeInUsd === 0n ? 0n : bigMath.mulDiv(order.sizeDeltaUsd, 10000n, position.sizeInUsd);

    return (
      <span>
        <span>-{formatUsd(order.sizeDeltaUsd)}</span>
        <span className="ml-4 text-typography-secondary">(-{formatPercentage(sizePercentage)})</span>
      </span>
    );
  }, [order.sizeDeltaUsd, position.sizeInUsd]);

  const estimatedPnl = useMemo(() => {
    const entryPrice = position.entryPrice ?? 0n;
    const priceDiff = order.isLong ? order.triggerPrice - entryPrice : entryPrice - order.triggerPrice;

    const pnlUsd = entryPrice > 0n ? bigMath.mulDiv(priceDiff, order.sizeDeltaUsd, entryPrice) : 0n;
    const pnlPercentage = position.collateralUsd > 0n ? bigMath.mulDiv(pnlUsd, 10000n, position.collateralUsd) : 0n;

    return { pnlUsd, pnlPercentage };
  }, [order.isLong, order.sizeDeltaUsd, order.triggerPrice, position.collateralUsd, position.entryPrice]);

  const shouldKeepLeverage = useMemo(() => {
    if (order.sizeDeltaUsd >= position.sizeInUsd) {
      return true;
    }

    return order.initialCollateralDeltaAmount > 0n;
  }, [order.initialCollateralDeltaAmount, order.sizeDeltaUsd, position.sizeInUsd]);

  const decreaseAmounts = useMemo(() => {
    if (minCollateralUsd === undefined || minPositionSizeUsd === undefined || !getIsPositionInfoLoaded(position)) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo: order.marketInfo,
      collateralToken: position.collateralToken,
      receiveToken: order.targetCollateralToken,
      isLong: order.isLong,
      position,
      closeSizeUsd: order.sizeDeltaUsd,
      keepLeverage: shouldKeepLeverage,
      triggerPrice: order.triggerPrice,
      userReferralInfo,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      triggerOrderType: order.orderType as OrderType.LimitDecrease | OrderType.StopLossDecrease,
      isSetAcceptablePriceImpactEnabled,
    });
  }, [
    minCollateralUsd,
    minPositionSizeUsd,
    order.marketInfo,
    order.targetCollateralToken,
    order.isLong,
    order.orderType,
    order.sizeDeltaUsd,
    order.triggerPrice,
    position,
    shouldKeepLeverage,
    userReferralInfo,
    uiFeeFactor,
    isSetAcceptablePriceImpactEnabled,
  ]);

  const receiveDisplay = useMemo(() => {
    if (!decreaseAmounts) return "—";

    const receiveUsd = decreaseAmounts.receiveUsd;
    const receiveToken = order.targetCollateralToken;

    if (!receiveToken) return "—";

    const receiveAmount = decreaseAmounts.receiveTokenAmount ?? 0n;

    return (
      <span>
        {formatBalanceAmount(receiveAmount, receiveToken.decimals, receiveToken.symbol, {
          isStable: receiveToken.isStable,
        })}
        <span className="ml-4 text-typography-secondary">({formatUsd(receiveUsd)})</span>
      </span>
    );
  }, [decreaseAmounts, order.targetCollateralToken]);

  const handleEdit = useCallback(() => {
    onEdit?.(order.key);
  }, [onEdit, order.key]);

  const handleCancel = useCallback(() => {
    cancelOrder();
  }, [cancelOrder]);

  return {
    orderType,
    triggerPriceDisplay,
    sizeDisplay,
    estimatedPnl,
    receiveDisplay,
    handleEdit,
    handleCancel,
    isCancelling,
  };
}

function TPSLOrderCard({
  order,
  position,
  marketDecimals,
  onEdit,
}: {
  order: PositionOrderInfo;
  position: PositionInfo;
  marketDecimals: number | undefined;
  onEdit?: (orderKey: string) => void;
}) {
  const {
    orderType,
    triggerPriceDisplay,
    sizeDisplay,
    estimatedPnl,
    receiveDisplay,
    handleEdit,
    handleCancel,
    isCancelling,
  } = useTPSLOrderViewModel({ order, position, marketDecimals, onEdit });

  return (
    <div className="flex flex-col gap-10 border-b-1/2 border-slate-600 p-16 last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="text-14 font-medium text-typography-secondary">
          <Trans>Type</Trans>
        </span>
        <span className="text-body-medium">{orderType}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-14 font-medium text-typography-secondary">
          <Trans>Size (% of position)</Trans>
        </span>
        <span className="text-body-medium numbers">{sizeDisplay}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-14 font-medium text-typography-secondary">
          <Trans>Trigger Price</Trans>
        </span>
        <span className="text-body-medium numbers">{triggerPriceDisplay}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-14 font-medium text-typography-secondary">
          <Trans>Est. PNL</Trans>
        </span>
        <span className={cx("text-body-medium numbers", getPositiveOrNegativeClass(estimatedPnl.pnlUsd))}>
          {formatDeltaUsd(estimatedPnl.pnlUsd, estimatedPnl.pnlPercentage)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-14 font-medium text-typography-secondary">
          <Trans>Receive</Trans>
        </span>
        <span className="text-body-medium numbers">{receiveDisplay}</span>
      </div>

      <div className="mt-4 flex gap-8">
        <Button variant="secondary" className="flex-1" onClick={handleEdit}>
          <Trans>Edit</Trans>
        </Button>
        <Button
          variant="secondary"
          className="hover:!text-red-300 flex-1 !bg-red-900 !text-red-400 hover:!bg-red-700/25"
          onClick={handleCancel}
          disabled={isCancelling}
        >
          <Trans>Cancel</Trans>
          <CloseIcon className="ml-4 size-14" />
        </Button>
      </div>
    </div>
  );
}

export function TPSLOrderRow({
  order,
  position,
  marketDecimals,
  onEdit,
}: {
  order: PositionOrderInfo;
  position: PositionInfo;
  marketDecimals: number | undefined;
  onEdit?: (orderKey: string) => void;
}) {
  const {
    orderType,
    triggerPriceDisplay,
    sizeDisplay,
    estimatedPnl,
    receiveDisplay,
    handleEdit,
    handleCancel,
    isCancelling,
  } = useTPSLOrderViewModel({ order, position, marketDecimals, onEdit });

  return (
    <TableTr>
      <TableTd>
        <span>{orderType}</span>
      </TableTd>
      <TableTd>
        <span className="numbers">{sizeDisplay}</span>
      </TableTd>
      <TableTd>
        <span className="numbers">{triggerPriceDisplay}</span>
      </TableTd>
      <TableTd>
        <span className={cx("numbers", getPositiveOrNegativeClass(estimatedPnl.pnlUsd))}>
          {formatDeltaUsd(estimatedPnl.pnlUsd, estimatedPnl.pnlPercentage)}
        </span>
      </TableTd>
      <TableTd>
        <span className="numbers">{receiveDisplay}</span>
      </TableTd>
      <TableTd>
        <div className="flex items-center justify-end gap-4">
          <Button variant="ghost" className="!p-8" onClick={handleEdit}>
            <EditIcon className="size-16" />
          </Button>
          <Button variant="ghost" className="!p-8" onClick={handleCancel} disabled={isCancelling}>
            <CloseIcon className="size-16" />
          </Button>
        </div>
      </TableTd>
    </TableTr>
  );
}
