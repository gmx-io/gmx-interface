import { Trans } from "@lingui/macro";
import cx from "classnames";

import { AppCard, AppCardSection } from "components/AppCard/AppCard";

import {
  SolanaPositionCollateral,
  SolanaPositionLeverage,
  SolanaPositionLiquidationPrice,
  SolanaPositionNetValue,
  SolanaPositionOrderText,
  SolanaPositionPnl,
  SolanaPositionPoolName,
  SolanaPositionSide,
  SolanaPositionTitle,
  useSolanaPositionSizeToggle,
} from "./SolanaPositionItem";
import type { SolanaPositionOrders } from "../../hooks/positions/positionOrders";
import { formatSolanaPrice } from "../../hooks/positions/solanaPositionFormatters";
import type { SolanaPositionViewModel } from "../../hooks/positions/types";

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="App-card-row">
      <div className="font-medium text-typography-secondary">{label}</div>
      <div className="numbers">{children}</div>
    </div>
  );
}

/** Mobile card (GMX `PositionItem.renderSmall` layout). Read-only: no action section. */
export function SolanaPositionCard({
  position,
  orders,
  isPnlInLeverage,
}: {
  position: SolanaPositionViewModel;
  orders?: SolanaPositionOrders;
  isPnlInLeverage: boolean;
}) {
  const activeOrders = orders?.all ?? [];
  const size = useSolanaPositionSizeToggle(position);
  return (
    <AppCard dataQa="solana-position-item">
      <AppCardSection>
        <div className="text-body-medium flex items-center gap-8">
          <SolanaPositionTitle position={position} iconSize={16} />
          <div className="text-body-small flex items-center gap-4">
            <SolanaPositionLeverage position={position} isPnlInLeverage={isPnlInLeverage} className="rounded-4 leading-1" />
            <SolanaPositionSide position={position} />
          </div>
        </div>
      </AppCardSection>
      <AppCardSection>
        <Row label={<Trans>Pool</Trans>}>
          <SolanaPositionPoolName position={position} />
        </Row>
        <div className="App-card-row">
          <div className={cx("font-medium text-typography-secondary", size.className)} onClick={size.onClick}>
            <Trans>Size</Trans>
          </div>
          <div className={cx("numbers", size.className)} onClick={size.onClick}>
            {size.text}
          </div>
        </div>
        <Row label={<Trans>Net value</Trans>}>
          <SolanaPositionNetValue position={position} isLarge={false} />
        </Row>
        <Row label={<Trans>PnL</Trans>}>
          <SolanaPositionPnl position={position} />
        </Row>
        <Row label={<Trans>Margin</Trans>}>
          <SolanaPositionCollateral position={position} isLarge={false} />
        </Row>
      </AppCardSection>
      <AppCardSection>
        <Row label={<Trans>Entry price</Trans>}>{formatSolanaPrice(position.entryPrice)}</Row>
        <Row label={<Trans>Mark price</Trans>}>{formatSolanaPrice(position.markPrice)}</Row>
        <Row label={<Trans>Liquidation price</Trans>}>
          <SolanaPositionLiquidationPrice position={position} isLarge={false} />
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
