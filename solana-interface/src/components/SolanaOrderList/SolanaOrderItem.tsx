import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";

import { useIsTruncated } from "lib/useIsTruncated";

import { AppCard, AppCardSection } from "components/AppCard/AppCard";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTr } from "components/Table/Table";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import NewLinkIcon from "img/ic_new_link.svg?react";

import {
  formatSolanaAcceptablePrice,
  formatSolanaCollateralSwapNote,
  formatSolanaMarkPrice,
  formatSolanaOrderExecutionText,
  formatSolanaOrderMargin,
  formatSolanaOrderSize,
  formatSolanaSwapMinOutput,
  formatSolanaSwapReceiveText,
  formatSolanaTriggerPrice,
  getSolanaCollateralDeltaLabel,
} from "../../hooks/orders/solanaOrderFormatters";
import type { SolanaOrderViewModel } from "../../hooks/orders/types";
import { SolanaTokenIcon } from "../SolanaTokenIcon";

/** Same as GMX `OrderItem` `TOOLTIP_HANDLE_CLASSNAME`. */
const TOOLTIP_HANDLE_CLASSNAME = "cursor-help underline decoration-dashed decoration-1 underline-offset-2";

type Props = { order: SolanaOrderViewModel };
type CellProps = Props & {
  /** Desktop cells report whether their text is clipped, so the tooltip can repeat the full value. */
  isTruncated?: boolean;
};
type TriggerPriceProps = CellProps & { isSetAcceptablePriceImpactEnabled: boolean };

/** Order account on Solscan, same affordance as the Position column. */
function SolanaOrderExplorerLink({ order }: Props) {
  return (
    <ExternalLink
      href={`https://solscan.io/account/${order.orderAddress}`}
      className="ml-2 inline-flex items-center !no-underline hover:opacity-80"
    >
      <NewLinkIcon className="size-12" aria-label={t`View in explorer`} />
    </ExternalLink>
  );
}

/**
 * Same layout as GMX `MarketWithDirectionLabel` / `SwapMarketLabel`, but with `SolanaTokenIcon` so GMTrade
 * symbols without a GMX icon (or unknown mints shown as addresses) do not crash the row.
 */
export function SolanaOrderMarketCell({ order }: Props) {
  if (order.category === "swap") {
    return (
      <span className="inline-flex items-center gap-4 leading-base">
        <SolanaTokenIcon symbol={order.fromSymbol} displaySize={20} className="relative z-10" />
        <SolanaTokenIcon symbol={order.toSymbol} displaySize={20} className="-ml-10 mr-5" />
        <span className="font-medium text-typography-primary">
          {order.fromSymbol ?? "..."}/{order.toSymbol ?? "..."}
        </span>
        <SolanaOrderExplorerLink order={order} />
      </span>
    );
  }
  const label = (
    <span className="inline-flex items-center gap-4 leading-base">
      <SolanaTokenIcon symbol={order.symbol} displaySize={20} className="size-20 !align-[-3px]" />
      <span className="font-medium text-typography-primary">{order.displayMarketName}</span>
      <span className={cx(order.isLong ? "text-green-500" : "text-red-500")}>{order.isLong ? t`Long` : t`Short`}</span>
    </span>
  );
  return (
    <span className="inline-flex items-center gap-4 leading-base">
      {order.poolName ? (
        <TooltipWithPortal
          handle={label}
          variant="none"
          position="bottom-start"
          content={
            <StatsTooltipRow
              label={t`Market`}
              value={
                <span>
                  {order.displayMarketName} <span className="subtext leading-1">[{order.poolName}]</span>
                </span>
              }
              showDollar={false}
            />
          }
        />
      ) : (
        label
      )}
      <SolanaOrderExplorerLink order={order} />
    </span>
  );
}

