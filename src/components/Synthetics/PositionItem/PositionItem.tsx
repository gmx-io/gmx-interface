import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import PositionDropdown from "components/Exchange/PositionDropdown";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { PositionOrderInfo, isDecreaseOrderType, isIncreaseOrderType } from "domain/synthetics/orders";
import {
  PositionInfo,
  formatEstimatedLiquidationTime,
  formatLeverage,
  formatLiquidationPrice,
  getEstimatedLiquidationTimeInHours,
  getTriggerNameByOrderType,
  usePositionsConstants,
} from "domain/synthetics/positions";
import { formatDeltaUsd, formatTokenAmount, formatUsd } from "lib/numbers";
import { AiOutlineEdit } from "react-icons/ai";
import { ImSpinner2 } from "react-icons/im";

import Button from "components/Button/Button";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { getBorrowingFeeRateUsd, getFundingFeeRateUsd } from "domain/synthetics/fees";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { TradeMode, TradeType, getTriggerThresholdType } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { CHART_PERIODS } from "lib/legacy";
import { FaAngleRight } from "react-icons/fa";
import { useMedia } from "react-use";
import "./PositionItem.scss";
import { Fragment } from "react";

export type Props = {
  position: PositionInfo;
  positionOrders: PositionOrderInfo[];
  hideActions?: boolean;
  showPnlAfterFees: boolean;
  savedShowPnlAfterFees: boolean;
  onClosePositionClick?: () => void;
  onEditCollateralClick?: () => void;
  onShareClick: () => void;
  onSelectPositionClick?: (tradeMode?: TradeMode) => void;
  onOrdersClick?: () => void;
  isLarge: boolean;
  currentMarketAddress?: string;
  currentCollateralAddress?: string;
  currentTradeType?: TradeType;
  openSettings: () => void;
  onGetPendingFeesClick: () => void;
};

