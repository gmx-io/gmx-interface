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
} from "domain/synthetics/positions";
import { formatDeltaUsd, formatTokenAmount, formatUsd } from "lib/numbers";
import { AiOutlineEdit } from "react-icons/ai";
import { ImSpinner2 } from "react-icons/im";

import Button from "components/Button/Button";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { usePositionsConstants } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { usePositionOrdersWithErrors } from "context/SyntheticsStateContext/hooks/orderHooks";
import { selectShowPnlAfterFees } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectTradeboxCollateralTokenAddress,
  selectTradeboxMarketAddress,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getBorrowingFeeRateUsd, getFundingFeeRateUsd } from "domain/synthetics/fees";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { TradeMode, TradeType, getTriggerThresholdType } from "domain/synthetics/trade";
import { CHART_PERIODS } from "lib/legacy";
import { getPositiveOrNegativeClass } from "lib/utils";
import { Fragment } from "react";
import { FaAngleRight } from "react-icons/fa";
import { useMedia } from "react-use";
import "./PositionItem.scss";

export type Props = {
  position: PositionInfo;
  hideActions?: boolean;
  showPnlAfterFees: boolean;
  onClosePositionClick?: () => void;
  onEditCollateralClick?: () => void;
  onShareClick: () => void;
  onSelectPositionClick?: (tradeMode?: TradeMode) => void;
  onOrdersClick?: (key?: string) => void;
  isLarge: boolean;
  openSettings: () => void;
  onGetPendingFeesClick: () => void;
};