/** GMX `OrderItemTypeLabel`: the type, dashed and coloured by the highest error level when checks fail. */
export function SolanaOrderTypeCell({ order }: Props) {
  const { i18n } = useLingui();
  const label = i18n._(order.typeLabel);
  if (order.errors.length === 0) return <span>{label}</span>;
  // Errors are sorted error → warning, so the first one carries the overall level.
  const level = order.errors[0].level;
  return (
    <TooltipWithPortal
      variant="none"
      handle={
        <span
          className={cx(TOOLTIP_HANDLE_CLASSNAME, {
            "text-red-500 decoration-red-500/50": level === "error",
            "text-yellow-300 decoration-yellow-300/50": level === "warning",
          })}
        >
          {label}
        </span>
      }
      content={
        <div className="flex flex-col gap-20">
          {order.errors.map((error) => (
            <div key={error.key}>
              <span className={cx({ "text-red-500": error.level === "error", "text-yellow-300": error.level === "warning" })}>
                {i18n._(error.message)}
              </span>
            </div>
          ))}
        </div>
      }
    />
  );
}

/** GMX `OrderSize`: swap orders show both legs; position orders open the margin tooltip. */
export function SolanaOrderSizeCell({ order }: Props) {
  const size = formatSolanaOrderSize(order);
  if (order.category === "swap") {
    return (
      <span className="inline-flex flex-wrap items-center gap-4 numbers">
        <span>{size}</span>
        <SolanaTokenIcon symbol={order.fromSymbol} displaySize={18} />
        <Trans>to</Trans>
        <span>{formatSolanaSwapMinOutput(order)}</span>
        <SolanaTokenIcon symbol={order.toSymbol} displaySize={18} />
      </span>
    );
  }
  const swapNote = formatSolanaCollateralSwapNote(order);
  return (
    <TooltipWithPortal
      handle={<span className="numbers">{size}</span>}
      position="bottom-start"
      maxAllowedWidth={400}
      variant="none"
      content={
        <>
          <StatsTooltipRow label={getSolanaCollateralDeltaLabel(order)} value={formatSolanaOrderMargin(order)} showDollar={false} />
          {swapNote && <div className="OrderItem-tooltip-row">{swapNote}</div>}
        </>
      }
    />
  );
}

/** Plain text whose tooltip only repeats the full value when the cell clips it (GMX `variant="none"` pattern). */
function TruncationTooltip({ text, isTruncated, className }: { text: string; isTruncated?: boolean; className?: string }) {
  return (
    <TooltipWithPortal
      as="span"
      className={className}
      disabled={!isTruncated}
      handle={text}
      content={text}
      variant="none"
    />
  );
}

/** GMX `TriggerPrice`. The acceptable price only shows with the "Acceptable price impact" setting enabled. */
export function SolanaOrderTriggerPriceCell({ order, isTruncated, isSetAcceptablePriceImpactEnabled }: TriggerPriceProps) {
  const text = formatSolanaTriggerPrice(order);

  if (order.category === "collateral") {
    return (
      <span className="font-medium">
        <Trans>N/A</Trans>
      </span>
    );
  }

  if (order.category === "swap") {
    return (
      <TooltipWithPortal
        as="span"
        position="bottom-end"
        handle={<span className={cx("numbers", TOOLTIP_HANDLE_CLASSNAME)}>{text}</span>}
        renderContent={() => (
          <>
            {isTruncated && <div className="mb-4">{text}</div>}
            {formatSolanaSwapReceiveText(order)}
          </>
        )}
      />
    );
  }

  const showAcceptablePrice = isSetAcceptablePriceImpactEnabled && !order.isBoundaryAcceptablePrice;

  if (order.isMarketOrder) {
    const handle = (
      <span className="font-medium">
        <Trans>N/A</Trans>
      </span>
    );
    return showAcceptablePrice ? (
      <TooltipWithPortal
        position="bottom-end"
        handle={handle}
        content={<StatsTooltipRow label={t`Acceptable price`} value={formatSolanaAcceptablePrice(order)} showDollar={false} />}
      />
    ) : (
      handle
    );
  }

  if (!showAcceptablePrice) return <TruncationTooltip text={text} isTruncated={isTruncated} className="numbers" />;

  return (
    <TooltipWithPortal
      as="span"
      handle={<span className={cx("numbers", TOOLTIP_HANDLE_CLASSNAME)}>{text}</span>}
      position="bottom-end"
      renderContent={() => (
        <>
          {isTruncated && <div className="mb-4">{text}</div>}
          <StatsTooltipRow label={t`Acceptable price`} value={formatSolanaAcceptablePrice(order)} showDollar={false} />
        </>
      )}
    />
  );
}

