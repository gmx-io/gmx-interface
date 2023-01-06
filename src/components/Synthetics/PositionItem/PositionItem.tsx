import { Trans, t } from "@lingui/macro";
import PositionDropdown from "components/Exchange/PositionDropdown";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { AggregatedPositionData } from "domain/synthetics/positions";
import { formatTokenAmountWithUsd, formatUsdAmount } from "domain/synthetics/tokens";
import { getLiquidationPrice } from "lib/legacy";

type Props = {
  position: AggregatedPositionData;
  onClosePositionClick: () => void;
  onEditCollateralClick: () => void;
};

export function PositionItem(p: Props) {
  const { position } = p;

  const liqPrice = getLiquidationPrice({
    size: position?.currentSizeUsd,
    collateral: position?.collateralUsd,
    averagePrice: position?.indexToken?.prices?.maxPrice.add(position?.indexToken.prices?.minPrice).div(2),
  });

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
      <td>
        {formatTokenAmountWithUsd(
          position?.sizeInTokens,
          position?.currentSizeUsd,
          position?.indexToken?.symbol,
          position?.indexToken?.decimals
        )}
      </td>
      <td>
        {formatTokenAmountWithUsd(
          position?.collateralAmount,
          position?.collateralUsd,
          position?.collateralToken?.symbol,
          position?.collateralToken?.decimals
        )}
      </td>
      <td>
        {formatUsdAmount(
          position?.isLong ? position.indexToken?.prices?.minPrice : position?.indexToken?.prices?.maxPrice
        )}
      </td>
      <td>{formatUsdAmount(position?.entryPrice)}</td>
      <td>{formatUsdAmount(liqPrice)}</td>
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
