import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useState, type ReactNode } from "react";

import { formatBalanceAmount } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTr } from "components/Table/Table";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import NewLinkIcon from "img/ic_new_link.svg?react";

import { formatSolanaOrderSize, formatSolanaTriggerPrice } from "../../hooks/orders/solanaOrderFormatters";
import type { SolanaPositionOrderViewModel } from "../../hooks/orders/types";
import type { SolanaPositionOrders } from "../../hooks/positions/positionOrders";
import { canToggleSolanaPositionSize, formatSolanaPositionSize } from "../../hooks/positions/positionSize";
import {
  formatSolanaDisplayedPnl,
  formatSolanaEstimatedLiquidationTime,
  formatSolanaLeverage,
  formatSolanaLiquidationPrice,
  formatSolanaPrice,
  formatSolanaTooltipDeltaUsd,
  formatSolanaTooltipUsd,
  formatSolanaTpSlSummary,
  formatSolanaUsd,
  getSolanaDisplayedLeverage,
  SOLANA_POSITION_DASH,
} from "../../hooks/positions/solanaPositionFormatters";
import type { SolanaPositionViewModel } from "../../hooks/positions/types";
import { SolanaTokenIcon } from "../SolanaTokenIcon";

type CellProps = { position: SolanaPositionViewModel; isLarge?: boolean };

export function SolanaPositionTitle({ position, iconSize }: { position: SolanaPositionViewModel; iconSize: number }) {
  return (
    <span className="inline-flex items-center gap-4 font-medium">
      <SolanaTokenIcon className="PositionList-token-icon" symbol={position.symbol} displaySize={iconSize} />
      {position.displayMarketName}
    </span>
  );
}

/** "SOL/USD [WSOL-USDC]" as in the GMX "Pool" row and tooltip. */
export function SolanaPositionPoolName({ position }: { position: SolanaPositionViewModel }) {
  return (
    <span>
      {position.displayMarketName}{" "}
      <span className="subtext leading-1">{position.poolName ? `[${position.poolName}]` : "..."}</span>
    </span>
  );
}

/**
 * Desktop title: GMX `PositionItem` title tooltip plus a Solscan link to the position account.
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
            <Trans>Click to select, then use the trade box to increase size.</Trans>
            <br />
            <br />
            <Trans>Use the TP/SL button to set TP/SL orders.</Trans>
            <br />
            <br />
            <Trans>Use the "Close" button to reduce your position via market or TWAP orders.</Trans>
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

/** Leverage as GMX shows it, following Settings "Include PnL in leverage display". */
export function SolanaPositionLeverage({
  position,
  isPnlInLeverage,
  className,
}: {
  position: SolanaPositionViewModel;
  isPnlInLeverage: boolean;
  className?: string;
}) {
  return <span className={className}>{formatSolanaLeverage(getSolanaDisplayedLeverage(position, isPnlInLeverage))}</span>;
}

/**
 * GMX `PositionItem` size cell: click toggles between USD and index token amount. The toggle is per
 * position (component state) and is disabled when the token decimals are unknown.
 */
export function useSolanaPositionSizeToggle(position: SolanaPositionViewModel) {
  const [showSizeInTokens, setShowSizeInTokens] = useState(false);
  const canToggle = canToggleSolanaPositionSize(position);
  const toggle = useCallback(() => {
    if (canToggle) setShowSizeInTokens((prev) => !prev);
  }, [canToggle]);
  return {
    text: formatSolanaPositionSize(position, showSizeInTokens),
    onClick: canToggle ? toggle : undefined,
    className: canToggle ? "cursor-pointer select-none" : undefined,
  };
}

function negate(value: bigint | undefined): bigint | undefined {
  return value === undefined ? undefined : -value;
}

function isNonZero(value: bigint | undefined): boolean {
  return value !== undefined && value !== 0n;
}

/** Mirrors GMX `PositionItem.renderNetValue` (the default variant without "PnL after all fees"). */
export function SolanaPositionNetValue({ position, isLarge = true }: CellProps) {
  if (position.netValue === undefined) return <SolanaUnavailableValue position={position} />;
  return (
    <TooltipWithPortal
      handle={formatSolanaUsd(position.netValue)}
      handleClassName="numbers"
      position={isLarge ? "bottom-start" : "bottom-end"}
      content={
        <div>
          <Trans>Position value after PnL and accrued fees</Trans>
          <br />
          <br />
          <StatsTooltipRow
            label={t`Margin before borrow/funding`}
            value={formatSolanaTooltipUsd(position.collateralValue)}
            valueClassName="numbers"
            showDollar={false}
          />
          <StatsTooltipRow
            label={t`PnL`}
            value={formatSolanaTooltipDeltaUsd(position.pendingPnl)}
            valueClassName="numbers"
            showDollar={false}
            textClassName={getPositiveOrNegativeClass(position.pendingPnl)}
          />
          <StatsTooltipRow
            label={t`Borrow fee`}
            value={formatSolanaTooltipUsd(negate(position.pendingBorrowingFee))}
            valueClassName="numbers"
            showDollar={false}
            textClassName={cx({ "text-red-500": isNonZero(position.pendingBorrowingFee) })}
          />
          <StatsTooltipRow
            label={t`Negative funding fee`}
            value={formatSolanaTooltipUsd(negate(position.pendingFundingFee))}
            valueClassName="numbers"
            showDollar={false}
            textClassName={cx({ "text-red-500": isNonZero(position.pendingFundingFee) })}
          />
        </div>
      }
    />
  );
}

