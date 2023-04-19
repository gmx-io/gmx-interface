import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import PositionDropdown from "components/Exchange/PositionDropdown";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { PositionOrderInfo, isIncreaseOrderType } from "domain/synthetics/orders";
import { PositionInfo, formatLeverage } from "domain/synthetics/positions";
import { formatDeltaUsd, formatTokenAmount, formatUsd } from "lib/numbers";
import { AiOutlineEdit } from "react-icons/ai";
import { ImSpinner2 } from "react-icons/im";

import { getBorrowingFeeRateUsd, getFundingFeeRateUsd } from "domain/synthetics/fees";
import "./PositionItem.scss";
import { getTriggerThresholdType } from "domain/synthetics/trade";

export type Props = {
  position: PositionInfo;
  positionOrders: PositionOrderInfo[];
  hideActions?: boolean;
  showPnlAfterFees: boolean;
  onClosePositionClick?: () => void;
  onEditCollateralClick?: () => void;
  onShareClick?: () => void;
  onSelectPositionClick?: () => void;
  onOrdersClick?: () => void;
  isLarge: boolean;
};

export function PositionItem(p: Props) {
  const { positionOrders } = p;
  const displayedPnl = p.showPnlAfterFees ? p.position.pnlAfterFees : p.position.pnl;
  const displayedPnlPercentage = p.showPnlAfterFees ? p.position.pnlAfterFeesPercentage : p.position.pnlPercentage;

  function renderNetValue() {
    return (
      <Tooltip
        handle={formatUsd(p.position.netValue)}
        position={p.isLarge ? "left-bottom" : "right-bottom"}
        handleClassName="plain"
        renderContent={() => (
          <div>
            {t`Net Value: Initial Collateral + PnL - Borrow Fee - Funding Fee - Close Fee`}
            <br />
            <br />
            <StatsTooltipRow
              label={t`Initial Collateral`}
              value={formatUsd(p.position.initialCollateralUsd) || "..."}
              showDollar={false}
            />
            <StatsTooltipRow label={t`PnL`} value={formatDeltaUsd(p.position?.pnl) || "..."} showDollar={false} />
            <StatsTooltipRow
              label={t`Borrow fee`}
              value={formatUsd(p.position.pendingBorrowingFeesUsd?.mul(-1)) || "..."}
              showDollar={false}
            />
            <StatsTooltipRow
              label={t`Funding fee`}
              value={formatDeltaUsd(p.position.pendingFundingFeesUsd) || "..."}
              showDollar={false}
            />
            <StatsTooltipRow
              label={t`Close fee`}
              showDollar={false}
              value={formatUsd(p.position.closingFeeUsd?.mul(-1)) || "..."}
            />
            <br />
            <StatsTooltipRow
              label={t`PnL After Fees`}
              value={formatDeltaUsd(p.position.pnlAfterFees, p.position.pnlAfterFeesPercentage)}
              showDollar={false}
            />
          </div>
        )}
      />
    );
  }

  function renderCollateral() {
    return (
      <>
        <div className="position-list-collateral">
          <Tooltip
            handle={`${formatUsd(p.position.remainingCollateralUsd)}`}
            position={p.isLarge ? "left-bottom" : "right-bottom"}
            handleClassName={cx("plain", { negative: p.position.hasLowCollateral })}
            renderContent={() => {
              return (
                <>
                  {p.position.hasLowCollateral && (
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
                    value={
                      <>
                        <div>
                          {formatTokenAmount(
                            p.position.collateralAmount,
                            p.position.collateralToken?.decimals,
                            p.position.collateralToken?.symbol
                          )}
                          <br />({formatUsd(p.position.initialCollateralUsd)})
                        </div>
                      </>
                    }
                    showDollar={false}
                  />
                  <br />
                  <StatsTooltipRow
                    label={t`Borrow Fee`}
                    showDollar={false}
                    value={formatUsd(p.position.pendingBorrowingFeesUsd.mul(-1)) || "..."}
                  />
                  <StatsTooltipRow
                    label={t`Funding Fee`}
                    showDollar={false}
                    value={formatDeltaUsd(p.position.pendingFundingFeesUsd) || "..."}
                  />
                  <br />
                  <StatsTooltipRow
                    showDollar={false}
                    label={t`Borrow Fee / Day`}
                    value={formatUsd(
                      getBorrowingFeeRateUsd(
                        p.position.marketInfo,
                        p.position.isLong,
                        p.position.sizeInUsd,
                        60 * 60 * 24
                      ).mul(-1)
                    )}
                  />
                  <StatsTooltipRow
                    showDollar={false}
                    label={t`Funding Fee / Day`}
                    value={formatDeltaUsd(
                      getFundingFeeRateUsd(p.position.marketInfo, p.position.isLong, p.position.sizeInUsd, 60 * 60 * 24)
                    )}
                  />
                  <br />
                  <Trans>Use the Edit Collateral icon to deposit or withdraw collateral.</Trans>
                </>
              );
            }}
          />
          {p.isLarge && (
            <>
              {!p.position.isOpening && !p.hideActions && p.onEditCollateralClick && (
                <span className="edit-icon" onClick={p.onEditCollateralClick}>
                  <AiOutlineEdit fontSize={16} />
                </span>
              )}
            </>
          )}
        </div>

        <div className="Exchange-list-info-label Position-collateral-amount  muted">
          {formatTokenAmount(
            p.position.remainingCollateralAmount,
            p.position.collateralToken?.decimals,
            p.position.collateralToken?.symbol
          )}
        </div>

        {!p.isLarge && (
          <>
            {!p.position.isOpening && !p.hideActions && p.onEditCollateralClick && (
              <span className="edit-icon" onClick={p.onEditCollateralClick}>
                <AiOutlineEdit fontSize={16} />
              </span>
            )}
          </>
        )}
      </>
    );
  }

  function renderPositionOrders() {
    if (positionOrders.length === 0) return null;

    return (
      <div onClick={p.onOrdersClick}>
        <Tooltip
          handle={t`Orders (${positionOrders.length})`}
          position="left-bottom"
          handleClassName={cx([
            "Exchange-list-info-label",
            "Exchange-position-list-orders",
            "plain",
            "clickable",
            "muted",
          ])}
          renderContent={() => {
            return (
              <>
                <strong>
                  <Trans>Active Orders</Trans>
                </strong>
                {positionOrders.map((order) => {
                  return (
                    <div key={order.key} className="Position-list-order active-order-tooltip">
                      {getTriggerThresholdType(order.orderType, order.isLong)} {formatUsd(order.triggerPrice)}:
                      {isIncreaseOrderType(order.orderType) ? "+" : "-"}
                      {formatUsd(order.sizeDeltaUsd)}
                    </div>
                  );
                })}
              </>
            );
          }}
        />
      </div>
    );
  }

  function renderLarge() {
    return (
      <tr className="Exhange-list-item">
        <td className="clickable" onClick={p.onSelectPositionClick}>
          {/* title */}
          <div className="Exchange-list-title">
            <Tooltip
              handle={p.position.indexToken?.symbol}
              position="left-bottom"
              handleClassName="plain"
              renderContent={() => (
                <div>
                  <StatsTooltipRow label={t`Market`} value={p.position.marketInfo.name} showDollar={false} />

                  <br />

                  <div>
                    <Trans>
                      Click on a row to select the position's market, then use the swap box to increase your position
                      size, or to set stop-loss / take-profit orders. if needed.
                    </Trans>
                    <br />
                    <br />
                    <Trans>Use the "Close" button to reduce your position size</Trans>
                  </div>
                </div>
              )}
            />
            {p.position.pendingUpdate && <ImSpinner2 className="spin position-loading-icon" />}
          </div>
          <div className="Exchange-list-info-label" onClick={p.onSelectPositionClick}>
            <span className="muted">{formatLeverage(p.position.leverage)}&nbsp;</span>
            <span className={cx({ positive: p.position.isLong, negative: !p.position.isLong })}>
              {p.position.isLong ? t`Long` : t`Short`}
            </span>
          </div>
        </td>
        <td>
          {/* netValue */}
          {p.position.isOpening ? (
            t`Opening...`
          ) : (
            <>
              {renderNetValue()}
              {displayedPnl && (
                <div
                  className={cx("Exchange-list-info-label", {
                    positive: displayedPnl.gt(0),
                    negative: displayedPnl.lt(0),
                    muted: displayedPnl.eq(0),
                  })}
                >
                  {formatDeltaUsd(displayedPnl, displayedPnlPercentage)}
                </div>
              )}
            </>
          )}
        </td>
        <td>
          {formatUsd(p.position.sizeInUsd)}
          {renderPositionOrders()}
        </td>
        <td>
          {/* collateral */}
          <div>{renderCollateral()}</div>
        </td>
        <td>
          {/* entryPrice */}
          {p.position.isOpening ? t`Opening...` : formatUsd(p.position.entryPrice)}
        </td>
        <td className="clickable" onClick={p.onSelectPositionClick}>
          {/* markPrice */}
          {formatUsd(p.position.markPrice)}
        </td>
        <td>
          {/* liqPrice */}
          {p.position.isOpening ? formatUsd(p.position.liquidationPrice) : formatUsd(p.position.liquidationPrice)}
        </td>
        <td>
          {/* Close */}
          {!p.position.isOpening && !p.hideActions && (
            <button
              className="Exchange-list-action"
              onClick={p.onClosePositionClick}
              disabled={p.position.sizeInUsd.eq(0)}
            >
              <Trans>Close</Trans>
            </button>
          )}
        </td>
        <td>
          {!p.position.isOpening && !p.hideActions && (
            <PositionDropdown
              handleEditCollateral={p.onEditCollateralClick}
              handleMarketSelect={p.onSelectPositionClick}
            />
          )}
        </td>
      </tr>
    );
  }

  function renderSmall() {
    return (
      <div className="App-card">
        <div className="App-card-title">
          <span className="Exchange-list-title">{p.position.indexToken?.symbol}</span>
          {p.position.pendingUpdate && <ImSpinner2 className="spin position-loading-icon" />}
        </div>
        <div className="App-card-divider" />
        <div className="App-card-content">
          <div className="App-card-row">
            <div className="label">
              <Trans>Market</Trans>
            </div>
            <div>{p.position.marketInfo.name}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Leverage</Trans>
            </div>
            <div>
              {formatLeverage(p.position.leverage)}&nbsp;
              <span
                className={cx("Exchange-list-side", {
                  positive: p.position.isLong,
                  negative: !p.position.isLong,
                })}
              >
                {p.position.isLong ? t`Long` : t`Short`}
              </span>
            </div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Size</Trans>
            </div>
            <div>{formatUsd(p.position.sizeInUsd)}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Collateral</Trans>
            </div>
            <div className="position-list-collateral">{renderCollateral()}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>PnL</Trans>
            </div>
            <div>
              <span
                className={cx("Exchange-list-info-label", {
                  positive: displayedPnl?.gt(0),
                  negative: displayedPnl?.lt(0),
                  muted: displayedPnl?.eq(0),
                })}
              >
                {formatDeltaUsd(displayedPnl, displayedPnlPercentage)}
              </span>
            </div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Net Value</Trans>
            </div>
            <div>{renderNetValue()}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Orders</Trans>
            </div>
            <div>
              {!p.positionOrders?.length && "None"}
              {renderPositionOrders()}
            </div>
          </div>
        </div>
        <div className="App-card-divider" />
        <div className="App-card-content">
          <div className="App-card-row">
            <div className="label">
              <Trans>Entry Price</Trans>
            </div>
            <div>{formatUsd(p.position.entryPrice)}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Mark Price</Trans>
            </div>
            <div>{formatUsd(p.position.markPrice)}</div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Liq. Price</Trans>
            </div>
            <div>{formatUsd(p.position.liquidationPrice)}</div>
          </div>
        </div>
        {!p.hideActions && (
          <>
            <div className="App-card-divider"></div>
            <div className="App-card-options Position-buttons-container">
              <button
                className="App-button-option App-card-option"
                disabled={p.position.sizeInUsd.eq(0)}
                onClick={p.onClosePositionClick}
              >
                <Trans>Close</Trans>
              </button>
              <button
                className="App-button-option App-card-option"
                disabled={p.position.sizeInUsd.eq(0)}
                onClick={p.onEditCollateralClick}
              >
                <Trans>Edit Collateral</Trans>
              </button>
              {/* <button
                  className="Exchange-list-action App-button-option App-card-option"
                  onClick={p.onShareClick}
                  disabled={p.position.sizeInUsd.eq(0)}
                >
                  <Trans>Share</Trans>
                </button> */}
            </div>
          </>
        )}
      </div>
    );
  }

  return p.isLarge ? renderLarge() : renderSmall();
}
