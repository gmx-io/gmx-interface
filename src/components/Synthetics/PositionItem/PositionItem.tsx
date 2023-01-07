import { Trans, t } from "@lingui/macro";
import PositionDropdown from "components/Exchange/PositionDropdown";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import cx from "classnames";
import { AggregatedPositionData, formatLeverage, formatPnl } from "domain/synthetics/positions";
import { formatUsdAmount } from "domain/synthetics/tokens";
import { AiOutlineEdit } from "react-icons/ai";

import "./PositionItem.scss";

type Props = {
  position: AggregatedPositionData;
  // positionOrders?: any[];
  onClosePositionClick: () => void;
  onEditCollateralClick: () => void;
  // onOrdersClick: () => void;
};

export function PositionItem(p: Props) {
  const { position } = p;

  const showPnlAfterFees = false;

  const onPositionSelect = () => {};

  return (
    <tr className="Exhange-list-item">
      <td className="clickable" onClick={onPositionSelect}>
        {/* position */}
        <div className="Exchange-list-title">
          <Tooltip
            handle={position.indexToken?.symbol}
            position="left-bottom"
            handleClassName="plain"
            renderContent={() => (
              <div>
                <StatsTooltipRow label={t`Market`} value={position.marketName || ""} showDollar={false} />
              </div>
            )}
          />
          {/* {position.hasPendingChanges && <ImSpinner2 className="spin position-loading-icon" />} */}
        </div>
        <div className="Exchange-list-info-label" onClick={onPositionSelect}>
          {position.leverage && <span className="muted">{formatLeverage(position.leverage)}&nbsp;</span>}
          <span className={cx({ positive: position.isLong, negative: !position.isLong })}>
            {position.isLong ? t`Long` : t`Short`}
          </span>
        </div>
      </td>
      <td>
        {/* netValue */}
        {!position.netValue && t`Updating...`}
        {position.netValue && (
          <Tooltip
            handle={formatUsdAmount(position.netValue)}
            position="left-bottom"
            handleClassName="plain"
            renderContent={() => (
              <div>
                {showPnlAfterFees
                  ? t`Net Value: Initial Collateral + PnL - Fees`
                  : t`Net Value: Initial Collateral + PnL - Borrow Fee`}

                <br />
                <br />

                <StatsTooltipRow
                  label={t`Initial Collateral`}
                  value={formatUsdAmount(position.collateralUsd)}
                  showDollar={false}
                />

                <StatsTooltipRow label={t`PnL`} value={formatUsdAmount(position?.pnl)} showDollar={false} />

                <StatsTooltipRow
                  label={t`Borrow fee:`}
                  value={formatUsdAmount(position?.pendingBorrowingFees?.mul(-1))}
                  showDollar={false}
                />

                {/* <StatsTooltipRow
                  label={t`Open + Close fee`}
                  showDollar={false}
                  value={`-$${formatAmount(position.positionFee, USD_DECIMALS, 2, true)}`}
                />

                <StatsTooltipRow
                  label={t`PnL After Fees`}
                  value={[position.deltaAfterFeesStr, `(${position.deltaAfterFeesPercentageStr})`]}
                  showDollar={false}
                /> */}
              </div>
            )}
          />
        )}
        {position.pnl && (
          <div
            className={cx("Exchange-list-info-label", {
              positive: position.pnl.gt(0),
              negative: position.pnl.lt(0),
              muted: position.pnl.eq(0),
            })}
          >
            {formatPnl(position.pnl, position.pnlPercentage)}
          </div>
        )}
      </td>
      <td>
        {/* size */}
        {formatUsdAmount(position.sizeInUsd)}
        {/* {p.positionOrders?.length && (
          <div onClick={() => p.onOrdersClick()}>
            <Tooltip
              handle={t`Orders (${p.positionOrders.length})`}
              position="left-bottom"
              handleClassName={cx(["Exchange-list-info-label", "Exchange-position-list-orders", "plain", "clickable"], {
                muted: !hasOrderError,
                negative: hasOrderError,
              })}
              renderContent={() => {
                return (
                  <>
                    <strong>
                      <Trans>Active Orders</Trans>
                    </strong>
                    {positionOrders.map((order) => {
                      return (
                        <div
                          key={`${order.isLong}-${order.type}-${order.index}`}
                          className="Position-list-order active-order-tooltip"
                        >
                          {order.triggerAboveThreshold ? ">" : "<"} {formatAmount(order.triggerPrice, 30, 2, true)}:
                          {order.type === INCREASE ? " +" : " -"}${formatAmount(order.sizeDelta, 30, 2, true)}
                          {order.error && <div className="negative active-oredr-error">{order.error}</div>}
                        </div>
                      );
                    })}
                  </>
                );
              }}
            />
          </div>
        )} */}
      </td>
      <td>
        {/* collateral */}
        <div className="position-list-collateral">
          <Tooltip
            handle={formatUsdAmount(position.collateralUsdAfterFees)}
            position="left-bottom"
            handleClassName={cx("plain", { negative: position.hasLowCollateral })}
            renderContent={() => {
              return (
                <>
                  {position.hasLowCollateral && (
                    <div>
                      <Trans>
                        WARNING: This position has a low amount of collateral after deducting fees, deposit more
                        collateral to reduce the position's liquidation risk.
                      </Trans>
                      <br />
                      <br />
                    </div>
                  )}

                  <StatsTooltipRow
                    label={t`Initial Collateral`}
                    value={formatUsdAmount(position.collateralUsd)}
                    showDollar={false}
                  />

                  <StatsTooltipRow label={t`Borrow Fee`} showDollar={false} value={"..."} />

                  <StatsTooltipRow showDollar={false} label={t`Borrow Fee / Day`} value={"..."} />

                  <br />

                  <Trans>Use the Edit Collateral icon to deposit or withdraw collateral.</Trans>
                </>
              );
            }}
          />
          <span className="edit-icon" onClick={() => p.onEditCollateralClick()}>
            <AiOutlineEdit fontSize={16} />
          </span>
        </div>
      </td>
      <td>
        {/* markPrice */}
        <Tooltip
          handle={formatUsdAmount(position.markPrice)}
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
        {formatUsdAmount(position.entryPrice)}
      </td>
      <td>
        {/* liqPrice */}
        {formatUsdAmount(position.liqPrice)}
      </td>
      <td>
        {/* Close */}
        <button className="Exchange-list-action" onClick={p.onClosePositionClick} disabled={position.sizeInUsd.eq(0)}>
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