/** PnL before fees under the net value (GMX default without the "after all fees" setting). */
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
 * Mirrors GMX `PositionItem.renderCollateral`: the handle is the margin after accrued fees with its token
 * amount underneath. The low-margin warning is not rendered: this list has no reliable max-leverage rule.
 */
export function SolanaPositionCollateral({ position, isLarge = true }: CellProps) {
  if (position.netCollateralValue === undefined) return <SolanaUnavailableValue position={position} />;

  const renderMarginValue = (amount: bigint | undefined, usd: bigint | undefined): ReactNode =>
    position.collateralIsStable || position.collateralDecimals === undefined || amount === undefined ? (
      formatSolanaTooltipUsd(usd)
    ) : (
      <AmountWithUsdBalance
        amount={amount}
        decimals={position.collateralDecimals}
        usd={usd}
        symbol={position.collateralSymbol}
        isStable={position.collateralIsStable}
        usdAsPrimary
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <TooltipWithPortal
        handle={formatSolanaUsd(position.netCollateralValue)}
        handleClassName="numbers"
        position={isLarge ? "bottom-start" : "bottom-end"}
        className="PositionItem-collateral-tooltip"
        content={
          <>
            <StatsTooltipRow
              label={t`Current margin`}
              showDollar={false}
              value={renderMarginValue(position.netCollateralAmount, position.netCollateralValue)}
              valueClassName="numbers"
            />
            <br />
            <StatsTooltipRow
              label={t`Margin before borrow/funding`}
              showDollar={false}
              value={renderMarginValue(position.collateralAmount, position.collateralValue)}
              valueClassName="numbers"
            />
            <StatsTooltipRow
              label={t`Borrow fee`}
              showDollar={false}
              value={formatSolanaTooltipUsd(negate(position.pendingBorrowingFee))}
              valueClassName="numbers"
              textClassName={cx({ "text-red-500": isNonZero(position.pendingBorrowingFee) })}
            />
            <StatsTooltipRow
              label={t`Negative funding fee`}
              showDollar={false}
              value={formatSolanaTooltipDeltaUsd(negate(position.pendingFundingFee))}
              valueClassName="numbers"
              textClassName={cx({ "text-red-500": isNonZero(position.pendingFundingFee) })}
            />
            <br />
            <div className="mb-4 text-typography-primary">
              <Trans>Claimable</Trans>
            </div>
            <StatsTooltipRow
              label={t`Positive funding fee`}
              showDollar={false}
              value={formatSolanaTooltipDeltaUsd(position.pendingClaimableFundingFee)}
              valueClassName="numbers"
              textClassName={cx({
                "text-green-500":
                  position.pendingClaimableFundingFee !== undefined && position.pendingClaimableFundingFee > 0n,
              })}
            />
            <br />
            <div className="mb-4 text-typography-primary">
              <Trans>Estimated daily fees</Trans>
            </div>
            <StatsTooltipRow
              showDollar={false}
              label={t`Borrow fee / day`}
              value={formatSolanaTooltipUsd(position.borrowingFeePerDay)}
              valueClassName="numbers"
              textClassName={cx({
                "text-red-500": position.borrowingFeePerDay !== undefined && position.borrowingFeePerDay < 0n,
              })}
            />
            <StatsTooltipRow
              showDollar={false}
              label={t`Funding fee / day`}
              value={formatSolanaTooltipDeltaUsd(position.fundingFeePerDay)}
              valueClassName="numbers"
              textClassName={getPositiveOrNegativeClass(position.fundingFeePerDay)}
            />
            <br />
            <Trans>Negative funding fees reduce margin and affect liquidation price.</Trans>
            <br />
            <Trans>Positive funding fees are claimable in Claims.</Trans>
          </>
        }
      />
      {position.netCollateralAmount !== undefined && position.collateralDecimals !== undefined && (
        <div className="muted text-body-small numbers">
          (
          {formatBalanceAmount(position.netCollateralAmount, position.collateralDecimals, position.collateralSymbol, {
            isStable: position.collateralIsStable,
          })}
          )
        </div>
      )}
    </div>
  );
}

