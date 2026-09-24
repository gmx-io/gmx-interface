import { Trans } from "@lingui/macro";

import { AppCard, AppCardSection } from "components/AppCard/AppCard";

import {
  SolanaPositionCollateral,
  SolanaPositionNetValue,
  SolanaPositionPnl,
  SolanaPositionSide,
  SolanaPositionTitle,
} from "./SolanaPositionItem";
import {
  formatSolanaLeverage,
  formatSolanaLiquidationPrice,
  formatSolanaPrice,
  formatSolanaUsd,
  SOLANA_POSITION_DASH,
} from "../positions/solanaPositionFormatters";
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
export function SolanaPositionCard({ position }: { position: SolanaPositionViewModel }) {
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
        <Row label={<Trans>Size</Trans>}>{formatSolanaUsd(position.sizeInUsd)}</Row>
        <Row label={<Trans>Net value</Trans>}>
          <SolanaPositionNetValue position={position} />
        </Row>
        <Row label={<Trans>PnL after all fees</Trans>}>
          <SolanaPositionPnl position={position} />
        </Row>
        <Row label={<Trans>Margin</Trans>}>
          <SolanaPositionCollateral position={position} />
        </Row>
      </AppCardSection>
      <AppCardSection className="!border-b-0">
        <Row label={<Trans>Entry price</Trans>}>{formatSolanaPrice(position.entryPrice)}</Row>
        <Row label={<Trans>Mark price</Trans>}>{formatSolanaPrice(position.markPrice)}</Row>
        <Row label={<Trans>Liquidation price</Trans>}>{formatSolanaLiquidationPrice(position.liquidationPrice)}</Row>
        <Row label={<Trans>TP/SL</Trans>}>{SOLANA_POSITION_DASH}</Row>
      </AppCardSection>
    </AppCard>
  );
}
