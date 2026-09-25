import { Trans } from "@lingui/macro";

import { AppCard, AppCardSection } from "components/AppCard/AppCard";

import {
  SolanaPositionCollateral,
  SolanaPositionLiquidationPrice,
  SolanaPositionNetValue,
  SolanaPositionOrderText,
  SolanaPositionPnl,
  SolanaPositionPoolName,
  SolanaPositionSide,
  SolanaPositionTitle,
} from "./SolanaPositionItem";
import type { SolanaPositionOrders } from "../positions/positionOrders";
import { formatSolanaLeverage, formatSolanaPrice, formatSolanaUsd } from "../positions/solanaPositionFormatters";
import type { SolanaPositionViewModel } from "../positions/types";

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="App-card-row">
      <div className="font-medium text-typography-secondary">{label}</div>
      <div className="numbers">{children}</div>
    </div>
  );
}

/** Mobile card. Read-only: no action section. */
export function SolanaPositionCard({
  position,
  orders,
}: {
  position: SolanaPositionViewModel;
  orders?: SolanaPositionOrders;
}) {
  const activeOrders = orders?.all ?? [];
  return (
    <AppCard dataQa="solana-position-item">
      <AppCardSection>
        <div className="text-body-medium flex items-center gap-8">
          <SolanaPositionTitle position={position} iconSize={16} />
          <div className="text-body-small flex items-center gap-4">
            <span className="rounded-4 leading-1">{formatSolanaLeverage(position.leverage)}</span>
            <SolanaPositionSide position={position} />
          </div>
        </div>
      </AppCardSection>
      <AppCardSection>
        <Row label={<Trans>Pool</Trans>}>
          <SolanaPositionPoolName position={position} />
        </Row>
        <Row label={<Trans>Size</Trans>}>{formatSolanaUsd(position.sizeInUsd)}</Row>
        <Row label={<Trans>Net value</Trans>}>
          <SolanaPositionNetValue position={position} />
        </Row>
        <Row label={<Trans>PnL</Trans>}>
          <SolanaPositionPnl position={position} />
        </Row>
        <Row label={<Trans>Margin</Trans>}>
          <SolanaPositionCollateral position={position} />
        </Row>
      </AppCardSection>
      <AppCardSection>
        <Row label={<Trans>Entry price</Trans>}>{formatSolanaPrice(position.entryPrice)}</Row>
        <Row label={<Trans>Mark price</Trans>}>{formatSolanaPrice(position.markPrice)}</Row>
        <Row label={<Trans>Liquidation price</Trans>}>
          <SolanaPositionLiquidationPrice position={position} />
        </Row>
      </AppCardSection>
      <AppCardSection className="!border-b-0">
        {activeOrders.length === 0 ? (
          <Row label={<Trans>Orders</Trans>}>
            <span className="muted">-</span>
          </Row>
        ) : (
          <>
            <div className="font-medium text-typography-secondary">
              <Trans>Orders</Trans>
            </div>
            <div className="flex flex-col gap-8">
              {activeOrders.map((order) => (
                <SolanaPositionOrderText key={order.key} order={order} />
              ))}
            </div>
          </>
        )}
      </AppCardSection>
    </AppCard>
  );
}