/** GMX `MarkPrice`: trigger orders explain the execution condition; other orders are plain text. */
export function SolanaOrderMarkPriceCell({ order, isTruncated }: CellProps) {
  const text = formatSolanaMarkPrice(order);
  if (order.category !== "position" || order.isMarketOrder) {
    return <TruncationTooltip text={text} isTruncated={isTruncated} className="numbers" />;
  }
  return (
    <TooltipWithPortal
      as="span"
      handle={<span className={cx("numbers", TOOLTIP_HANDLE_CLASSNAME)}>{text}</span>}
      position="bottom-end"
      renderContent={() => (
        <>
          {isTruncated && <div className="mb-4">{text}</div>}
          {formatSolanaOrderExecutionText(order)}
        </>
      )}
    />
  );
}

/** Desktop row. Read-only: no selection, no actions. */
export function SolanaOrderRow({ order, isSetAcceptablePriceImpactEnabled }: Props & { isSetAcceptablePriceImpactEnabled: boolean }) {
  const [triggerRef, isTriggerTruncated] = useIsTruncated();
  const [markRef, isMarkTruncated] = useIsTruncated();
  return (
    <TableTr hoverable data-qa={`solana-order-item-${order.kind}`}>
      <TableTd>
        <SolanaOrderMarketCell order={order} />
      </TableTd>
      <TableTd>
        <SolanaOrderTypeCell order={order} />
      </TableTd>
      <TableTd>
        <SolanaOrderSizeCell order={order} />
      </TableTd>
      <TableTd>
        <div className="truncate" ref={triggerRef}>
          <SolanaOrderTriggerPriceCell
            order={order}
            isTruncated={isTriggerTruncated}
            isSetAcceptablePriceImpactEnabled={isSetAcceptablePriceImpactEnabled}
          />
        </div>
      </TableTd>
      <TableTd>
        <div className="truncate" ref={markRef}>
          <SolanaOrderMarkPriceCell order={order} isTruncated={isMarkTruncated} />
        </div>
      </TableTd>
    </TableTr>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="App-card-row">
      <div className="font-medium text-typography-secondary">{label}</div>
      <div className="numbers">{children}</div>
    </div>
  );
}

/** Mobile card (GMX `OrderItemSmall` layout). Read-only: no action section. */
export function SolanaOrderCard({ order, isSetAcceptablePriceImpactEnabled }: Props & { isSetAcceptablePriceImpactEnabled: boolean }) {
  return (
    <AppCard dataQa="solana-order-item">
      <AppCardSection>
        <div className="text-body-medium flex items-center gap-8">
          <SolanaOrderMarketCell order={order} />
        </div>
      </AppCardSection>
      <AppCardSection className="!border-b-0">
        <Row label={<Trans>Order type</Trans>}>
          <SolanaOrderTypeCell order={order} />
        </Row>
        <Row label={<Trans>Size</Trans>}>
          <SolanaOrderSizeCell order={order} />
        </Row>
        <Row label={<Trans>Trigger price</Trans>}>
          <SolanaOrderTriggerPriceCell order={order} isSetAcceptablePriceImpactEnabled={isSetAcceptablePriceImpactEnabled} />
        </Row>
        <Row label={<Trans>Mark price</Trans>}>
          <SolanaOrderMarkPriceCell order={order} />
        </Row>
      </AppCardSection>
    </AppCard>
  );
}