function getNoLiquidationPriceWarning(position: SolanaPositionViewModel): string | undefined {
  const symbol = position.collateralSymbol;
  const indexName = position.symbol;
  switch (position.noLiquidationPriceReason) {
    case "short-collateral-covers-size":
      return t`Your ${symbol} margin exceeds the ${indexName} short position size. Margin value rises with the index, covering any losses—no liquidation price.`;
    case "long-stable-collateral-covers-size":
      return t`Your ${symbol} margin exceeds the ${indexName} long position size. Stable margin covers any losses—no liquidation price.`;
    default:
      return undefined;
  }
}

/**
 * Mirrors GMX `PositionItem.renderLiquidationPrice` without the off-hours section (no Solana off-hours
 * parameters). The estimate keeps the GMTrade liquidation rule.
 */
export function SolanaPositionLiquidationPrice({ position }: CellProps) {
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
                  <Trans>Liquidation price changes with fees and margin value.</Trans>
                  <br />
                </>
              )}
              <br />
              {warning ? (
                <Trans>
                  Position may still liquidate from fees alone (funding + borrowing), reducing margin over time.
                </Trans>
              ) : (
                <Trans>Position may liquidate from fees alone (funding + borrowing), reducing margin over time.</Trans>
              )}
              <br />
              <br />
              <StatsTooltipRow
                label={t`Estimated time to liquidation`}
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

/** GMX `PositionItemOrderText`: "TP: > $price: -$size" / "SL: …" / "Limit: < $price: +$size" / "Full position close". */
export function SolanaPositionOrderText({ order }: { order: SolanaPositionOrderViewModel }) {
  const label = order.isIncrease ? t`Limit` : order.kind === 8 ? t`SL` : t`TP`;
  return (
    <div className="text-start">
      {label}: <span className="numbers">{formatSolanaTriggerPrice(order)}</span>:{" "}
      <span className="numbers">{formatSolanaOrderSize(order)}</span>
    </div>
  );
}

/** GMX `PositionItemOrdersLarge` handle "Orders (N)" listing the position's active orders. Read-only. */
export function SolanaPositionActiveOrders({ orders }: { orders: SolanaPositionOrders | undefined }) {
  if (!orders || orders.all.length === 0) return null;
  const count = orders.all.length;
  return (
    <div>
      <TooltipWithPortal
        className="Position-list-active-orders"
        handle={<Trans>Orders ({count})</Trans>}
        position="bottom"
        handleClassName="Exchange-list-info-label Exchange-position-list-orders text-typography-secondary"
        maxAllowedWidth={370}
        tooltipClassName="!z-10 w-[370px]"
        content={
          <div className="flex max-h-[350px] cursor-auto flex-col gap-8 overflow-y-auto leading-base">
            <div className="font-medium">
              <Trans>Active orders</Trans>
            </div>
            {orders.all.map((order) => (
              <SolanaPositionOrderText key={order.key} order={order} />
            ))}
          </div>
        }
      />
    </div>
  );
}

/** GMX TP/SL cell: lowest take-profit and highest stop-loss trigger price with the order count. */
export function SolanaPositionTpSl({ orders }: { orders: SolanaPositionOrders | undefined }) {
  return (
    <div className="flex flex-col numbers">
      <span className="positive">{formatSolanaTpSlSummary(orders?.takeProfit ?? [])}</span>
      <span className="negative">{formatSolanaTpSlSummary(orders?.stopLoss ?? [])}</span>
    </div>
  );
}

/** Missing derived value: a dash, explained by a tooltip when the price feed is the reason. Never a zero. */
export function SolanaUnavailableValue({ position }: { position: SolanaPositionViewModel }) {
  if (!position.priceUnavailable) return <span className="numbers">{SOLANA_POSITION_DASH}</span>;
  return (
    <TooltipWithPortal
      handle={SOLANA_POSITION_DASH}
      handleClassName="numbers"
      position="bottom-start"
      content={<Trans>Price data is not available yet. Values depending on it are hidden.</Trans>}
    />
  );
}

/** Desktop row. Read-only: no selection, no actions. */
export function SolanaPositionItem({
  position,
  orders,
  isPnlInLeverage,
}: {
  position: SolanaPositionViewModel;
  orders?: SolanaPositionOrders;
  isPnlInLeverage: boolean;
}) {
  const size = useSolanaPositionSizeToggle(position);
  return (
    <TableTr hoverable data-qa={`solana-position-item-${position.symbol}-${position.isLong ? "Long" : "Short"}`}>
      <TableTd className="flex">
        <div className="Position-item-info relative">
          <div className="Exchange-list-title">
            <SolanaPositionTitleWithTooltip position={position} />
          </div>
          <div className="Exchange-list-info-label">
            <SolanaPositionLeverage
              position={position}
              isPnlInLeverage={isPnlInLeverage}
              className="muted mr-4 rounded-2 px-2 pb-1 numbers"
            />
            <SolanaPositionSide position={position} />
          </div>
        </div>
      </TableTd>
      <TableTd>
        <div className="flex flex-col gap-4">
          <span className={cx("numbers", size.className)} onClick={size.onClick}>
            {size.text}
          </span>
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
