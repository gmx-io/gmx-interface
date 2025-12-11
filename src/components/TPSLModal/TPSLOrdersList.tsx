import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo } from "react";

import { useCancelOrder } from "context/SyntheticsStateContext/hooks/orderHooks";
import { isLimitDecreaseOrderType, PositionOrderInfo } from "domain/synthetics/orders";
import { PositionInfo } from "domain/synthetics/positions";
import { formatDeltaUsd, formatUsd, formatBalanceAmount } from "lib/numbers";
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
};

export function TPSLOrdersList({ orders, position, marketDecimals, isMobile }: Props) {
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
          <TPSLOrderCard key={order.key} order={order} position={position} marketDecimals={marketDecimals} />
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
          <TPSLOrderRow key={order.key} order={order} position={position} marketDecimals={marketDecimals} />
        ))}
      </tbody>
    </Table>
  );
}

function TPSLOrderCard({
  order,
  position,
  marketDecimals,
}: {
  order: PositionOrderInfo;
  position: PositionInfo;
  marketDecimals: number | undefined;
}) {
  const [isCancelling, cancelOrder] = useCancelOrder(order);

  const isTakeProfit = isLimitDecreaseOrderType(order.orderType);
  const orderType = isTakeProfit ? t`Take Profit` : t`Stop Loss`;

  const isFullClose = order.sizeDeltaUsd === position.sizeInUsd;

  const sizePercentage = useMemo(() => {
    if (position.sizeInUsd === 0n) return 0n;
    return bigMath.mulDiv(order.sizeDeltaUsd, 10000n, position.sizeInUsd);
  }, [order.sizeDeltaUsd, position.sizeInUsd]);

  const sizeDisplay = useMemo(() => {
    if (isFullClose) {
      return <Trans>Full Position Close</Trans>;
    }
    const percentage = Number(sizePercentage) / 100;
    return (
      <span>
        <span>-{formatUsd(order.sizeDeltaUsd)}</span>
        <span className="ml-4 text-typography-secondary">(-{percentage.toFixed(2)}%)</span>
      </span>
    );
  }, [isFullClose, order.sizeDeltaUsd, sizePercentage]);

  const triggerPriceDisplay = useMemo(() => {
    const thresholdType = order.triggerThresholdType;
    const price = formatUsd(order.triggerPrice, {
      displayDecimals: marketDecimals,
      visualMultiplier: order.indexToken?.visualMultiplier,
    });
    return `${thresholdType} ${price}`;
  }, [order.triggerPrice, order.triggerThresholdType, order.indexToken?.visualMultiplier, marketDecimals]);

  const estimatedPnl = useMemo(() => {
    const entryPrice = position.entryPrice ?? 0n;
    const priceDiff = order.isLong ? order.triggerPrice - entryPrice : entryPrice - order.triggerPrice;

    const pnlUsd = bigMath.mulDiv(priceDiff, order.sizeDeltaUsd, entryPrice);
    const pnlPercentage = position.collateralUsd > 0n ? bigMath.mulDiv(pnlUsd, 10000n, position.collateralUsd) : 0n;

    return { pnlUsd, pnlPercentage };
  }, [order, position]);

  const receiveDisplay = useMemo(() => {
    const receiveUsd = order.sizeDeltaUsd > 0n ? order.sizeDeltaUsd : 0n;
    const receiveToken = order.targetCollateralToken;

    if (!receiveToken) return "—";

    const receiveAmount =
      receiveToken.prices?.minPrice && receiveToken.prices.minPrice > 0n
        ? bigMath.mulDiv(receiveUsd, 10n ** BigInt(receiveToken.decimals), receiveToken.prices.minPrice)
        : 0n;

    return (
      <span>
        {formatBalanceAmount(receiveAmount, receiveToken.decimals, receiveToken.symbol, {
          isStable: receiveToken.isStable,
        })}
        <span className="ml-4 text-typography-secondary">({formatUsd(receiveUsd)})</span>
      </span>
    );
  }, [order]);

  const handleEdit = useCallback(() => {
    // TODO: Implement edit
  }, []);

  const handleCancel = useCallback(() => {
    cancelOrder();
  }, [cancelOrder]);

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
  const [isCancelling, cancelOrder] = useCancelOrder(order);

  const isTakeProfit = isLimitDecreaseOrderType(order.orderType);
  const orderType = isTakeProfit ? t`Take Profit` : t`Stop Loss`;

  const isFullClose = order.sizeDeltaUsd === position.sizeInUsd;

  const sizePercentage = useMemo(() => {
    if (position.sizeInUsd === 0n) return 0n;
    return bigMath.mulDiv(order.sizeDeltaUsd, 10000n, position.sizeInUsd);
  }, [order.sizeDeltaUsd, position.sizeInUsd]);

  const sizeDisplay = useMemo(() => {
    if (isFullClose) {
      return <Trans>Full Position Close</Trans>;
    }
    const percentage = Number(sizePercentage) / 100;
    return (
      <span>
        <span>-{formatUsd(order.sizeDeltaUsd)}</span>
        <span className="ml-4 text-typography-secondary">(-{percentage.toFixed(2)}%)</span>
      </span>
    );
  }, [isFullClose, order.sizeDeltaUsd, sizePercentage]);

  const triggerPriceDisplay = useMemo(() => {
    const thresholdType = order.triggerThresholdType;
    const price = formatUsd(order.triggerPrice, {
      displayDecimals: marketDecimals,
      visualMultiplier: order.indexToken?.visualMultiplier,
    });
    return `${thresholdType} ${price}`;
  }, [order.triggerPrice, order.triggerThresholdType, order.indexToken?.visualMultiplier, marketDecimals]);

  const estimatedPnl = useMemo(() => {
    const entryPrice = position.entryPrice ?? 0n;
    const priceDiff = order.isLong ? order.triggerPrice - entryPrice : entryPrice - order.triggerPrice;

    const pnlUsd = bigMath.mulDiv(priceDiff, order.sizeDeltaUsd, entryPrice);
    const pnlPercentage = position.collateralUsd > 0n ? bigMath.mulDiv(pnlUsd, 10000n, position.collateralUsd) : 0n;

    return { pnlUsd, pnlPercentage };
  }, [order, position]);

  const receiveDisplay = useMemo(() => {
    const receiveUsd = order.sizeDeltaUsd > 0n ? order.sizeDeltaUsd : 0n;
    const receiveToken = order.targetCollateralToken;

    if (!receiveToken) return "—";

    const receiveAmount =
      receiveToken.prices?.minPrice && receiveToken.prices.minPrice > 0n
        ? bigMath.mulDiv(receiveUsd, 10n ** BigInt(receiveToken.decimals), receiveToken.prices.minPrice)
        : 0n;

    return (
      <span>
        {formatBalanceAmount(receiveAmount, receiveToken.decimals, receiveToken.symbol, {
          isStable: receiveToken.isStable,
        })}
        <span className="ml-4 text-typography-secondary">({formatUsd(receiveUsd)})</span>
      </span>
    );
  }, [order]);

  const handleEdit = useCallback(() => {
    onEdit?.(order.key);
  }, [onEdit, order.key]);

  const handleCancel = useCallback(() => {
    cancelOrder();
  }, [cancelOrder]);

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