export function PositionItem(p: Props) {
  const ordersWithErrors = usePositionOrdersWithErrors(p.position.key);
  const { showDebugValues } = useSettings();
  const savedShowPnlAfterFees = useSelector(selectShowPnlAfterFees);
  const currentTradeType = useSelector(selectTradeboxTradeType);
  const currentMarketAddress = useSelector(selectTradeboxMarketAddress);
  const currentCollateralAddress = useSelector(selectTradeboxCollateralTokenAddress);
  const displayedPnl = savedShowPnlAfterFees ? p.position.pnlAfterFees : p.position.pnl;
  const displayedPnlPercentage = savedShowPnlAfterFees ? p.position.pnlAfterFeesPercentage : p.position.pnlPercentage;
  const isMobile = useMedia("(max-width: 1100px)");
  const indexPriceDecimals = p.position?.indexToken?.priceDecimals;
  const { minCollateralUsd } = usePositionsConstants();
  const isCurrentTradeTypeLong = currentTradeType === TradeType.Long;
  const isCurrentMarket =
    currentMarketAddress === p.position.marketAddress &&
    currentCollateralAddress === p.position.collateralTokenAddress &&
    isCurrentTradeTypeLong === p.position.isLong;

  function renderNetValue() {
    return (
      <Tooltip
        handle={formatUsd(p.position.netValue)}
        position={p.isLarge ? "bottom-start" : "bottom-end"}
        handleClassName="plain"
        renderContent={() => (
          <div>
            {p.position.uiFeeUsd > 0
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
              textClassName={getPositiveOrNegativeClass(p.position.pnl)}
            />
            <StatsTooltipRow
              label={t`Accrued Borrow Fee`}
              value={formatUsd(p.position.pendingBorrowingFeesUsd) || "..."}
              showDollar={false}
              textClassName={cx({
                "text-red-500": p.position.pendingBorrowingFeesUsd !== 0n,
              })}
            />
            <StatsTooltipRow
              label={t`Accrued Negative Funding Fee`}
              value={formatUsd(-p.position.pendingFundingFeesUsd) || "..."}
              showDollar={false}
              textClassName={cx({
                "text-red-500": p.position.pendingFundingFeesUsd !== 0n,
              })}
            />
            <StatsTooltipRow
              label={t`Close Fee`}
              showDollar={false}
              value={formatUsd(-p.position.closingFeeUsd) || "..."}
              textClassName="text-red-500"
            />
            {p.position.uiFeeUsd > 0 && (
              <StatsTooltipRow
                label={t`UI Fee`}
                showDollar={false}
                value={formatUsd(-p.position.uiFeeUsd)}
                textClassName="text-red-500"
              />
            )}
            <br />
            <StatsTooltipRow
              label={t`PnL After Fees`}
              value={formatDeltaUsd(p.position.pnlAfterFees, p.position.pnlAfterFeesPercentage)}
              showDollar={false}
              textClassName={getPositiveOrNegativeClass(p.position.pnlAfterFees)}
            />
          </div>
        )}
      />
    );
  }

  function renderCollateral() {
    return (
      <>
        <div className={cx("position-list-collateral", { isSmall: !p.isLarge })}>
          <Tooltip
            handle={`${formatUsd(p.position.remainingCollateralUsd)}`}
            position={p.isLarge ? "bottom-start" : "bottom-end"}
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
                    value={formatUsd(-p.position.pendingBorrowingFeesUsd) || "..."}
                    textClassName={cx({
                      "text-red-500": p.position.pendingBorrowingFeesUsd !== 0n,
                    })}
                  />
                  <StatsTooltipRow
                    label={t`Accrued Negative Funding Fee`}
                    showDollar={false}
                    value={formatDeltaUsd(-p.position.pendingFundingFeesUsd) || "..."}
                    textClassName={cx({
                      "text-red-500": p.position.pendingFundingFeesUsd !== 0n,
                    })}
                  />
                  <StatsTooltipRow
                    label={t`Accrued Positive Funding Fee`}
                    showDollar={false}
                    value={formatDeltaUsd(p.position.pendingClaimableFundingFeesUsd) || "..."}
                    textClassName={cx({
                      "text-green-500": p.position.pendingClaimableFundingFeesUsd > 0,
                    })}
                  />
                  <br />
                  <StatsTooltipRow
                    showDollar={false}
                    label={t`Current Borrow Fee / Day`}
                    value={formatUsd(-borrowingFeeRateUsd)}
                    textClassName={cx({
                      "text-red-500": borrowingFeeRateUsd > 0,
                    })}
                  />
                  <StatsTooltipRow
                    showDollar={false}
                    label={t`Current Funding Fee / Day`}
                    value={formatDeltaUsd(fundingFeeRateUsd)}
                    textClassName={getPositiveOrNegativeClass(fundingFeeRateUsd)}
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

          {!p.position.isOpening && !p.hideActions && p.onEditCollateralClick && (
            <span className="edit-icon" onClick={p.onEditCollateralClick}>
              <AiOutlineEdit fontSize={16} />
            </span>
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
      </>
    );
  }

  function renderLiquidationPrice() {
    let liqPriceWarning: string | undefined;
    const estimatedLiquidationHours = getEstimatedLiquidationTimeInHours(p.position, minCollateralUsd);

    if (p.position.liquidationPrice === undefined) {
      if (!p.position.isLong && p.position.collateralAmount >= p.position.sizeInTokens) {
        liqPriceWarning = t`Since your position's Collateral is ${p.position.collateralToken.symbol} with a value larger than the Position Size, the Collateral value will increase to cover any negative PnL.`;
      } else if (
        p.position.isLong &&
        p.position.collateralToken.isStable &&
        p.position.collateralUsd >= p.position.sizeInUsd
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
          position="bottom-end"
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
    if (ordersWithErrors.length === 0) return null;

    if (isSmall) {
      return ordersWithErrors.map(({ order, orderErrors }) => {
        const { errors, level } = orderErrors;
        if (level) {
          return (
            <div key={order.key} className="Position-list-order">
              <Tooltip
                handle={renderOrderText(order)}
                position="bottom-end"
                handleClassName={cx("position-order-error", {
                  "level-warning": level === "warning",
                  "level-error": level === "error",
                })}
                renderContent={() =>
                  errors.map((error) => (
                    <span
                      key={error.key}
                      className={cx("mb-5", "position-order-error", {
                        "level-warning": level === "warning",
                        "level-error": level === "error",
                      })}
                    >
                      {error.msg}
                    </span>
                  ))
                }
              />
            </div>
          );
        }
        return (
          <div key={order.key} className="Position-list-order">
            {renderOrderText(order)}
          </div>
        );
      });
    }

    const ordersErrorList = ordersWithErrors.filter(({ orderErrors }) => orderErrors.level === "error");
    const ordersWarningsList = ordersWithErrors.filter(({ orderErrors }) => orderErrors.level === "warning");
    const hasErrors = ordersErrorList.length + ordersWarningsList.length > 0;

    return (
      <div>
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
                ({ordersWithErrors.length})
              </span>
            </Trans>
          }
          position="bottom-start"
          handleClassName={cx([
            "Exchange-list-info-label",
            "Exchange-position-list-orders",
            "plain",
            "clickable",
            "text-gray-300",
          ])}
          renderContent={() => (
            <div className="order__list">
              <strong>
                <Trans>Active Orders</Trans>
              </strong>
              {ordersWithErrors.map(({ order, orderErrors }) => {
                const errors = orderErrors.errors;
                return (
                  <div
                    key={order.key}
                    className="Position-list-order active-order-tooltip"
                    onClick={() => {
                      p.onOrdersClick?.(order.key);
                    }}
                  >
                    <div className="Position-list-order-label">
                      {renderOrderText(order)}
                      <FaAngleRight fontSize={14} />
                    </div>
                    {errors.map((err, i) => (
                      <Fragment key={err.key}>
                        <div className={cx("order-error-text", `level-${err.level}`)}>{err.msg}</div>
                        {i < errors.length - 1 && <br />}
                      </Fragment>
                    ))}
                  </div>
                );
              })}
            </div>
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
              position="bottom-start"
              handleClassName="plain"
              renderContent={() => (
                <div>
                  <StatsTooltipRow
                    label={t`Market`}
                    value={
                      <div className="flex items-center">
                        <span>{indexName && indexName}</span>
                        <span className="subtext leading-1">{poolName && `[${poolName}]`}</span>
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
              {displayedPnl !== undefined && (
                <div
                  onClick={p.openSettings}
                  className={cx("Exchange-list-info-label Position-pnl cursor-pointer", {
                    positive: displayedPnl > 0,
                    negative: displayedPnl < 0,
                    muted: displayedPnl == 0n,
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
              disabled={p.position.sizeInUsd == 0n}
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
        <div className="flex flex-grow flex-col">
          <div className="flex-grow">
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
                  <div className="flex items-start">
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
                    className={cx("Exchange-list-info-label Position-pnl cursor-pointer", {
                      positive: displayedPnl > 0,
                      negative: displayedPnl < 0,
                      muted: displayedPnl == 0n,
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
                <div>{renderCollateral()}</div>
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
                {ordersWithErrors.length ? undefined : t`None`}
                {renderPositionOrders(true)}
              </div>
            </div>
          </div>
          {!p.hideActions && (
            <footer>
              <div className="App-card-divider" />
              <div className="Position-item-action">
                <div className="Position-item-buttons">
                  <Button variant="secondary" disabled={p.position.sizeInUsd == 0n} onClick={p.onClosePositionClick}>
                    <Trans>Close</Trans>
                  </Button>
                  <Button variant="secondary" disabled={p.position.sizeInUsd == 0n} onClick={p.onEditCollateralClick}>
                    <Trans>Edit Collateral</Trans>
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={p.position.sizeInUsd == 0n}
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
            </footer>
          )}
        </div>
      </div>
    );
  }

  return p.isLarge ? renderLarge() : renderSmall();
}
