import { t, Trans } from "@lingui/macro";
import cx from "classnames";

import { getPositiveOrNegativeClass } from "lib/utils";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTr } from "components/Table/Table";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import NewLinkIcon from "img/ic_new_link.svg?react";

import { formatSolanaOrderSize, formatSolanaTriggerPrice } from "../../hooks/orders/solanaOrderFormatters";
import type { SolanaPositionOrderViewModel } from "../../hooks/orders/types";
import type { SolanaPositionOrders } from "../../hooks/positions/positionOrders";
import {
  formatSolanaLeverage,
  formatSolanaLiquidationPrice,
  formatSolanaDisplayedPnl,
  formatSolanaEstimatedLiquidationTime,
  formatSolanaPnlAfterFees,
  formatSolanaPrice,
  formatSolanaSignedUsd,
  formatSolanaTokenAmount,
  formatSolanaTpSlSummary,
  formatSolanaUsd,
  SOLANA_POSITION_DASH,
} from "../../hooks/positions/solanaPositionFormatters";
import type { SolanaPositionViewModel } from "../../hooks/positions/types";
import { SolanaTokenIcon } from "../SolanaTokenIcon";

export function SolanaPositionTitle({ position, iconSize }: { position: SolanaPositionViewModel; iconSize: number }) {
  return (
    <span className="inline-flex items-center gap-4 font-medium">
      <SolanaTokenIcon className="PositionList-token-icon" symbol={position.symbol} displaySize={iconSize} />
      {position.displayMarketName}
    </span>
  );
}

/** "SOL/USD [SOL-USDC]" as in the GMTrade "Pool" row and tooltip. */
export function SolanaPositionPoolName({ position }: { position: SolanaPositionViewModel }) {
  return (
    <span>
      {position.displayMarketName}{" "}
      <span className="subtext leading-1">{position.poolName ? `[${position.poolName}]` : "..."}</span>
    </span>
  );
}

/**
 * Desktop title: mirrors the GMTrade title tooltip and its Solscan link to the position account.
 * Only the market name is the tooltip handle, so the underline excludes both icons.
 */
export function SolanaPositionTitleWithTooltip({ position }: { position: SolanaPositionViewModel }) {
  return (
    <span className="inline-flex items-center gap-4 font-medium">
      <SolanaTokenIcon className="PositionList-token-icon" symbol={position.symbol} displaySize={20} />
      <TooltipWithPortal
        handle={position.displayMarketName}
        position="bottom-start"
        content={
          <>
            <StatsTooltipRow
              label={t`Pool`}
              value={<SolanaPositionPoolName position={position} />}
              showDollar={false}
            />
            <br />
            <Trans>Click on the position to select it, then use the trade box to increase it.</Trans>
            <br />
            <br />
            <Trans>Use the "Close" button to reduce your position.</Trans>
          </>
        }
      />
      <ExternalLink
        href={`https://solscan.io/account/${position.positionAddress}`}
        className="ml-2 inline-flex items-center !no-underline hover:opacity-80"
      >
        <NewLinkIcon className="size-12" aria-label={t`View in explorer`} />
      </ExternalLink>
    </span>
  );
}

export function SolanaPositionSide({ position }: { position: SolanaPositionViewModel }) {
  return (
    <span className={cx({ positive: position.isLong, negative: !position.isLong })}>
      {position.isLong ? t`Long` : t`Short`}
    </span>
  );
}

function negate(value: bigint | undefined): bigint | undefined {
  return value === undefined ? undefined : -value;
}

