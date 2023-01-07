import { Trans, t } from "@lingui/macro";
import PositionDropdown from "components/Exchange/PositionDropdown";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import cx from "classnames";
import { formatLeverage, formatPnl } from "domain/synthetics/positions";
import { formatUsdAmount } from "domain/synthetics/tokens";
import { Collateral, NetValue, PositionOrders, CommonProps } from "./Common";

export function PositionLarge(p: CommonProps) {
  return (
    <tr className="Exhange-list-item">
      <td className="clickable" onClick={p.onSelectMarketClick}>
        {/* title */}
        <div className="Exchange-list-title">
          <Tooltip
            handle={p.position.indexToken?.symbol}
            position="left-bottom"
            handleClassName="plain"
            renderContent={() => (
              <div>
                <StatsTooltipRow label={t`Market`} value={p.position.marketName || ""} showDollar={false} />
              </div>
            )}
          />
          {/* {position.hasPendingChanges && <ImSpinner2 className="spin position-loading-icon" />} */}
        </div>
        <div className="Exchange-list-info-label" onClick={p.onSelectMarketClick}>
          <span className="muted">{formatLeverage(p.position.leverage)}&nbsp;</span>
          <span className={cx({ positive: p.position.isLong, negative: !p.position.isLong })}>
            {p.position.isLong ? t`Long` : t`Short`}
          </span>
        </div>
      </td>
      <td>
        {/* netValue */}
        {!p.position.netValue && t`Updating...`}
        {p.position.netValue && (
          <NetValue tooltipPosition="left-bottom" position={p.position} showPnlAfterFees={p.showPnlAfterFees} />
        )}
        {p.position.pnl && (
          <div
            className={cx("Exchange-list-info-label", {
              positive: p.position.pnl.gt(0),
              negative: p.position.pnl.lt(0),
              muted: p.position.pnl.eq(0),
            })}
          >
            {formatPnl(p.position.pnl, p.position.pnlPercentage)}
          </div>
        )}
      </td>
      <td>
        {/* size */}
        {formatUsdAmount(p.position.sizeInUsd)}
        <PositionOrders />
      </td>
      <td>
        {/* collateral */}
        <div className="position-list-collateral">
          <Collateral
            tooltipPosition="left-bottom"
            position={p.position}
            hideActions={p.hideActions}
            onEditClick={p.onEditCollateralClick}
          />
        </div>
      </td>
      <td className="clickable" onClick={p.onSelectMarketClick}>
        {/* markPrice */}
        <Tooltip
          handle={formatUsdAmount(p.position.markPrice)}
          position="left-bottom"
          handleClassName="plain clickable"
          renderContent={() => {
            return (
              <div>
                <Trans>
                  Click on a row to select the position's market, then use the swap box to increase your position size,
                  or to set stop-loss / take-profit orders. if needed.
                </Trans>
                <br />
                <br />
                <Trans>Use the "Close" button to reduce your position size</Trans>
              </div>
            );
          }}
        />
      </td>
      <td>
        {/* entryPrice */}
        {formatUsdAmount(p.position.entryPrice)}
      </td>
      <td>
        {/* liqPrice */}
        {formatUsdAmount(p.position.liqPrice)}
      </td>
      <td>
        {/* Close */}
        <button className="Exchange-list-action" onClick={p.onClosePositionClick} disabled={p.position.sizeInUsd.eq(0)}>
          <Trans>Close</Trans>
        </button>
      </td>
      <td>
        <PositionDropdown
          handleEditCollateral={p.onEditCollateralClick}
          handleShare={p.onShareClick}
          handleMarketSelect={p.onSelectMarketClick}
        />
      </td>
    </tr>
  );
}
