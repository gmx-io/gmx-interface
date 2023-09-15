import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import PositionDropdown from "components/Exchange/PositionDropdown";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { PositionOrderInfo, getOrderError, isIncreaseOrderType } from "domain/synthetics/orders";
import {
  PositionInfo,
  formatEstimatedLiquidationTime,
  formatLeverage,
  formatLiquidationPrice,
  getEstimatedLiquidationTimeInHours,
  usePositionsConstants,
} from "domain/synthetics/positions";
import { formatDeltaUsd, formatTokenAmount, formatUsd } from "lib/numbers";
import { AiOutlineEdit } from "react-icons/ai";
import { ImSpinner2 } from "react-icons/im";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { getBorrowingFeeRateUsd, getFundingFeeRateUsd } from "domain/synthetics/fees";
import { TradeMode, TradeType, getTriggerThresholdType } from "domain/synthetics/trade";
import { CHART_PERIODS } from "lib/legacy";
import "./PositionItem.scss";
import { useChainId } from "lib/chains";
import { useMedia } from "react-use";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Button from "components/Button/Button";
import { FaAngleRight } from "react-icons/fa";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";

export type Props = {
  position: PositionInfo;
  positionOrders: PositionOrderInfo[];
  hideActions?: boolean;
  showPnlAfterFees: boolean;
  savedShowPnlAfterFees: boolean;
  onClosePositionClick?: () => void;
  onEditCollateralClick?: () => void;
  onShareClick?: () => void;
  onSelectPositionClick?: (tradeMode?: TradeMode) => void;
  onOrdersClick?: () => void;
  isLarge: boolean;
  currentMarketAddress?: string;
  currentCollateralAddress?: string;
  currentTradeType?: TradeType;
  openSettings: () => void;
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
            {t`Net Value: Initial Collateral + PnL - Borrow Fee - Negative Funding Fee - Close Fee`}
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
                            p.position.collateralToken.symbol
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

  function renderPositionOrders() {
    if (positionOrders.length === 0) return null;

    const ordersErrorList = positionOrders.map((order) => getOrderError(order, p.position)).filter(Boolean);
    return (
      <div onClick={p.onOrdersClick}>
        <Tooltip
          className="Position-list-active-orders"
          handle={t`Orders (${positionOrders.length})`}
          position="left-bottom"
          handleClassName={cx(
            ["Exchange-list-info-label", "Exchange-position-list-orders", "plain", "clickable", "text-gray"],
            { "position-order-error": ordersErrorList.length > 0 }
          )}
          renderContent={() => {
            return (
              <>
                <strong>
                  <Trans>Active Orders</Trans>
                </strong>
                {positionOrders.map((order) => {
                  const error = getOrderError(order, p.position);
                  const triggerThresholdType = getTriggerThresholdType(order.orderType, order.isLong);
                  const isIncrease = isIncreaseOrderType(order.orderType);
                  return (
                    <div key={order.key} className="Position-list-order active-order-tooltip">
                      <div className="Position-list-order-label">
                        <span>
                          {triggerThresholdType}{" "}
                          {formatUsd(order.triggerPrice, {
                            displayDecimals: order.indexToken?.priceDecimals,
                          })}
                          :{" "}
                          <span>
                            {isIncrease ? "+" : "-"}
                            {formatUsd(order.sizeDeltaUsd)}
                          </span>
                        </span>
                        <FaAngleRight fontSize={14} />
                      </div>
                      {error && <div className="order-error-text">{error}</div>}
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
                      Click on a row to select the position's market, then use the swap box to increase your position
                      size or to set stop-loss / take-profit orders.
                    </Trans>
                    <br />
                    <br />
                    <Trans>Use the "Close" button to reduce your position size.</Trans>
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
            <span
              onClick={(e) => {
                e.stopPropagation();
                p.openSettings();
              }}
              className="muted Position-leverage"
            >
              {formatLeverage(p.position.leverage) || "..."}&nbsp;
            </span>
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
        <td className="clickable" onClick={() => p.onSelectPositionClick?.()}>
          {/* entryPrice */}
          {p.position.isOpening
            ? t`Opening...`
            : formatUsd(p.position.entryPrice, {
                displayDecimals: indexPriceDecimals,
              })}
        </td>
        <td className="clickable" onClick={() => p.onSelectPositionClick?.()}>
          {/* markPrice */}
          {formatUsd(p.position.markPrice, {
            displayDecimals: indexPriceDecimals,
          })}
        </td>
        <td className="clickable" onClick={() => p.onSelectPositionClick?.()}>
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
          <div className={cx("App-card-title Position-card-title", { "Position-active-card": isCurrentMarket })}>
            <span className="Exchange-list-title inline-flex" onClick={() => p.onSelectPositionClick?.()}>
              <TokenIcon
                className="PositionList-token-icon"
                symbol={p.position.marketInfo.indexToken?.symbol}
                displaySize={20}
                importSize={24}
              />
              {p.position.marketInfo.indexToken?.symbol}
            </span>
            <div>
              <span onClick={() => p.openSettings()} className="Position-leverage">
                {formatLeverage(p.position.leverage)}&nbsp;
              </span>
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
                  <span className="subtext lh-1">{poolName && `[${poolName}]`}</span>
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
              <div className="position-list-collateral">{renderCollateral()}</div>
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
              {renderPositionOrders()}
            </div>
          </div>
          {!p.hideActions && (
            <>
              <div className="App-card-divider"></div>
              <div className="remove-top-margin">
                <Button
                  variant="secondary"
                  className="mr-md mt-md"
                  disabled={p.position.sizeInUsd.eq(0)}
                  onClick={p.onClosePositionClick}
                >
                  <Trans>Close</Trans>
                </Button>
                <Button
                  variant="secondary"
                  className="mr-md mt-md"
                  disabled={p.position.sizeInUsd.eq(0)}
                  onClick={p.onEditCollateralClick}
                >
                  <Trans>Edit Collateral</Trans>
                </Button>
                <Button
                  variant="secondary"
                  className="mt-md"
                  disabled={p.position.sizeInUsd.eq(0)}
                  onClick={() => {
                    // TODO: remove after adding trigger functionality to Modal
                    window.scrollTo({ top: isMobile ? 500 : 0 });
                    p.onSelectPositionClick?.(TradeMode.Trigger);
                  }}
                >
                  <Trans>Trigger</Trans>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return p.isLarge ? renderLarge() : renderSmall();
}