/** Mirrors gmx-solana-interface PositionItem.tsx `renderNetValue`. */
export function SolanaPositionNetValue({ position }: { position: SolanaPositionViewModel }) {
  if (position.netValue === undefined) return <span className="numbers">{SOLANA_POSITION_DASH}</span>;
  return (
    <TooltipWithPortal
      handle={formatSolanaUsd(position.netValue)}
      handleClassName="numbers"
      position="bottom-start"
      content={
        <>
          <Trans>Net Value: Initial Collateral + PnL - Borrowing Fee - Negative Funding Fee - Close Fee</Trans>
          <br />
          <br />
          <StatsTooltipRow
            label={t`Initial Collateral`}
            value={formatSolanaUsd(position.collateralValue)}
            showDollar={false}
            valueClassName="numbers"
          />
          <StatsTooltipRow
            label={t`PnL`}
            value={formatSolanaSignedUsd(position.pendingPnl)}
            showDollar={false}
            valueClassName="numbers"
            textClassName={getPositiveOrNegativeClass(position.pendingPnl)}
          />
          <StatsTooltipRow
            label={t`Accrued Borrowing Fee`}
            value={formatSolanaSignedUsd(negate(position.pendingBorrowingFee))}
            showDollar={false}
            valueClassName="numbers"
            textClassName={cx({
              "text-red-500": position.pendingBorrowingFee !== undefined && position.pendingBorrowingFee !== 0n,
            })}
          />
          <StatsTooltipRow
            label={t`Accrued Negative Funding Fee`}
            value={formatSolanaSignedUsd(negate(position.pendingFundingFee))}
            showDollar={false}
            valueClassName="numbers"
            textClassName={cx({
              "text-red-500": position.pendingFundingFee !== undefined && position.pendingFundingFee !== 0n,
            })}
          />
          <StatsTooltipRow
            label={t`Close Fee`}
            value={formatSolanaSignedUsd(negate(position.closeOrderFee))}
            showDollar={false}
            valueClassName="numbers"
            textClassName="text-red-500"
          />
          <br />
          <StatsTooltipRow
            label={t`PnL After Fees`}
            value={formatSolanaPnlAfterFees(position)}
            showDollar={false}
            valueClassName="numbers"
            textClassName={getPositiveOrNegativeClass(position.pnlAfterFees)}
          />
        </>
      }
    />
  );
}

/** PnL before fees under the net value, as GMTrade renders it by default. */
export function SolanaPositionPnl({ position }: { position: SolanaPositionViewModel }) {
  const pnl = position.pendingPnl;
  return (
    <span
      className={cx("text-body-small flex items-center gap-2 numbers", {
        positive: pnl !== undefined && pnl > 0n,
        negative: pnl !== undefined && pnl < 0n,
        muted: pnl === undefined || pnl === 0n,
      })}
    >
      {formatSolanaDisplayedPnl(position)}
    </span>
  );
}

/**
 * Mirrors gmx-solana-interface PositionItem.tsx `renderCollateral`: the handle is the margin after
 * accrued fees, with its token amount underneath. The low-collateral warning of the reference is
 * not rendered (it needs open-interest data this list does not load).
 */
