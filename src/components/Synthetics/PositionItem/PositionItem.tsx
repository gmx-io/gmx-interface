import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo } from "react";
import { AiOutlineEdit } from "react-icons/ai";
import { FaAngleRight } from "react-icons/fa";
import { ImSpinner2 } from "react-icons/im";
import { MdClose } from "react-icons/md";
import { useMedia } from "react-use";

import { getTokenVisualMultiplier } from "sdk/configs/tokens";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { usePositionsConstants } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useEditingOrderKeyState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { useCancelOrder, usePositionOrdersWithErrors } from "context/SyntheticsStateContext/hooks/orderHooks";
import { selectShowPnlAfterFees } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import {
  selectTradeboxCollateralTokenAddress,
  selectTradeboxMarketAddress,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getBorrowingFeeRateUsd, getFundingFeeRateUsd } from "domain/synthetics/fees";
import { OrderErrors, PositionOrderInfo, isDecreaseOrderType, isIncreaseOrderType } from "domain/synthetics/orders";
import {
  PositionInfo,
  formatEstimatedLiquidationTime,
  formatLeverage,
  formatLiquidationPrice,
  getEstimatedLiquidationTimeInHours,
  getTriggerNameByOrderType,
} from "domain/synthetics/positions";
import { TradeMode, TradeType, getTriggerThresholdType } from "domain/synthetics/trade";
import { CHART_PERIODS } from "lib/legacy";
import { calculateDisplayDecimals, formatDeltaUsd, formatTokenAmount, formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import Button from "components/Button/Button";
import PositionDropdown from "components/Exchange/PositionDropdown";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Tooltip from "components/Tooltip/Tooltip";

import Skeleton from "react-loading-skeleton";
import "./PositionItem.scss";

export type Props = {
  position: PositionInfo;
  hideActions?: boolean;
  showPnlAfterFees: boolean;
  onClosePositionClick?: () => void;
  onEditCollateralClick?: () => void;
  onShareClick: () => void;
  onSelectPositionClick?: (tradeMode?: TradeMode) => void;
  isLarge: boolean;
  openSettings: () => void;
  onOrdersClick?: (key?: string) => void;
  onCancelOrder?: (orderKey: string) => void;
};

export function PositionItem(p: Props) {
  const { showDebugValues } = useSettings();
  const savedShowPnlAfterFees = useSelector(selectShowPnlAfterFees);
  const currentTradeType = useSelector(selectTradeboxTradeType);
  const currentMarketAddress = useSelector(selectTradeboxMarketAddress);
  const currentCollateralAddress = useSelector(selectTradeboxCollateralTokenAddress);
  const displayedPnl = savedShowPnlAfterFees ? p.position.pnlAfterFees : p.position.pnl;
  const displayedPnlPercentage = savedShowPnlAfterFees ? p.position.pnlAfterFeesPercentage : p.position.pnlPercentage;
  const isMobile = useMedia("(max-width: 1100px)");
  const { minCollateralUsd } = usePositionsConstants();
  const isCurrentTradeTypeLong = currentTradeType === TradeType.Long;
  const isCurrentMarket =
    currentMarketAddress === p.position.marketAddress &&
    currentCollateralAddress === p.position.collateralTokenAddress &&
    isCurrentTradeTypeLong === p.position.isLong;

  const marketDecimals = useSelector(makeSelectMarketPriceDecimals(p.position.market.indexTokenAddress));

  function renderNetValue() {
    return (
      <Tooltip
        handle={formatUsd(p.position.netValue)}
        position={p.isLarge ? "bottom-start" : "bottom-end"}
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
              value={formatUsd(-p.position.pendingBorrowingFeesUsd) || "..."}
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
            handle={<span data-qa="position-collateral-value">{formatUsd(p.position.remainingCollateralUsd)}</span>}
            position={p.isLarge ? "bottom-start" : "bottom-end"}
            className="PositionItem-collateral-tooltip"
            handleClassName={cx({ negative: p.position.hasLowCollateral })}
            renderContent={() => {
              let fundingFeeRateUsd: bigint | undefined = undefined;
              let borrowingFeeRateUsd: bigint | undefined = undefined;

              if (p.position.marketInfo) {
                fundingFeeRateUsd = getFundingFeeRateUsd(
                  p.position.marketInfo,
                  p.position.isLong,
                  p.position.sizeInUsd,
                  CHART_PERIODS["1d"]
                );
                borrowingFeeRateUsd = getBorrowingFeeRateUsd(
                  p.position.marketInfo,
                  p.position.isLong,
                  p.position.sizeInUsd,
                  CHART_PERIODS["1d"]
                );
              }

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
                    value={borrowingFeeRateUsd !== undefined ? formatUsd(-borrowingFeeRateUsd) : "..."}
                    textClassName={cx({
                      "text-red-500": borrowingFeeRateUsd !== undefined && borrowingFeeRateUsd > 0,
                    })}
                  />
                  <StatsTooltipRow
                    showDollar={false}
                    label={t`Current Funding Fee / Day`}
                    value={formatDeltaUsd(fundingFeeRateUsd)}
                    textClassName={getPositiveOrNegativeClass(fundingFeeRateUsd)}
                  />
                  <br />
                  <Trans>Use the edit collateral icon to deposit or withdraw collateral.</Trans>
                  <br />
                  <br />
                  <Trans>
                    Negative funding fees are automatically settled against the collateral and impact the liquidation
                    price. Positive funding fees can be claimed under the claims tab.
                  </Trans>
                </>
              );
            }}
          />

          {!p.position.isOpening && !p.hideActions && p.onEditCollateralClick && (
            <span className="edit-icon" onClick={p.onEditCollateralClick} data-qa="position-edit-button">
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
    if (!p.position.marketInfo) {
      return <Skeleton width={60} count={1} baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" />;
    }

    let liqPriceWarning: string | undefined;
    const estimatedLiquidationHours = getEstimatedLiquidationTimeInHours(p.position, minCollateralUsd);

    if (p.position.liquidationPrice === undefined) {
      if (!p.position.isLong && p.position.collateralAmount >= p.position.sizeInTokens) {
        const symbol = p.position.collateralToken.symbol;
        const indexName = p.position.indexName;
        liqPriceWarning = t`Since your position's collateral is in ${symbol}, with an initial value higher than the ${indexName} short position size, the collateral value will increase to cover any negative PnL, so there is no liquidation price.`;
      } else if (
        p.position.isLong &&
        p.position.collateralToken.isStable &&
        p.position.collateralUsd >= p.position.sizeInUsd
      ) {
        const symbol = p.position.collateralToken.symbol;
        const indexName = p.position.indexName;
        liqPriceWarning = t`Since your position's collateral is in ${symbol}, with an initial value higher than the ${indexName} long position size, the collateral value will cover any negative PnL, so there is no liquidation price.`;
      }
    }

    const getLiqPriceTooltipContent = () => (
      <>
        {liqPriceWarning && <div>{liqPriceWarning}</div>}
        {estimatedLiquidationHours ? (
          <div>
            {!liqPriceWarning && (
              <>
                <Trans>Liquidation price is influenced by fees and collateral value.</Trans>
                <br />
              </>
            )}
            <br />
            {liqPriceWarning ? (
              <Trans>
                This position could still be liquidated, excluding any price movement, due to funding and borrowing fee
                rates reducing the position's collateral over time.
              </Trans>
            ) : (
              <Trans>
                This position could be liquidated, excluding any price movement, due to funding and borrowing fee rates
                reducing the position's collateral over time.
              </Trans>
            )}
            <br />
            <br />
            <StatsTooltipRow
              label={"Estimated Time to Liquidation"}
              value={formatEstimatedLiquidationTime(estimatedLiquidationHours)}
              showDollar={false}
            />
          </div>
        ) : (
          ""
        )}
      </>
    );

    if (liqPriceWarning || estimatedLiquidationHours) {
      return (
        <Tooltip
          handle={
            formatLiquidationPrice(p.position.liquidationPrice, {
              displayDecimals: marketDecimals,
              visualMultiplier: p.position.indexToken.visualMultiplier,
            }) || "..."
          }
          position="bottom-end"
          handleClassName={cx({
            "LiqPrice-soft-warning": estimatedLiquidationHours && estimatedLiquidationHours < 24 * 7,
            "LiqPrice-hard-warning": estimatedLiquidationHours && estimatedLiquidationHours < 24,
          })}
          renderContent={getLiqPriceTooltipContent}
        />
      );
    }

    return (
      formatLiquidationPrice(p.position.liquidationPrice, {
        displayDecimals: marketDecimals,
        visualMultiplier: p.position.indexToken.visualMultiplier,
      }) || "..."
    );
  }

  function renderLarge() {
    const { indexName, poolName } = p.position;
    const qaAttr = `position-item-${indexName}-${poolName}-${p.position.isLong ? "Long" : "Short"}`;

    return (
      <TableTr data-qa={qaAttr}>
        <TableTd
          data-qa="position-handle"
          className={cx({
            "shadow-[inset_2px_0_0] shadow-cold-blue-500": isCurrentMarket,
          })}
          onClick={() => p.onSelectPositionClick?.()}
        >
          {/* title */}
          <div className="Exchange-list-title">
            <Tooltip
              handle={
                <>
                  <TokenIcon
                    className="PositionList-token-icon"
                    symbol={p.position.indexToken.symbol}
                    displaySize={20}
                    importSize={24}
                  />
                  {getTokenVisualMultiplier(p.position.indexToken)}
                  {p.position.indexToken.symbol}
                </>
              }
              position="bottom-start"
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
            {p.position.pendingUpdate && (
              <ImSpinner2 data-qa="position-loading" className="spin position-loading-icon" />
            )}
          </div>
          <div className="Exchange-list-info-label">
            <span className="muted Position-leverage">{formatLeverage(p.position.leverage) || "..."}&nbsp;</span>
            <span className={cx({ positive: p.position.isLong, negative: !p.position.isLong })}>
              {p.position.isLong ? t`Long` : t`Short`}
            </span>
          </div>
        </TableTd>
        <TableTd>
          {formatUsd(p.position.sizeInUsd)}
          <PositionItemOrdersLarge positionKey={p.position.key} onOrdersClick={p.onOrdersClick} />
        </TableTd>
        <TableTd>
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
        </TableTd>
        <TableTd>
          {/* collateral */}
          <div>{renderCollateral()}</div>
        </TableTd>
        <TableTd>
          {/* entryPrice */}
          {p.position.isOpening
            ? t`Opening...`
            : formatUsd(p.position.entryPrice, {
                displayDecimals: marketDecimals,
                visualMultiplier: p.position.indexToken.visualMultiplier,
              })}
        </TableTd>
        <TableTd>
          {/* markPrice */}
          {formatUsd(p.position.markPrice, {
            displayDecimals: marketDecimals,
            visualMultiplier: p.position.indexToken.visualMultiplier,
          })}
        </TableTd>
        <TableTd>
          {/* liqPrice */}
          {renderLiquidationPrice()}
        </TableTd>
        {/* Close */}
        {!p.hideActions && (
          <>
            {!p.position.isOpening ? (
              <>
                <TableTd>
                  <button
                    className="Exchange-list-action"
                    onClick={p.onClosePositionClick}
                    disabled={p.position.sizeInUsd == 0n}
                    data-qa="position-close-button"
                  >
                    <Trans>Close</Trans>
                  </button>
                </TableTd>
                <TableTd>
                  <PositionDropdown
                    handleEditCollateral={p.onEditCollateralClick}
                    handleMarketSelect={() => p.onSelectPositionClick?.()}
                    handleMarketIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Market)}
                    handleShare={p.onShareClick}
                    handleLimitIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Limit)}
                    handleTriggerClose={() => p.onSelectPositionClick?.(TradeMode.Trigger)}
                  />
                </TableTd>
              </>
            ) : (
              <>
                <TableTd />
                <TableTd />
              </>
            )}
          </>
        )}
      </TableTr>
    );
  }

  function renderSmall() {
    const { indexName, poolName } = p.position;

    return (
      <div className="App-card flex flex-col justify-between" data-qa="position-item">
        <div className="flex flex-grow flex-col">
          <div className="flex-grow">
            <div
              className={cx("App-card-title Position-card-title", { "Position-active-card": isCurrentMarket })}
              onClick={() => p.onSelectPositionClick?.()}
            >
              <span className="Exchange-list-title inline-flex">
                <TokenIcon
                  className="PositionList-token-icon"
                  symbol={p.position.indexToken?.symbol}
                  displaySize={20}
                  importSize={24}
                />
                {p.position.indexToken && getTokenVisualMultiplier(p.position.indexToken)}
                {p.position.indexToken?.symbol}
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
                  <Trans>Size</Trans>
                </div>
                <div>{formatUsd(p.position.sizeInUsd)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Net Value</Trans>
                </div>
                <div>{renderNetValue()}</div>
              </div>
              <div className="App-card-row">
                <div className="label">{savedShowPnlAfterFees ? t`PnL After Fees` : t`PnL`}</div>
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
                    displayDecimals: marketDecimals,
                    visualMultiplier: p.position.indexToken.visualMultiplier,
                  })}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Mark Price</Trans>
                </div>
                <div>
                  {formatUsd(p.position.markPrice, {
                    displayDecimals: marketDecimals,
                    visualMultiplier: p.position.indexToken.visualMultiplier,
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
            <div className="flex flex-wrap gap-15">
              <div className="label">
                <Trans>Orders</Trans>
              </div>
              <div className="flex-grow">
                <PositionItemOrdersSmall positionKey={p.position.key} onOrdersClick={p.onOrdersClick} />
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

function PositionItemOrdersSmall({
  positionKey,
  onOrdersClick,
}: {
  positionKey: string;
  onOrdersClick?: (key?: string) => void;
}) {
  const ordersWithErrors = usePositionOrdersWithErrors(positionKey);

  if (ordersWithErrors.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {ordersWithErrors.map((params) => (
        <PositionItemOrder key={params.order.key} onOrdersClick={onOrdersClick} {...params} />
      ))}
    </div>
  );
}

function PositionItemOrdersLarge({
  positionKey,
  onOrdersClick,
}: {
  isSmall?: boolean;
  positionKey: string;
  onOrdersClick?: (key?: string) => void;
}) {
  const ordersWithErrors = usePositionOrdersWithErrors(positionKey);

  const [ordersErrorList, ordersWarningsList] = useMemo(() => {
    const ordersErrorList = ordersWithErrors.filter(({ orderErrors }) => orderErrors.level === "error");
    const ordersWarningsList = ordersWithErrors.filter(({ orderErrors }) => orderErrors.level === "warning");
    return [ordersErrorList, ordersWarningsList];
  }, [ordersWithErrors]);

  if (ordersWithErrors.length === 0) return null;

  return (
    <div>
      <Tooltip
        className="Position-list-active-orders"
        handle={
          <Trans>
            Orders{" "}
            <span
              className={cx({
                "text-red-500": ordersErrorList.length > 0,
                "text-yellow-500": !ordersErrorList.length && ordersWarningsList.length > 0,
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
          "clickable",
          "text-gray-300",
        ])}
        maxAllowedWidth={370}
        tooltipClassName="!z-10 w-[370px]"
        content={
          <div className="flex max-h-[350px] cursor-auto flex-col gap-8 overflow-y-auto leading-base">
            <div className="font-bold">
              <Trans>Active Orders</Trans>
            </div>
            {ordersWithErrors.map((params) => (
              <PositionItemOrder key={params.order.key} onOrdersClick={onOrdersClick} {...params} />
            ))}
          </div>
        }
      />
    </div>
  );
}

function PositionItemOrder({
  order,
  orderErrors,
  onOrdersClick,
}: {
  order: PositionOrderInfo;
  orderErrors: OrderErrors;
  onOrdersClick?: (key?: string) => void;
}) {
  const [, setEditingOrderKey] = useEditingOrderKeyState();
  const [isCancelling, cancel] = useCancelOrder(order.key);
  const handleOrdersClick = useCallback(() => {
    onOrdersClick?.(order.key);
  }, [onOrdersClick, order.key]);

  const errors = orderErrors.errors;

  const handleEditClick = useCallback(() => {
    setEditingOrderKey(order.key);
  }, [order.key, setEditingOrderKey]);

  return (
    <div key={order.key}>
      <div className="flex items-start justify-between gap-6">
        <Button
          variant="secondary"
          className="!block w-full !bg-slate-100 !bg-opacity-15 !p-6 hover:!bg-opacity-20 active:!bg-opacity-25"
          onClick={handleOrdersClick}
        >
          <div className="flex items-center justify-between">
            <PositionItemOrderText order={order} />
            <FaAngleRight fontSize={16} className="ml-5" />
          </div>
        </Button>
        <Button
          variant="secondary"
          className="!bg-slate-100 !bg-opacity-15 !p-6 hover:!bg-opacity-20 active:!bg-opacity-25"
          onClick={handleEditClick}
        >
          <AiOutlineEdit fontSize={16} />
        </Button>
        <Button
          variant="secondary"
          className="!bg-slate-100 !bg-opacity-15 !p-6 hover:!bg-opacity-20 active:!bg-opacity-25"
          disabled={isCancelling}
          onClick={cancel}
        >
          <MdClose fontSize={16} />
        </Button>
      </div>

      {errors.length !== 0 && (
        <div className="mt-8 flex flex-col gap-8 text-start">
          {errors.map((err) => (
            <div
              key={err.key}
              className={cx("hyphens-auto [overflow-wrap:anywhere]", {
                "text-red-500": err.level === "error",
                "text-yellow-500": err.level === "warning",
              })}
            >
              {err.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PositionItemOrderText({ order }: { order: PositionOrderInfo }) {
  const triggerThresholdType = getTriggerThresholdType(order.orderType, order.isLong);
  const isIncrease = isIncreaseOrderType(order.orderType);

  return (
    <div key={order.key} className="text-start">
      {isDecreaseOrderType(order.orderType) ? getTriggerNameByOrderType(order.orderType, true) : t`Limit`}:{" "}
      {triggerThresholdType}{" "}
      {formatUsd(order.triggerPrice, {
        displayDecimals: calculateDisplayDecimals(order.triggerPrice, undefined, order.indexToken?.visualMultiplier),
        visualMultiplier: order.indexToken?.visualMultiplier,
      })}
      :{" "}
      <span>
        {isIncrease ? "+" : "-"}
        {formatUsd(order.sizeDeltaUsd)}
      </span>
    </div>
  );
}
