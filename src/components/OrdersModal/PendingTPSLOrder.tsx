import { Trans } from "@lingui/macro";

import { isLimitDecreaseOrderType } from "domain/synthetics/orders";
import type { PositionInfo } from "domain/synthetics/positions";
import { parseContractPrice, type TokenData } from "domain/synthetics/tokens";
import type { PendingTpSlOrder } from "domain/tpsl/types";
import { isFullPositionCloseSizeDeltaUsd } from "domain/tpsl/utils";
import { formatUsd } from "lib/numbers";

import { TableTd, TableTr } from "components/Table/Table";

import SpinnerIcon from "img/ic_spinner.svg?react";

export function PendingTPSLOrder({
  order,
  position,
  indexToken,
  marketDecimals,
  isMobile,
}: {
  order: PendingTpSlOrder;
  position?: PositionInfo;
  indexToken?: TokenData;
  marketDecimals: number | undefined;
  isMobile: boolean;
}) {
  const orderType = isLimitDecreaseOrderType(order.orderType) ? <Trans>Take-Profit</Trans> : <Trans>Stop-Loss</Trans>;
  const size = isFullPositionCloseSizeDeltaUsd(order.sizeDeltaUsd, position?.sizeInUsd) ? (
    <Trans>Full position close</Trans>
  ) : (
    `-${formatUsd(order.sizeDeltaUsd)}`
  );
  const triggerPrice = indexToken
    ? formatUsd(parseContractPrice(order.triggerPrice, indexToken.decimals), {
        displayDecimals: marketDecimals,
        visualMultiplier: indexToken.visualMultiplier,
      })
    : "—";
  const status = (
    <span role="status" className="inline-flex items-center gap-4 text-typography-secondary">
      <SpinnerIcon className="size-16 animate-spin" />
      <Trans>Creating...</Trans>
    </span>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col gap-10 border-b-1/2 border-slate-600 p-16 last:border-b-0" aria-busy="true">
        <div className="flex items-center justify-between">
          <span>{orderType}</span>
          {status}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-typography-secondary">
            <Trans>Size (% of position)</Trans>
          </span>
          <span className="numbers">{size}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-typography-secondary">
            <Trans>Trigger price</Trans>
          </span>
          <span className="numbers">{triggerPrice}</span>
        </div>
      </div>
    );
  }

  return (
    <TableTr aria-busy="true">
      <TableTd>{orderType}</TableTd>
      <TableTd>
        <span className="numbers">{size}</span>
      </TableTd>
      <TableTd>
        <span className="numbers">{triggerPrice}</span>
      </TableTd>
      <TableTd colSpan={3}>{status}</TableTd>
    </TableTr>
  );
}