export function SolanaPositionCollateral({ position }: { position: SolanaPositionViewModel }) {
  const initialCollateralAmount = formatSolanaTokenAmount(
    position.collateralAmount,
    position.collateralDecimals,
    position.collateralSymbol
  );
  if (position.netCollateralValue === undefined) return <span className="numbers">{initialCollateralAmount}</span>;
  return (
    <div className="flex flex-col gap-4">
      <TooltipWithPortal
        handle={formatSolanaUsd(position.netCollateralValue)}
        handleClassName="numbers"
        position="bottom-start"
        className="PositionItem-collateral-tooltip"
        content={
          <>
            <StatsTooltipRow
              label={t`Initial Collateral`}
              value={`${initialCollateralAmount} (${formatSolanaUsd(position.collateralValue)})`}
              showDollar={false}
              valueClassName="numbers"
            />
            <br />
            <StatsTooltipRow
              label={t`Accrued Borrowing Fee`}
              value={formatSolanaSignedUsd(negate(position.pendingBorrowingFee))}
              showDollar={false}
              valueClassName="numbers"
              textClassName={cx({
                "text-red-500": position.pendingBorrowingFee !== undefined && position.pendingBorrowingFee !== 0n,
              })}
            />
            <StatsTooltipRow
              label={t`Accrued Negative Funding Fee`}
              value={formatSolanaSignedUsd(negate(position.pendingFundingFee))}
              showDollar={false}
              valueClassName="numbers"
              textClassName={cx({
                "text-red-500": position.pendingFundingFee !== undefined && position.pendingFundingFee !== 0n,
              })}
            />
            <StatsTooltipRow
              label={t`Accrued Positive Funding Fee`}
              value={formatSolanaSignedUsd(position.pendingClaimableFundingFee)}
              showDollar={false}
              valueClassName="numbers"
              textClassName={cx({
                "text-green-500":
                  position.pendingClaimableFundingFee !== undefined && position.pendingClaimableFundingFee > 0n,
              })}
            />
            <br />
            <StatsTooltipRow
              label={t`Current Borrowing Fee / Day`}
              value={formatSolanaUsd(position.borrowingFeePerDay)}
              showDollar={false}
              valueClassName="numbers"
              textClassName={cx({
                "text-red-500": position.borrowingFeePerDay !== undefined && position.borrowingFeePerDay < 0n,
              })}
            />
            <StatsTooltipRow
              label={t`Current Funding Fee / Day`}
              value={formatSolanaSignedUsd(position.fundingFeePerDay)}
              showDollar={false}
              valueClassName="numbers"
              textClassName={getPositiveOrNegativeClass(position.fundingFeePerDay)}
            />
            <br />
            <Trans>Use the edit collateral icon to deposit or withdraw collateral.</Trans>
            <br />
            <br />
            <Trans>
              Negative funding fees and borrowing fees are settled against the collateral automatically and will
              influence the time to liquidation, as shown under the liquidation price tooltip.
            </Trans>
            <br />
            <br />
            <Trans>
              Positive funding fees are automatically claimed when the position is adjusted through any operation.
            </Trans>
          </>
        }
      />
      {position.netCollateralAmount !== undefined && (
        <span className="muted text-body-small numbers">
          (
          {formatSolanaTokenAmount(
            position.netCollateralAmount,
            position.collateralDecimals,
            position.collateralSymbol
          )}
          )
        </span>
      )}
    </div>
  );
}

function getNoLiquidationPriceWarning(position: SolanaPositionViewModel): string | undefined {
  const symbol = position.collateralSymbol;
  const indexName = position.symbol;
  switch (position.noLiquidationPriceReason) {
    case "short-collateral-covers-size":
      return t`Since your position's collateral is in ${symbol}, with an initial value higher than the ${indexName} short position size, the collateral value will increase to cover any negative PnL, so there is no liquidation price.`;
    case "long-stable-collateral-covers-size":
      return t`Since your position's collateral is in ${symbol}, with an initial value higher than the ${indexName} long position size, the collateral value will cover any negative PnL, so there is no liquidation price.`;
    default:
      return undefined;
  }
}

/** Mirrors gmx-solana-interface PositionItem.tsx `renderLiquidationPrice` (tooltip only, no actions). */
export function SolanaPositionLiquidationPrice({ position }: { position: SolanaPositionViewModel }) {
  const handle = formatSolanaLiquidationPrice(position.liquidationPrice);
  const warning = getNoLiquidationPriceWarning(position);
  const hours = position.estimatedLiquidationHours;
  if (!warning && hours === undefined) return <span className="numbers">{handle}</span>;
  return (
    <TooltipWithPortal
      handle={handle}
      handleClassName={cx("numbers", {
        "LiqPrice-soft-warning": hours !== undefined && hours < 24n * 7n,
        "LiqPrice-hard-warning": hours !== undefined && hours < 24n,
      })}
      position="bottom-end"
      content={
        <>
          {warning && <div>{warning}</div>}
          {hours !== undefined && (
            <div>
              {!warning && (
                <>
                  <Trans>Liquidation price is influenced by fees and collateral value.</Trans>
                  <br />
                </>
              )}
              <br />
              {warning ? (
                <Trans>
                  This position could still be liquidated, excluding any price movement, due to funding and borrowing
                  fee rates reducing the position's collateral over time.
                </Trans>
              ) : (
                <Trans>
                  This position could be liquidated, excluding any price movement, due to funding and borrowing fee
                  rates reducing the position's collateral over time.
                </Trans>
              )}
              <br />
              <br />
              <StatsTooltipRow
                label={t`Estimated Time to Liquidation`}
                value={formatSolanaEstimatedLiquidationTime(hours)}
                showDollar={false}
                valueClassName="numbers"
              />
            </div>
          )}
        </>
      }
    />
  );
}

