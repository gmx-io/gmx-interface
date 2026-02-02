import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo } from "react";
import Skeleton from "react-loading-skeleton";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { usePositionsConstants } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useEditingOrderState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { useCancelOrder, usePositionOrdersWithErrors } from "context/SyntheticsStateContext/hooks/orderHooks";
import { selectOracleSettings } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectShowPnlAfterFees } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { selectTradeboxSelectedPositionKey } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getBorrowingFeeRateUsd, getFundingFeeRateUsd } from "domain/synthetics/fees";
import {
  OrderErrors,
  PositionOrderInfo,
  isIncreaseOrderType,
  isMarketOrderType,
  isTwapOrder,
} from "domain/synthetics/orders";
import { useDisabledCancelMarketOrderMessage } from "domain/synthetics/orders/useDisabledCancelMarketOrderMessage";
import {
  PositionInfo,
  formatEstimatedLiquidationTime,
  formatLeverage,
  formatLiquidationPrice,
  getEstimatedLiquidationTimeInHours,
  getNameByOrderType,
} from "domain/synthetics/positions";
import { TradeMode } from "domain/synthetics/trade";
import { CHART_PERIODS } from "lib/legacy";
import { calculateDisplayDecimals, formatBalanceAmount, formatDeltaUsd, formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";
import { getMarketIndexName } from "sdk/utils/markets";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import { AppCard, AppCardSection } from "components/AppCard/AppCard";
import Button from "components/Button/Button";
import PositionDropdown from "components/PositionDropdown/PositionDropdown";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronRightIcon from "img/ic_chevron_right.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import EditIcon from "img/ic_edit.svg?react";
import NewLinkThinIcon from "img/ic_new_link_thin.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

import { TwapOrderProgress } from "../OrderItem/OrderItem";

import "./PositionItem.scss";

export type Props = {
  position: PositionInfo;
  hideActions?: boolean;
  showPnlAfterFees: boolean;
  onClosePositionClick?: () => void;
  onEditCollateralClick?: () => void;
  onShareClick?: () => void;
  onSelectPositionClick?: (tradeMode?: TradeMode, showCurtain?: boolean) => void;
  isLarge: boolean;
  onOrdersClick?: (key?: string) => void;
  onCancelOrder?: (orderKey: string) => void;
};

export function PositionItem(p: Props) {
  const { showDebugValues, breakdownNetPriceImpactEnabled } = useSettings();
  const savedShowPnlAfterFees = useSelector(selectShowPnlAfterFees);
  const displayedPnl = savedShowPnlAfterFees ? p.position.pnlAfterFees : p.position.pnl;
  const displayedPnlPercentage = savedShowPnlAfterFees ? p.position.pnlAfterFeesPercentage : p.position.pnlPercentage;
  const { minCollateralUsd } = usePositionsConstants();
  const tradeboxSelectedPositionKey = useSelector(selectTradeboxSelectedPositionKey);
  const isCurrentMarket = tradeboxSelectedPositionKey === p.position.key;

  const marketDecimals = useSelector(makeSelectMarketPriceDecimals(p.position.market.indexTokenAddress));

  function renderNetValue() {
    return (
      <TooltipWithPortal
        handle={formatUsd(p.position.netValue)}
        handleClassName="numbers"
        position={p.isLarge ? "bottom-start" : "bottom-end"}
        renderContent={() => (
          <div>
            <Trans>Net value is the amount held in the position inclusive of PnL, fees and net price impact.</Trans>
            <br />
            <br />
            <StatsTooltipRow
              label={t`Initial Collateral`}
              value={formatUsd(p.position.collateralUsd) || "..."}
              valueClassName="numbers"
              showDollar={false}
            />
            <StatsTooltipRow
              label={t`PnL`}
              value={formatDeltaUsd(p.position?.pnl) || "..."}
              valueClassName="numbers"
              showDollar={false}
              textClassName={getPositiveOrNegativeClass(p.position.pnl)}
            />
            <StatsTooltipRow
              label={t`Borrow Fee`}
              value={formatUsd(-p.position.pendingBorrowingFeesUsd) || "..."}
              valueClassName="numbers"
              showDollar={false}
              textClassName={cx({
                "text-red-500": p.position.pendingBorrowingFeesUsd !== 0n,
              })}
            />
            <StatsTooltipRow
              label={t`Negative Funding Fee`}
              value={formatUsd(-p.position.pendingFundingFeesUsd) || "..."}
              valueClassName="numbers"
              showDollar={false}
              textClassName={cx({
                "text-red-500": p.position.pendingFundingFeesUsd !== 0n,
              })}
            />
            {breakdownNetPriceImpactEnabled ? (
              <>
                <StatsTooltipRow
                  label={t`Stored Price Impact`}
                  value={formatDeltaUsd(p.position.pendingImpactUsd) || "..."}
                  showDollar={false}
                  textClassName={getPositiveOrNegativeClass(p.position.pendingImpactUsd)}
                />
                <StatsTooltipRow
                  label={t`Close Price Impact`}
                  value={formatDeltaUsd(p.position.closePriceImpactDeltaUsd) || "..."}
                  showDollar={false}
                  textClassName={getPositiveOrNegativeClass(p.position.closePriceImpactDeltaUsd)}
                />
                <StatsTooltipRow
                  label={t`Net Price Impact`}
                  value={formatDeltaUsd(p.position.netPriceImapctDeltaUsd) || "..."}
                  showDollar={false}
                  textClassName={getPositiveOrNegativeClass(p.position.netPriceImapctDeltaUsd)}
                />
              </>
            ) : (
              <StatsTooltipRow
                label={t`Net Price Impact`}
                value={formatDeltaUsd(p.position.netPriceImapctDeltaUsd) || "..."}
                showDollar={false}
                textClassName={getPositiveOrNegativeClass(p.position.netPriceImapctDeltaUsd)}
              />
            )}

            {p.position.priceImpactDiffUsd !== 0n && (
              <StatsTooltipRow
                label={t`Price Impact Rebates`}
                value={formatDeltaUsd(p.position.priceImpactDiffUsd) || "..."}
                showDollar={false}
                textClassName={cx({
                  "text-green-500": p.position.priceImpactDiffUsd !== 0n,
                })}
              />
            )}

            <StatsTooltipRow
              label={t`Close Fee`}
              showDollar={false}
              value={formatUsd(-p.position.closingFeeUsd) || "..."}
              valueClassName="numbers"
              textClassName="text-red-500"
            />
            {p.position.uiFeeUsd > 0 && (
              <StatsTooltipRow
                label={t`UI Fee`}
                showDollar={false}
                value={formatUsd(-p.position.uiFeeUsd)}
                valueClassName="numbers"
                textClassName="text-red-500"
              />
            )}
            <br />
            <StatsTooltipRow
              label={t`PnL After Fees`}
              value={formatDeltaUsd(p.position.pnlAfterFees, p.position.pnlAfterFeesPercentage)}
              valueClassName="numbers"
              showDollar={false}
              textClassName={getPositiveOrNegativeClass(p.position.pnlAfterFees)}
            />
          </div>
        )}
      />
    );
  }

  const { fundingFeeRateUsd, borrowingFeeRateUsd } = useMemo(() => {
    if (!p.position.marketInfo) {
      return {
        fundingFeeRateUsd: undefined,
        borrowingFeeRateUsd: undefined,
      };
    }

    return {
      fundingFeeRateUsd: getFundingFeeRateUsd(
        p.position.marketInfo,
        p.position.isLong,
        p.position.sizeInUsd,
        BigInt(CHART_PERIODS["1d"])
      ),
      borrowingFeeRateUsd: getBorrowingFeeRateUsd(
        p.position.marketInfo,
        p.position.isLong,
        p.position.sizeInUsd,
        BigInt(CHART_PERIODS["1d"])
      ),
    };
  }, [p.position.marketInfo, p.position.isLong, p.position.sizeInUsd]);

  function renderCollateral() {
    return (
      <div className="flex flex-col gap-4">
        <div className={cx("position-list-collateral", { isSmall: !p.isLarge })}>
          <TooltipWithPortal
            handle={formatUsd(p.position.remainingCollateralUsd)}
            handleClassName={cx("numbers", { negative: p.position.hasLowCollateral })}
            position={p.isLarge ? "bottom-start" : "bottom-end"}
            className="PositionItem-collateral-tooltip"
            content={
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
                    <AmountWithUsdBalance
                      amount={p.position.collateralAmount}
                      decimals={p.position.collateralToken.decimals}
                      symbol={p.position.collateralToken.symbol}
                      usd={p.position.collateralUsd}
                      isStable={p.position.collateralToken.isStable}
                    />
                  }
                  showDollar={false}
                />
                <br />
                <StatsTooltipRow
                  label={t`Borrow Fee`}
                  showDollar={false}
                  value={formatUsd(-p.position.pendingBorrowingFeesUsd) || "..."}
                  valueClassName="numbers"
                  textClassName={cx({
                    "text-red-500": p.position.pendingBorrowingFeesUsd !== 0n,
                  })}
                />
                <StatsTooltipRow
                  label={t`Negative Funding Fee`}
                  showDollar={false}
                  value={formatDeltaUsd(-p.position.pendingFundingFeesUsd) || "..."}
                  valueClassName="numbers"
                  textClassName={cx({
                    "text-red-500": p.position.pendingFundingFeesUsd !== 0n,
                  })}
                />
                <StatsTooltipRow
                  label={t`Positive Funding Fee`}
                  showDollar={false}
                  value={formatDeltaUsd(p.position.pendingClaimableFundingFeesUsd) || "..."}
                  valueClassName="numbers"
                  textClassName={cx({
                    "text-green-500": p.position.pendingClaimableFundingFeesUsd > 0,
                  })}
                />
                <br />
                <StatsTooltipRow
                  showDollar={false}
                  label={t`Current Borrow Fee / Day`}
                  value={borrowingFeeRateUsd !== undefined ? formatUsd(-borrowingFeeRateUsd) : "..."}
                  valueClassName="numbers"
                  textClassName={cx({
                    "text-red-500": borrowingFeeRateUsd !== undefined && borrowingFeeRateUsd > 0,
                  })}
                />
                <StatsTooltipRow
                  showDollar={false}
                  label={t`Current Funding Fee / Day`}
                  value={formatDeltaUsd(fundingFeeRateUsd)}
                  valueClassName="numbers"
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
            }
          />

          {!p.position.isOpening && !p.hideActions && p.onEditCollateralClick && (
            <span className="edit-icon" onClick={p.onEditCollateralClick} data-qa="position-edit-button">
              <EditIcon className="text-typography-secondary" width={16} height={16} />
            </span>
          )}
        </div>

        <div className="muted text-body-small numbers">
          (
          {formatBalanceAmount(
            p.position.remainingCollateralAmount,
            p.position.collateralToken.decimals,
            p.position.collateralToken.symbol,
            { isStable: p.position.collateralToken.isStable }
          )}
          )
        </div>
      </div>
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
              valueClassName="numbers"
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
        <TooltipWithPortal
          handle={
            p.position.liquidationPrice
              ? formatLiquidationPrice(p.position.liquidationPrice, {
                  displayDecimals: marketDecimals,
                  visualMultiplier: p.position.indexToken.visualMultiplier,
                })
              : "..."
          }
          handleClassName={cx("numbers", {
            "LiqPrice-soft-warning": estimatedLiquidationHours && estimatedLiquidationHours < 24 * 7,
            "LiqPrice-hard-warning": estimatedLiquidationHours && estimatedLiquidationHours < 24,
          })}
          position="bottom-end"
          renderContent={getLiqPriceTooltipContent}
        />
      );
    }

    return (
      <span className="numbers">
        {formatLiquidationPrice(p.position.liquidationPrice, {
          displayDecimals: marketDecimals,
          visualMultiplier: p.position.indexToken.visualMultiplier,
        }) || "..."}
      </span>
    );
  }

  function renderLarge() {
    const { indexName, poolName } = p.position;
    const qaAttr = `position-item-${indexName}-${poolName}-${p.position.isLong ? "Long" : "Short"}`;

    return (
      <TableTr hoverable={true} data-qa={qaAttr}>
        <TableTd
          data-qa="position-handle"
          className={cx("flex", {
            "shadow-[inset_2px_0_0] shadow-cold-blue-500": isCurrentMarket,
          })}
          onClick={() => p.onSelectPositionClick?.()}
        >
          {/* title */}
          <div className={cx("Position-item-info relative")}>
            <div className="Exchange-list-title">
              <TooltipWithPortal
                handle={
                  <>
                    <TokenIcon
                      className="PositionList-token-icon"
                      symbol={p.position.indexToken.symbol}
                      displaySize={20}
                    />
                    <span className="font-medium">
                      {getMarketIndexName({ indexToken: p.position.indexToken, isSpotOnly: false })}
                    </span>
                  </>
                }
                position="bottom-start"
                renderContent={() => (
                  <div>
                    <StatsTooltipRow
                      label={t`Pool`}
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
                      <Trans>Click on the position to select it, then use the trade box to increase it.</Trans>
                      <br />
                      <br />
                      <Trans>Use the "Close" button to reduce your position via market, TP/SL, or TWAP orders.</Trans>
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
                <SpinnerIcon data-qa="position-loading" className="spin position-loading-icon" />
              )}
            </div>
            <div className="Exchange-list-info-label">
              <span className={cx("muted mr-4 rounded-2 px-2 pb-1 numbers")}>
                {formatLeverage(p.position.leverage) || "..."}
              </span>
              <span className={cx({ positive: p.position.isLong, negative: !p.position.isLong })}>
                {p.position.isLong ? t`Long` : t`Short`}
              </span>
            </div>
          </div>
        </TableTd>
        <TableTd>
          <div className="flex flex-col gap-2">
            <span className="numbers">{formatUsd(p.position.sizeInUsd)}</span>
            <PositionItemOrdersLarge positionKey={p.position.key} onOrdersClick={p.onOrdersClick} />
          </div>
        </TableTd>
        <TableTd>
          {/* netValue */}
          {p.position.isOpening ? (
            t`Opening...`
          ) : (
            <div className="flex flex-col gap-4">
              {renderNetValue()}
              {displayedPnl !== undefined && (
                <div
                  className={cx("text-body-small flex items-center gap-2 numbers", {
                    positive: displayedPnl > 0,
                    negative: displayedPnl < 0,
                    muted: displayedPnl == 0n,
                    "cursor-pointer": Boolean(p.onShareClick),
                  })}
                  onClick={p.onShareClick}
                >
                  {formatDeltaUsd(displayedPnl, displayedPnlPercentage)}
                  {p.onShareClick && <NewLinkThinIcon className="mt-1 size-14" />}
                </div>
              )}
            </div>
          )}
        </TableTd>
        <TableTd>
          {/* collateral */}
          <div>{renderCollateral()}</div>
        </TableTd>
        <TableTd>
          {/* entryPrice */}
          {p.position.isOpening ? (
            t`Opening...`
          ) : (
            <span className="numbers">
              {formatUsd(p.position.entryPrice, {
                displayDecimals: marketDecimals,
                visualMultiplier: p.position.indexToken.visualMultiplier,
              })}
            </span>
          )}
        </TableTd>
        <TableTd>
          {/* markPrice */}
          <span className="numbers">
            {formatUsd(p.position.markPrice, {
              displayDecimals: marketDecimals,
              visualMultiplier: p.position.indexToken.visualMultiplier,
            })}
          </span>
        </TableTd>
        <TableTd>
          {/* liqPrice */}
          {renderLiquidationPrice()}
        </TableTd>
        {/* Close */}
        {!p.hideActions && (
          <>
            {!p.position.isOpening ? (
              <TableTd>
                <div className="flex items-center justify-end gap-4">
                  <Button
                    variant="ghost"
                    onClick={p.onClosePositionClick}
                    disabled={p.position.sizeInUsd == 0n}
                    data-qa="position-close-button"
                  >
                    <Trans>Close</Trans>
                  </Button>

                  <PositionDropdown
                    handleEditCollateral={p.onEditCollateralClick}
                    handleMarketSelect={() => p.onSelectPositionClick?.()}
                    handleMarketIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Market)}
                    handleShare={p.onShareClick}
                    handleLimitIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Limit)}
                    handleStopMarketIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.StopMarket)}
                    handleTriggerClose={() => p.onSelectPositionClick?.(TradeMode.Trigger)}
                  />
                </div>
              </TableTd>
            ) : (
              <TableTd />
            )}
          </>
        )}
      </TableTr>
    );
  }

  function renderSmall() {
    const { indexName, poolName } = p.position;

    return (
      <AppCard dataQa="position-item">
        <AppCardSection onClick={() => p.onSelectPositionClick?.()}>
          <div className="text-body-medium flex items-center gap-8">
            <span
              className={cx("text-body-medium relative flex items-center gap-4 font-medium", {
                "after:absolute after:-left-10 after:top-[50%] after:h-16 after:w-2 after:-translate-y-[50%] after:bg-blue-300":
                  isCurrentMarket,
              })}
            >
              <TokenIcon symbol={p.position.indexToken?.symbol} displaySize={16} />
              {getMarketIndexName({ indexToken: p.position.indexToken, isSpotOnly: false })}
            </span>
            <div className="text-body-small flex items-center gap-4">
              <span className="rounded-4 leading-1">{formatLeverage(p.position.leverage) || "..."}</span>
              <span
                className={cx("Exchange-list-side", {
                  positive: p.position.isLong,
                  negative: !p.position.isLong,
                })}
              >
                {p.position.isLong ? t`Long` : t`Short`}
              </span>
            </div>
            {p.position.pendingUpdate && <SpinnerIcon className="spin position-loading-icon" />}
          </div>
        </AppCardSection>
        <AppCardSection>
          {showDebugValues && (
            <div className="App-card-row">
              <div className="font-medium text-typography-secondary">Key</div>
              <div className="debug-key muted">{p.position.contractKey}</div>
            </div>
          )}
          <div className="App-card-row">
            <div className="font-medium text-typography-secondary">
              <Trans>Pool</Trans>
            </div>
            <div>
              <div className="flex items-start">
                <span>{indexName && indexName}</span>
                <span className="subtext">{poolName && `[${poolName}]`}</span>
              </div>
            </div>
          </div>
          <div className="App-card-row">
            <div className="font-medium text-typography-secondary">
              <Trans>Size</Trans>
            </div>
            <div className="numbers">{formatUsd(p.position.sizeInUsd)}</div>
          </div>
          <div className="App-card-row">
            <div className="font-medium text-typography-secondary">
              <Trans>Net Value</Trans>
            </div>
            <div>{renderNetValue()}</div>
          </div>
          <div className="App-card-row">
            <div className="font-medium text-typography-secondary">
              {savedShowPnlAfterFees ? t`PnL After Fees` : t`PnL`}
            </div>
            <div>
              <span
                className={cx("flex items-center gap-2 numbers", {
                  positive: displayedPnl > 0,
                  negative: displayedPnl < 0,
                  muted: displayedPnl == 0n,
                  "cursor-pointer": Boolean(p.onShareClick),
                })}
                onClick={p.onShareClick}
              >
                {formatDeltaUsd(displayedPnl, displayedPnlPercentage)}
                {p.onShareClick && <NewLinkThinIcon className="mt-2 size-16" />}
              </span>
            </div>
          </div>
          <div className="App-card-row">
            <div className="font-medium text-typography-secondary">
              <Trans>Collateral</Trans>
            </div>
            <div>{renderCollateral()}</div>
          </div>
        </AppCardSection>
        <AppCardSection>
          <div className="App-card-row">
            <div className="font-medium text-typography-secondary">
              <Trans>Entry Price</Trans>
            </div>
            <div className="numbers">
              {formatUsd(p.position.entryPrice, {
                displayDecimals: marketDecimals,
                visualMultiplier: p.position.indexToken.visualMultiplier,
              })}
            </div>
          </div>
          <div className="App-card-row">
            <div className="font-medium text-typography-secondary">
              <Trans>Mark Price</Trans>
            </div>
            <div className="numbers">
              {formatUsd(p.position.markPrice, {
                displayDecimals: marketDecimals,
                visualMultiplier: p.position.indexToken.visualMultiplier,
              })}
            </div>
          </div>
          <div className="App-card-row">
            <div className="font-medium text-typography-secondary">
              <Trans>Liq. Price</Trans>
            </div>
            <div>{renderLiquidationPrice()}</div>
          </div>
        </AppCardSection>
        <AppCardSection>
          <div className="font-medium text-typography-secondary">
            <Trans>Orders</Trans>
          </div>

          <PositionItemOrdersSmall positionKey={p.position.key} onOrdersClick={p.onOrdersClick} />
        </AppCardSection>

        {!p.hideActions && (
          <AppCardSection>
            <div className="flex items-center justify-between">
              <div className="flex gap-8">
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
                    p.onSelectPositionClick?.(TradeMode.Trigger, true);
                  }}
                >
                  <Trans>TP/SL</Trans>
                </Button>
              </div>
              <div>
                {!p.position.isOpening && !p.hideActions && (
                  <PositionDropdown
                    handleMarketSelect={() => p.onSelectPositionClick?.()}
                    handleMarketIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Market, true)}
                    handleShare={p.onShareClick}
                    handleLimitIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Limit, true)}
                    handleStopMarketIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.StopMarket, true)}
                  />
                )}
              </div>
            </div>
          </AppCardSection>
        )}
      </AppCard>
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
      <TooltipWithPortal
        className="Position-list-active-orders"
        handle={
          <>
            <Trans>Orders ({ordersWithErrors.length})</Trans>
            {ordersWarningsList.length > 0 || ordersErrorList.length > 0 ? (
              <div
                className={cx("relative top-3 size-6 rounded-full", {
                  "bg-yellow-300": ordersWarningsList.length > 0 && !ordersErrorList.length,
                  "bg-red-500": ordersErrorList.length > 0,
                })}
              />
            ) : null}
          </>
        }
        position="bottom"
        handleClassName={cx([
          "Exchange-list-info-label",
          "Exchange-position-list-orders",
          "clickable",
          "text-typography-secondary",
        ])}
        maxAllowedWidth={370}
        tooltipClassName="!z-10 w-[370px]"
        content={
          <div className="flex max-h-[350px] cursor-auto flex-col gap-8 overflow-y-auto leading-base">
            <div className="font-medium">
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
  const [, setEditingOrderState] = useEditingOrderState();
  const [isCancelling, cancel] = useCancelOrder(order);
  const handleOrdersClick = useCallback(() => {
    onOrdersClick?.(order.key);
  }, [onOrdersClick, order.key]);

  const errors = orderErrors.errors;

  const handleEditClick = useCallback(() => {
    setEditingOrderState({ orderKey: order.key, source: "PositionsList" });
  }, [order.key, setEditingOrderState]);

  const oracleSettings = useSelector(selectOracleSettings);
  const disabledCancelMarketOrderMessage = useDisabledCancelMarketOrderMessage(order, oracleSettings);

  const isDisabled = isCancelling || Boolean(disabledCancelMarketOrderMessage);

  const cancelButton = (
    <Button variant="secondary" disabled={isDisabled} onClick={cancel} className="px-8">
      <CloseIcon className="size-16" />
    </Button>
  );

  return (
    <div key={order.key}>
      <div className="flex items-start justify-between gap-6">
        <Button variant="secondary" className="w-full !justify-start !pl-12" onClick={handleOrdersClick}>
          <div className="flex items-center justify-between">
            <PositionItemOrderText order={order} />
            <ChevronRightIcon className="ml-4 size-14" />
          </div>
        </Button>
        {!isTwapOrder(order) && !isMarketOrderType(order.orderType) && (
          <Button variant="secondary" onClick={handleEditClick} className="px-8">
            <EditIcon className="size-16" />
          </Button>
        )}
        {disabledCancelMarketOrderMessage ? (
          <TooltipWithPortal handle={cancelButton} content={disabledCancelMarketOrderMessage} />
        ) : (
          cancelButton
        )}
      </div>

      {errors.length !== 0 && (
        <div className="mt-8 flex flex-col gap-8 text-start">
          {errors.map((err) => (
            <div
              key={err.key}
              className={cx("hyphens-auto [overflow-wrap:anywhere]", {
                "text-red-500": err.level === "error",
                "text-yellow-300": err.level === "warning",
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
  const triggerThresholdType = order.triggerThresholdType;
  const isIncrease = isIncreaseOrderType(order.orderType);
  const isTwap = isTwapOrder(order);

  return (
    <div key={order.key} className="text-start">
      {getNameByOrderType(order.orderType, order.isTwap, { abbr: true })}
      {!isTwap && !isMarketOrderType(order.orderType) ? `: ${triggerThresholdType} ` : null}
      {!isTwap && !isMarketOrderType(order.orderType) && (
        <span className="numbers">
          {formatUsd(order.triggerPrice, {
            displayDecimals: calculateDisplayDecimals(
              order.triggerPrice,
              undefined,
              order.indexToken?.visualMultiplier
            ),
            visualMultiplier: order.indexToken?.visualMultiplier,
          })}
        </span>
      )}
      :{" "}
      <span className="numbers">
        {isIncrease ? "+" : "-"}
        {formatUsd(order.sizeDeltaUsd)} {isTwapOrder(order) && <TwapOrderProgress order={order} />}
      </span>
    </div>
  );
}
