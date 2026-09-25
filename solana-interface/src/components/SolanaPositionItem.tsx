import { t, Trans } from "@lingui/macro";
import cx from "classnames";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTr } from "components/Table/Table";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { SolanaTokenIcon } from "./SolanaTokenIcon";
import {
  formatSolanaLeverage,
  formatSolanaLiquidationPrice,
  formatSolanaPnl,
  formatSolanaPrice,
  formatSolanaTokenAmount,
  formatSolanaUsd,
  SOLANA_POSITION_DASH,
} from "../positions/solanaPositionFormatters";
import type { SolanaPositionViewModel } from "../positions/types";

export function SolanaPositionTitle({ position, iconSize }: { position: SolanaPositionViewModel; iconSize: number }) {
  return (
    <span className="inline-flex items-center gap-4 font-medium">
      <SolanaTokenIcon className="PositionList-token-icon" symbol={position.symbol} displaySize={iconSize} />
      {position.displayMarketName}
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

export function SolanaPositionNetValue({ position }: { position: SolanaPositionViewModel }) {
  if (position.netValue === undefined) return <span className="numbers">{SOLANA_POSITION_DASH}</span>;
  return (
    <TooltipWithPortal
      handle={formatSolanaUsd(position.netValue)}
      handleClassName="numbers"
      position="bottom-start"
      content={
        <>
          <Trans>Net value: margin + PnL - fees</Trans>
          <br />
          <br />
          <StatsTooltipRow label={t`Margin`} value={formatSolanaUsd(position.collateralValue)} showDollar={false} />
          <StatsTooltipRow label={t`PnL`} value={formatSolanaUsd(position.pendingPnl)} showDollar={false} />
          <StatsTooltipRow
            label={t`Accrued borrow fee`}
            value={formatSolanaUsd(position.pendingBorrowingFee)}
            showDollar={false}
          />
          <StatsTooltipRow
            label={t`Accrued funding fee`}
            value={formatSolanaUsd(position.pendingFundingFee)}
            showDollar={false}
          />
          <StatsTooltipRow label={t`Close fee`} value={formatSolanaUsd(position.closeOrderFee)} showDollar={false} />
        </>
      }
    />
  );
}

export function SolanaPositionPnl({ position }: { position: SolanaPositionViewModel }) {
  const pnl = position.pnlAfterFees;
  return (
    <span
      className={cx("text-body-small flex items-center gap-2 numbers", {
        positive: pnl !== undefined && pnl > 0n,
        negative: pnl !== undefined && pnl < 0n,
        muted: pnl === undefined || pnl === 0n,
      })}
    >
      {formatSolanaPnl(position)}
    </span>
  );
}

export function SolanaPositionCollateral({ position }: { position: SolanaPositionViewModel }) {
  const tokenAmount = formatSolanaTokenAmount(
    position.collateralAmount,
    position.collateralDecimals,
    position.collateralSymbol
  );
  if (position.collateralValue === undefined) return <span className="numbers">{tokenAmount}</span>;
  return (
    <TooltipWithPortal
      handle={formatSolanaUsd(position.collateralValue)}
      handleClassName="numbers"
      position="bottom-start"
      content={<StatsTooltipRow label={t`Margin`} value={tokenAmount} showDollar={false} />}
    />
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
export function SolanaPositionItem({ position }: { position: SolanaPositionViewModel }) {
  return (
    <TableTr data-qa={`solana-position-item-${position.symbol}-${position.isLong ? "Long" : "Short"}`}>
      <TableTd className="flex">
        <div className="Position-item-info relative">
          <div className="Exchange-list-title">
            <SolanaPositionTitle position={position} iconSize={20} />
          </div>
          <div className="Exchange-list-info-label">
            <span className="muted mr-4 rounded-2 px-2 pb-1 numbers">{formatSolanaLeverage(position.leverage)}</span>
            <SolanaPositionSide position={position} />
          </div>
        </div>
      </TableTd>
      <TableTd>
        <span className="numbers">{formatSolanaUsd(position.sizeInUsd)}</span>
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
        <span className="numbers">{formatSolanaLiquidationPrice(position.liquidationPrice)}</span>
      </TableTd>
      <TableTd className="text-left">
        <span className="muted">{SOLANA_POSITION_DASH}</span>
      </TableTd>
    </TableTr>
  );
}