/** GMTrade `PositionItemOrderText`: "TP: > $price: -$size" / "SL: …" / "Limit: < $price: +$size". */
export function SolanaPositionOrderText({ order }: { order: SolanaPositionOrderViewModel }) {
  const label = order.isIncrease ? t`Limit` : order.kind === 8 ? t`SL` : t`TP`;
  return (
    <div className="text-start text-typography-secondary numbers">
      {label}: {formatSolanaTriggerPrice(order)}: <span>{formatSolanaOrderSize(order)}</span>
    </div>
  );
}

/** GMTrade size-cell "Orders (N)" handle listing the position's active orders. Read-only: no edit / cancel. */
export function SolanaPositionActiveOrders({ orders }: { orders: SolanaPositionOrders | undefined }) {
  if (!orders || orders.all.length === 0) return null;
  const count = orders.all.length;
  return (
    <TooltipWithPortal
      handle={<Trans>Orders ({count})</Trans>}
      handleClassName="Exchange-list-info-label text-typography-secondary"
      position="bottom-start"
      maxAllowedWidth={370}
      content={
        <div className="flex max-h-[350px] flex-col gap-10 overflow-y-auto">
          <div>
            <Trans>Active Orders</Trans>
          </div>
          {orders.all.map((order) => (
            <SolanaPositionOrderText key={order.key} order={order} />
          ))}
        </div>
      }
    />
  );
}

/** GMTrade `RenderTpl`: lowest take-profit and highest stop-loss trigger price with the order count. */
export function SolanaPositionTpSl({ orders }: { orders: SolanaPositionOrders | undefined }) {
  return (
    <div className="flex flex-col numbers">
      <span className="positive">{formatSolanaTpSlSummary(orders?.takeProfit ?? [])}</span>
      <span className="negative">{formatSolanaTpSlSummary(orders?.stopLoss ?? [])}</span>
    </div>
  );
}

export function SolanaPriceUnavailableHint({ position }: { position: SolanaPositionViewModel }) {
  if (!position.priceUnavailable) return null;
  return (
    <TooltipWithPortal
      handle={<span className="muted">{SOLANA_POSITION_DASH}</span>}
      position="bottom-start"
      content={<Trans>Price data is not available yet. Values depending on it are hidden.</Trans>}
    />
  );
}

/** Desktop row. Read-only: no click handlers, no actions. */
export function SolanaPositionItem({
  position,
  orders,
}: {
  position: SolanaPositionViewModel;
  orders?: SolanaPositionOrders;
}) {
  return (
    <TableTr data-qa={`solana-position-item-${position.symbol}-${position.isLong ? "Long" : "Short"}`}>
      <TableTd className="flex">
        <div className="Position-item-info relative">
          <div className="Exchange-list-title">
            <SolanaPositionTitleWithTooltip position={position} />
          </div>
          <div className="Exchange-list-info-label">
            <span className="muted mr-4 rounded-2 px-2 pb-1 numbers">{formatSolanaLeverage(position.leverage)}</span>
            <SolanaPositionSide position={position} />
          </div>
        </div>
      </TableTd>
      <TableTd>
        <div className="flex flex-col gap-4">
          <span className="numbers">{formatSolanaUsd(position.sizeInUsd)}</span>
          <SolanaPositionActiveOrders orders={orders} />
        </div>
      </TableTd>
      <TableTd>
        <div className="flex flex-col gap-4">
          <SolanaPositionNetValue position={position} />
          <SolanaPositionPnl position={position} />
        </div>
      </TableTd>
      <TableTd>
        <SolanaPositionCollateral position={position} />
      </TableTd>
      <TableTd>
        <span className="numbers">{formatSolanaPrice(position.entryPrice)}</span>
      </TableTd>
      <TableTd>
        <span className="numbers">{formatSolanaPrice(position.markPrice)}</span>
      </TableTd>
      <TableTd>
        <SolanaPositionLiquidationPrice position={position} />
      </TableTd>
      <TableTd className="text-left">
        <SolanaPositionTpSl orders={orders} />
      </TableTd>
    </TableTr>
  );
}
