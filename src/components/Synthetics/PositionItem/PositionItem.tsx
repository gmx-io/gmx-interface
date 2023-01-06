import { Trans, t } from "@lingui/macro";
import PositionDropdown from "components/Exchange/PositionDropdown";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { AggregatedPositionData } from "domain/synthetics/positions";
import { formatUsdAmount } from "domain/synthetics/tokens";

type Props = {
  position: AggregatedPositionData;
  onClosePositionClick: () => void;
  onEditCollateralClick: () => void;
};

export function PositionItem(p: Props) {
  const { position } = p;

  const longText = position?.isLong ? t`Long` : t`Short`;

  return (
    <tr className="Exhange-list-item">
      <td>
        {longText} {position?.indexToken?.symbol}
      </td>
      <td>
        <Tooltip
          handle={formatUsdAmount(position?.netValue)}
          renderContent={() => (
            <div>
              {t`Net Value: Initial Collateral + PnL - Borrow Fee`}
              <br />
              <br />

              <StatsTooltipRow
                label={t`Initial Collateral`}
                value={formatUsdAmount(position?.collateralUsd)}
                showDollar={false}
              />

              <StatsTooltipRow label={t`PnL`} value={formatUsdAmount(position?.pnl)} showDollar={false} />

              <StatsTooltipRow
                label={t`Borrow fee:`}
                value={formatUsdAmount(position?.pendingBorrowingFees?.mul(-1))}
                showDollar={false}
              />
            </div>
          )}
        />
      </td>
      <td>{formatUsdAmount(position.sizeInUsd)}</td>
      <td>{formatUsdAmount(position.collateralUsd)}</td>
      <td>{formatUsdAmount(position.markPrice)}</td>
      <td>{formatUsdAmount(position.entryPrice)}</td>
      <td>{formatUsdAmount(position.liqPrice)}</td>
      <td>
        <button className="Exchange-list-action" onClick={p.onClosePositionClick}>
          <Trans>Close</Trans>
        </button>
      </td>
      <td>
        <PositionDropdown
          handleEditCollateral={p.onEditCollateralClick}
          handleShare={() => null}
          handleMarketSelect={() => null}
        />
      </td>
    </tr>
  );
}
