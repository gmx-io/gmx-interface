import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";

import { AppCard, AppCardSection } from "components/AppCard/AppCard";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTr } from "components/Table/Table";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import NewLinkIcon from "img/ic_new_link.svg?react";

import { SolanaTokenIcon } from "./SolanaTokenIcon";
import {
  formatSolanaAcceptablePrice,
  formatSolanaCollateralDelta,
  formatSolanaMarkPrice,
  formatSolanaOrderPrice,
  formatSolanaOrderSize,
  formatSolanaSwapMinOutput,
  formatSolanaTriggerPrice,
  getSolanaCollateralDeltaLabel,
} from "../orders/solanaOrderFormatters";
import type { SolanaOrderViewModel } from "../orders/types";

type Props = { order: SolanaOrderViewModel };

/** Order account on Solscan, same affordance as the Position column (GMTrade `getAddressUrl`). */
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
 * Same layout as `MarketWithDirectionLabel` / `SwapMarketLabel`, but with `SolanaTokenIcon` so GMTrade
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
  return (
    <span className="inline-flex items-center gap-4 leading-base">
      <SolanaTokenIcon symbol={order.symbol} displaySize={20} className="size-20 !align-[-3px]" />
      <span className="font-medium text-typography-primary">{order.displayMarketName}</span>
      <span className={cx(order.isLong ? "text-green-500" : "text-red-500")}>{order.isLong ? t`Long` : t`Short`}</span>
      <SolanaOrderExplorerLink order={order} />
    </span>
  );
}

/** Order type; when GMTrade's read-only validation finds issues, a dashed underline with the messages. */
export function SolanaOrderTypeCell({ order }: Props) {
  const { i18n } = useLingui();
  const label = i18n._(order.typeLabel);
  if (order.errors.length === 0) return <span>{label}</span>;
  return (
    <TooltipWithPortal
      handle={label}
      handleClassName="cursor-help underline decoration-dashed decoration-1 underline-offset-2"
      variant="none"
      position="bottom-start"
      content={
        <>
          {order.errors.map((error) => (
            <div key={error.key}>{i18n._(error.message)}</div>
          ))}
        </>
      }
    />
  );
}

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
  return (
    <TooltipWithPortal
      handle={size}
      handleClassName="numbers"
      position="bottom-start"
      content={
        <StatsTooltipRow
          label={getSolanaCollateralDeltaLabel(order)}
          value={formatSolanaCollateralDelta(order)}
          showDollar={false}
        />
      }
    />
  );
}

export function SolanaOrderTriggerPriceCell({ order }: Props) {
  const text = formatSolanaTriggerPrice(order);
  if (order.category === "swap") {
    return (
      <TooltipWithPortal
        handle={text}
        handleClassName="numbers"
        position="bottom-end"
        content={
          <Trans>
            You will receive at least {formatSolanaSwapMinOutput(order)} if this order is executed. This price is being
            updated in real time based on swap fees and price impact.
          </Trans>
        }
      />
    );
  }
  if (order.category === "collateral") return <span className="numbers">{text}</span>;
  return (
    <TooltipWithPortal
      handle={text}
      handleClassName="numbers"
      position="bottom-end"
      content={<StatsTooltipRow label={t`Acceptable Price`} value={formatSolanaAcceptablePrice(order)} showDollar={false} />}
    />
  );
}

function SolanaOrderExecutionNote() {
  return (
    <Trans>
      Note that there may be rare cases where the order cannot be executed, for example, if the chain is down and no
      oracle reports are produced or if the price impact exceeds your acceptable price.
    </Trans>
  );
}

export function SolanaOrderMarkPriceCell({ order }: Props) {
  const text = formatSolanaMarkPrice(order);
  if (order.category !== "position") return <span className="numbers">{text}</span>;
  const content = (
    <>
      <p>
        {order.isMarketOrder ? (
          <Trans>The order will be executed at the next available oracle price.</Trans>
        ) : (
          <Trans>
            The order will be executed when the oracle price is {order.triggerThreshold}{" "}
            {formatSolanaOrderPrice(order.triggerPrice, order.isForexPrecision)}.
          </Trans>
        )}
      </p>
      <br />
      <p>
        <SolanaOrderExecutionNote />
      </p>
    </>
  );
  return <TooltipWithPortal handle={text} handleClassName="numbers" position="bottom-end" content={content} />;
}

/** Desktop row. Read-only: no click handlers, no selection, no actions. */
export function SolanaOrderRow({ order }: Props) {
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
        <SolanaOrderTriggerPriceCell order={order} />
      </TableTd>
      <TableTd>
        <SolanaOrderMarkPriceCell order={order} />
      </TableTd>
      {/* Reserved Edit / Close slots (GMTrade layout). No actions in the read-only build. */}
      <TableTd data-qa="solana-order-edit-slot" />
      <TableTd data-qa="solana-order-close-slot" />
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

/** Mobile card. Read-only: no action section. */
export function SolanaOrderCard({ order }: Props) {
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
          <SolanaOrderTriggerPriceCell order={order} />
        </Row>
        <Row label={<Trans>Mark price</Trans>}>
          <SolanaOrderMarkPriceCell order={order} />
        </Row>
      </AppCardSection>
    </AppCard>
  );
}