export function PositionItem(p: Props) {
  const { showDebugValues } = useSettings();
  const { positionOrders } = p;
  const displayedPnl = p.savedShowPnlAfterFees ? p.position.pnlAfterFees : p.position.pnl;
  const displayedPnlPercentage = p.savedShowPnlAfterFees ? p.position.pnlAfterFeesPercentage : p.position.pnlPercentage;
  const { chainId } = useChainId();
  const isMobile = useMedia("(max-width: 1100px)");
  const indexPriceDecimals = p.position?.indexToken?.priceDecimals;
  const { minCollateralUsd } = usePositionsConstants(chainId);

  const isCurrentTradeTypeLong = p.currentTradeType === TradeType.Long;
  const isCurrentMarket =
    p.currentMarketAddress === p.position.marketAddress &&
    p.currentCollateralAddress === p.position.collateralTokenAddress &&
    isCurrentTradeTypeLong === p.position.isLong;

  function renderNetValue() {
    return (
      <Tooltip
        handle={formatUsd(p.position.netValue)}
        position={p.isLarge ? "left-bottom" : "right-bottom"}
        handleClassName="plain"
        renderContent={() => (
          <div>
            {p.position.uiFeeUsd.gt(0)
              ? t`Net Value: Initial Collateral + PnL - Borrow Fee - Negative Funding Fee - Close Fee - UI Fee`
              : t`Net Value: Initial Collateral + PnL - Borrow Fee - Negative Funding Fee - Close Fee`}
            <br />
            <br />
            <StatsTooltipRow
              label={t`Initial Collateral`}
              value={formatUsd(p.position.collateralUsd) || "..."}
              showDollar={false}
            />
            <StatsTooltipRow
              label={t`PnL`}
              value={formatDeltaUsd(p.position?.pnl) || "..."}
              showDollar={false}
              className={p.position?.pnl?.gte(0) ? "text-green" : "text-red"}
            />
            <StatsTooltipRow
              label={t`Accrued Borrow Fee`}
              value={formatUsd(p.position.pendingBorrowingFeesUsd?.mul(-1)) || "..."}
              showDollar={false}
              className="text-red"
            />
            <StatsTooltipRow
              label={t`Accrued Negative Funding Fee`}
              value={formatUsd(p.position.pendingFundingFeesUsd.mul(-1)) || "..."}
              showDollar={false}
              className="text-red"
            />
            <StatsTooltipRow
              label={t`Close Fee`}
              showDollar={false}
              value={formatUsd(p.position.closingFeeUsd?.mul(-1)) || "..."}
              className="text-red"
            />
            {p.position.uiFeeUsd.gt(0) && (
              <StatsTooltipRow
                label={t`UI Fee`}
                showDollar={false}
                value={formatUsd(p.position.uiFeeUsd.mul(-1))}
                className="text-red"
              />
            )}
            <br />
            <StatsTooltipRow
              label={t`PnL After Fees`}
              value={formatDeltaUsd(p.position.pnlAfterFees, p.position.pnlAfterFeesPercentage)}
              showDollar={false}
              className={p.position.pnlAfterFees?.gte(0) ? "text-green" : "text-red"}
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
            position={p.isLarge ? "left-bottom" : "center-bottom"}
            className="PositionItem-collateral-tooltip"
            handleClassName={cx("plain", { negative: p.position.hasLowCollateral })}
            renderContent={() => {
              const fundingFeeRateUsd = getFundingFeeRateUsd(
                p.position.marketInfo,
                p.position.isLong,
                p.position.sizeInUsd,
                CHART_PERIODS["1d"]
              );
              const borrowingFeeRateUsd = getBorrowingFeeRateUsd(
                p.position.marketInfo,
                p.position.isLong,
                p.position.sizeInUsd,
                CHART_PERIODS["1d"]
              );
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
                            p.position.collateralToken.decimals,
                            p.position.collateralToken.symbol,
                            {
                              useCommas: true,
                            }
                          )}{" "}
                          ({formatUsd(p.position.collateralUsd)})
                        </div>
                      </>
                    }
                    showDollar={false}
                  />
                  <br />
                  <StatsTooltipRow
                    label={t`Accrued Borrow Fee`}
                    showDollar={false}
                    value={formatUsd(p.position.pendingBorrowingFeesUsd.mul(-1)) || "..."}
                    className="text-red"
                  />
                  <StatsTooltipRow
                    label={t`Accrued Negative Funding Fee`}
                    showDollar={false}
                    value={formatDeltaUsd(p.position.pendingFundingFeesUsd.mul(-1)) || "..."}
                    className="text-red"
                  />
                  <StatsTooltipRow
                    label={t`Accrued Positive Funding Fee`}
                    showDollar={false}
                    value={formatDeltaUsd(p.position.pendingClaimableFundingFeesUsd) || "..."}
                    className="text-green"
                  />
                  <br />
                  <StatsTooltipRow
                    showDollar={false}
                    label={t`Current Borrow Fee / Day`}
                    value={formatUsd(borrowingFeeRateUsd.mul(-1))}
                    className="text-red"
                  />
                  <StatsTooltipRow
                    showDollar={false}
                    label={t`Current Funding Fee / Day`}
                    value={formatDeltaUsd(fundingFeeRateUsd)}
                    className={fundingFeeRateUsd.gt(0) ? "text-green" : "text-red"}
                  />
                  <br />
                  <Trans>Use the Edit Collateral icon to deposit or withdraw collateral.</Trans>
                  <br />
                  <br />
                  <Trans>
                    Negative Funding Fees are settled against the collateral automatically and will influence the
                    liquidation price. Positive Funding Fees can be claimed under Claimable Funding after realizing any
                    action on the position.
                  </Trans>
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

        <div className="Exchange-list-info-label Position-collateral-amount muted">
          {`(${formatTokenAmount(
            p.position.remainingCollateralAmount,
            p.position.collateralToken?.decimals,
            p.position.collateralToken?.symbol,
            {
              useCommas: true,
            }
          )})`}
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

  function renderLiquidationPrice() {
    let liqPriceWarning: string | undefined;
    const estimatedLiquidationHours = getEstimatedLiquidationTimeInHours(p.position, minCollateralUsd);

    if (!p.position.liquidationPrice) {
      if (!p.position.isLong && p.position.collateralAmount.gte(p.position.sizeInTokens)) {
        liqPriceWarning = t`Since your position's Collateral is ${p.position.collateralToken.symbol} with a value larger than the Position Size, the Collateral value will increase to cover any negative PnL.`;
      } else if (
        p.position.isLong &&
        p.position.collateralToken.isStable &&
        p.position.collateralUsd.gte(p.position.sizeInUsd)
      ) {
        liqPriceWarning = t`Since your position's Collateral is ${p.position.collateralToken.symbol} with a value larger than the Position Size, the Collateral value will cover any negative PnL.`;
      }
    }

    const getLiqPriceTooltipContent = () => (
      <>
        {liqPriceWarning && <div>{liqPriceWarning}</div>}
        {estimatedLiquidationHours ? (
          <div>
            <div>
              {!liqPriceWarning && "Liquidation Price is influenced by Fees, Collateral value, and Price Impact."}
            </div>
            <br />
            <StatsTooltipRow
              label={"Estimated time to Liquidation"}
              value={formatEstimatedLiquidationTime(estimatedLiquidationHours)}
              showDollar={false}
            />
            <br />
            <div>
              Estimation based on current Borrow and Funding Fees rates reducing position's Collateral over time,
              excluding any price movement.
            </div>
          </div>
        ) : (
          ""
        )}
      </>
    );

    if (liqPriceWarning || estimatedLiquidationHours) {
      return (
        <Tooltip
          handle={formatLiquidationPrice(p.position.liquidationPrice, { displayDecimals: indexPriceDecimals }) || "..."}
          position={p.isLarge ? "left-bottom" : "right-bottom"}
          handleClassName={cx("plain", {
            "LiqPrice-soft-warning": estimatedLiquidationHours && estimatedLiquidationHours < 24 * 7,
            "LiqPrice-hard-warning": estimatedLiquidationHours && estimatedLiquidationHours < 24,
          })}
          renderContent={getLiqPriceTooltipContent}
        />
      );
    }

    return formatLiquidationPrice(p.position.liquidationPrice, { displayDecimals: indexPriceDecimals }) || "...";
  }

  function renderOrderText(order: PositionOrderInfo) {
    const triggerThresholdType = getTriggerThresholdType(order.orderType, order.isLong);
    const isIncrease = isIncreaseOrderType(order.orderType);
    return (
      <div key={order.key}>
        {isDecreaseOrderType(order.orderType) ? getTriggerNameByOrderType(order.orderType, true) : t`Limit`}:{" "}
        {triggerThresholdType}{" "}
        {formatUsd(order.triggerPrice, {
          displayDecimals: order.indexToken?.priceDecimals,
        })}
        :{" "}
        <span>
          {isIncrease ? "+" : "-"}
          {formatUsd(order.sizeDeltaUsd)}
        </span>
      </div>
    );
  }

  function renderPositionOrders(isSmall = false) {
    if (positionOrders.length === 0) return null;

    const ordersErrorList = positionOrders.filter((order) => order.errorLevel === "error");
    const ordersWarningsList = positionOrders.filter((order) => order.errorLevel === "warning");
    const hasErrors = ordersErrorList.length + ordersWarningsList.length > 0;

    if (isSmall) {
      return positionOrders.map((order) => {
        if (hasErrors) {
          return (
            <div key={order.key} className="Position-list-order">
              <Tooltip
                className="order-error"
                handle={renderOrderText(order)}
                position="right-bottom"
                handleClassName="plain"
                renderContent={() =>
                  order.errors.map((error) => (
                    <span key={error.msg} className="negative mb-xs">
                      {error.msg}
                    </span>
                  ))
                }
              />
            </div>
          );
        }
        return <div className="Position-list-order">{renderOrderText(order)}</div>;
      });
    }

    return (
      <div onClick={p.onOrdersClick}>
        <Tooltip
          className="Position-list-active-orders"
          handle={
            <Trans>
              Orders{" "}
              <span
                className={cx({
                  "position-order-error": hasErrors,
                  "level-error": ordersErrorList.length > 0,
                  "level-warning": !ordersErrorList.length && ordersWarningsList.length > 0,
                })}
              >
                ({positionOrders.length})
              </span>
            </Trans>
          }
          position="left-bottom"
          handleClassName={cx([
            "Exchange-list-info-label",
            "Exchange-position-list-orders",
            "plain",
            "clickable",
            "text-gray",
          ])}
          renderContent={() => (
            <>
              <strong>
                <Trans>Active Orders</Trans>
              </strong>
              {positionOrders.map((order) => {
                const errors = order.errors;
                return (
                  <div key={order.key} className="Position-list-order active-order-tooltip">
                    <div className="Position-list-order-label">
                      {renderOrderText(order)}
                      <FaAngleRight fontSize={14} />
                    </div>

                    {errors.map((err, i) => (
                      <Fragment key={err.msg}>
                        <div className={cx("order-error-text", `level-${err.level}`)}>{err.msg}</div>
                        {i < errors.length - 1 && <br />}
                      </Fragment>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        />
      </div>
    );
  }

  function renderLarge() {
    const indexName = getMarketIndexName(p.position.marketInfo);
    const poolName = getMarketPoolName(p.position.marketInfo);
    return (
      <tr
        className={cx("Exchange-list-item", {
          "Exchange-list-item-active": isCurrentMarket,
        })}
      >
        <td className="clickable" onClick={() => p.onSelectPositionClick?.()}>
          {/* title */}
          <div className="Exchange-list-title">
            <Tooltip
              handle={
                <>
                  <TokenIcon
                    className="PositionList-token-icon"
                    symbol={p.position.marketInfo.indexToken.symbol}
                    displaySize={20}
                    importSize={24}
                  />
                  {p.position.marketInfo.indexToken.symbol}
                </>
              }
              position="left-bottom"
              handleClassName="plain"
              renderContent={() => (
                <div>
                  <StatsTooltipRow
                    label={t`Market`}
                    value={
                      <div className="items-center">
                        <span>{indexName && indexName}</span>
                        <span className="subtext lh-1">{poolName && `[${poolName}]`}</span>
                      </div>
                    }
                    showDollar={false}
                  />

                  <br />

                  <div>
                    <Trans>
                      Click on the Position to select its market, then use the trade box to increase your Position Size,
                      or to set Take-Profit / Stop-Loss Orders.
                    </Trans>
                    <br />
                    <br />
                    <Trans>Use the "Close" button to reduce your Position Size.</Trans>
                  </div>

                  {showDebugValues && (
                    <>
                      <br />
                      <StatsTooltipRow
                        label={"Key"}
                        value={<div className="debug-key muted">{p.position.contractKey}</div>}
                        showDollar={false}
                      />
                    </>
                  )}
                </div>
              )}
            />
            {p.position.pendingUpdate && <ImSpinner2 className="spin position-loading-icon" />}
          </div>
          <div className="Exchange-list-info-label">
            <span className="muted Position-leverage">{formatLeverage(p.position.leverage) || "..."}&nbsp;</span>
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
                  onClick={p.openSettings}
                  className={cx("Exchange-list-info-label cursor-pointer Position-pnl", {
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
          {p.position.isOpening
            ? t`Opening...`
            : formatUsd(p.position.entryPrice, {
                displayDecimals: indexPriceDecimals,
              })}
        </td>
        <td>
          {/* markPrice */}
          {formatUsd(p.position.markPrice, {
            displayDecimals: indexPriceDecimals,
          })}
        </td>
        <td>
          {/* liqPrice */}
          {renderLiquidationPrice()}
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
              handleMarketSelect={() => p.onSelectPositionClick?.()}
              handleMarketIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Market)}
              handleShare={p.onShareClick}
              handleLimitIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Limit)}
              handleTriggerClose={() => p.onSelectPositionClick?.(TradeMode.Trigger)}
            />
          )}
        </td>
      </tr>
    );
  }

  function renderSmall() {
    const indexName = getMarketIndexName(p.position.marketInfo);
    const poolName = getMarketPoolName(p.position.marketInfo);
    return (
      <div className="App-card">
        <div>
          <div
            className={cx("App-card-title Position-card-title", { "Position-active-card": isCurrentMarket })}
            onClick={() => p.onSelectPositionClick?.()}
          >
            <span className="Exchange-list-title inline-flex">
              <TokenIcon
                className="PositionList-token-icon"
                symbol={p.position.marketInfo.indexToken?.symbol}
                displaySize={20}
                importSize={24}
              />
              {p.position.marketInfo.indexToken?.symbol}
            </span>
            <div>
              <span className="Position-leverage">{formatLeverage(p.position.leverage)}&nbsp;</span>
              <span
                className={cx("Exchange-list-side", {
                  positive: p.position.isLong,
                  negative: !p.position.isLong,
                })}
              >
                {p.position.isLong ? t`Long` : t`Short`}
              </span>
            </div>
            {p.position.pendingUpdate && <ImSpinner2 className="spin position-loading-icon" />}
          </div>

          <div className="App-card-divider" />
          <div className="App-card-content">
            {showDebugValues && (
              <div className="App-card-row">
                <div className="label">Key</div>
                <div className="debug-key muted">{p.position.contractKey}</div>
              </div>
            )}
            <div className="App-card-row">
              <div className="label">
                <Trans>Market</Trans>
              </div>
              <div onClick={() => p.onSelectPositionClick?.()}>
                <div className="items-top">
                  <span>{indexName && indexName}</span>
                  <span className="subtext">{poolName && `[${poolName}]`}</span>
                </div>
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
                <Trans>PnL</Trans>
              </div>
              <div>
                <span
                  className={cx("Exchange-list-info-label cursor-pointer Position-pnl", {
                    positive: displayedPnl?.gt(0),
                    negative: displayedPnl?.lt(0),
                    muted: displayedPnl?.eq(0),
                  })}
                  onClick={p.openSettings}
                >
                  {formatDeltaUsd(displayedPnl, displayedPnlPercentage)}
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
              <div className="position-list-collateral items-center">{renderCollateral()}</div>
            </div>
          </div>
          <div className="App-card-divider" />
          <div className="App-card-content">
            <div className="App-card-row">
              <div className="label">
                <Trans>Entry Price</Trans>
              </div>
              <div>
                {formatUsd(p.position.entryPrice, {
                  displayDecimals: indexPriceDecimals,
                })}
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Mark Price</Trans>
              </div>
              <div>
                {formatUsd(p.position.markPrice, {
                  displayDecimals: indexPriceDecimals,
                })}
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Liq. Price</Trans>
              </div>
              <div>{renderLiquidationPrice()}</div>
            </div>
          </div>
          <div className="App-card-divider" />
          <div className="App-card-row">
            <div className="label">
              <Trans>Orders</Trans>
            </div>
            <div>
              {!p.positionOrders?.length && "None"}
              {renderPositionOrders(true)}
            </div>
          </div>
          {!p.hideActions && (
            <>
              <div className="App-card-divider" />
              <div className="Position-item-action">
                <div className="Position-item-buttons">
                  <Button variant="secondary" disabled={p.position.sizeInUsd.eq(0)} onClick={p.onClosePositionClick}>
                    <Trans>Close</Trans>
                  </Button>
                  <Button variant="secondary" disabled={p.position.sizeInUsd.eq(0)} onClick={p.onEditCollateralClick}>
                    <Trans>Edit Collateral</Trans>
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={p.position.sizeInUsd.eq(0)}
                    onClick={() => {
                      // TODO: remove after adding trigger functionality to Modal
                      window.scrollTo({ top: isMobile ? 500 : 0 });
                      p.onSelectPositionClick?.(TradeMode.Trigger);
                    }}
                  >
                    <Trans>TP/SL</Trans>
                  </Button>
                </div>
                <div>
                  {!p.position.isOpening && !p.hideActions && (
                    <PositionDropdown
                      handleMarketSelect={() => p.onSelectPositionClick?.()}
                      handleMarketIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Market)}
                      handleShare={p.onShareClick}
                      handleLimitIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Limit)}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return p.isLarge ? renderLarge() : renderSmall();
}
