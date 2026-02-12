import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { usePositionsConstants } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectShowPnlAfterFees } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
import { selectTradeboxSelectedPositionKey } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getBorrowingFeeRateUsd, getFundingFeeRateUsd } from "domain/synthetics/fees";
import {
  PositionInfo,
  formatEstimatedLiquidationTime,
  formatLeverage,
  formatLiquidationPrice,
  getEstimatedLiquidationTimeInHours,
} from "domain/synthetics/positions";
import { TradeMode } from "domain/synthetics/trade";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { CHART_PERIODS } from "lib/legacy";
import { formatBalanceAmount, formatDeltaUsd, formatUsd } from "lib/numbers";
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

import EditIcon from "img/ic_edit.svg?react";
import NewLinkThinIcon from "img/ic_new_link_thin.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

import { PositionItemOrdersLarge, PositionItemOrdersSmall } from "./PositionItemOrders";
import { PositionItemTPSLCell } from "./PositionItemTPSLCell";
import { TPSLModal } from "../TPSLModal/TPSLModal";

import "./PositionItem.scss";

export type Props = {
  position: PositionInfo;
  hideActions?: boolean;
  showPnlAfterFees: boolean;
  onClosePositionClick?: (orderOption?: OrderOption) => void;
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
  const [showSizeInTokens, setShowSizeInTokens] = useState(false);
  const [isTPSLModalVisible, setIsTPSLModalVisible] = useState(false);
  const [tpslInitialView, setTpslInitialView] = useState<"list" | "add">("list");
  const isActionsDisabled = p.position.isOpening;
  const isCloseDisabled = isActionsDisabled || p.position.sizeInUsd == 0n;

  const marketDecimals = useSelector(makeSelectMarketPriceDecimals(p.position.market.indexTokenAddress));

  const handleSizeClick = useCallback(() => {
    setShowSizeInTokens((prev) => !prev);
  }, []);

  const handleOpenTPSLModal = useCallback(() => {
    setTpslInitialView("list");
    setIsTPSLModalVisible(true);
  }, []);

  const handleOpenAddTPSLModal = useCallback(() => {
    setTpslInitialView("add");
    setIsTPSLModalVisible(true);
  }, []);

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
                      <Trans>Use the TP/SL button to set TP/SL orders.</Trans>
                      <br />
                      <br />
                      <Trans>Use the "Close" button to reduce your position via market or TWAP orders.</Trans>
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
            <span className="cursor-pointer select-none numbers" onClick={handleSizeClick}>
              {showSizeInTokens
                ? formatBalanceAmount(
                    p.position.sizeInTokens,
                    p.position.indexToken.decimals,
                    p.position.indexToken.symbol
                  )
                : formatUsd(p.position.sizeInUsd)}
            </span>
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
                  {p.onShareClick && <NewLinkThinIcon className="mt-1 size-14 shrink-0" />}
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
        {!p.hideActions && (
          <TableTd className="w-[9%]">
            <PositionItemTPSLCell
              positionKey={p.position.key}
              markPrice={p.position.markPrice}
              marketDecimals={marketDecimals}
              visualMultiplier={p.position.indexToken.visualMultiplier}
              isLarge={true}
              onOpenTPSLModal={handleOpenTPSLModal}
              isDisabled={isActionsDisabled}
            />
          </TableTd>
        )}
        {!p.hideActions && (
          <TableTd>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => p.onClosePositionClick?.(OrderOption.Market)}
                  disabled={isCloseDisabled}
                  data-qa="position-close-market-button"
                >
                  <Trans>Market</Trans>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => p.onClosePositionClick?.(OrderOption.Twap)}
                  disabled={isCloseDisabled}
                  data-qa="position-close-twap-button"
                >
                  <Trans>TWAP</Trans>
                </Button>
              </div>

              <PositionDropdown
                handleEditCollateral={p.onEditCollateralClick}
                handleMarketSelect={() => p.onSelectPositionClick?.()}
                handleMarketIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Market)}
                handleShare={p.onShareClick}
                handleLimitIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Limit)}
                handleStopMarketIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.StopMarket)}
                handleTwapIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Twap)}
                handleTriggerClose={handleOpenAddTPSLModal}
                disabled={isActionsDisabled}
              />
            </div>
          </TableTd>
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
            <div className="cursor-pointer select-none font-medium text-typography-secondary" onClick={handleSizeClick}>
              <Trans>Size</Trans>
            </div>
            <div className="cursor-pointer select-none numbers" onClick={handleSizeClick}>
              {showSizeInTokens
                ? formatBalanceAmount(
                    p.position.sizeInTokens,
                    p.position.indexToken.decimals,
                    p.position.indexToken.symbol
                  )
                : formatUsd(p.position.sizeInUsd)}
            </div>
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
                {p.onShareClick && <NewLinkThinIcon className="mt-2 size-16 shrink-0" />}
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
          {!p.hideActions && (
            <div className="App-card-row">
              <div className="font-medium text-typography-secondary">
                <Trans>TP/SL</Trans>
              </div>
              <div>
                <PositionItemTPSLCell
                  positionKey={p.position.key}
                  markPrice={p.position.markPrice}
                  marketDecimals={marketDecimals}
                  visualMultiplier={p.position.indexToken.visualMultiplier}
                  isLarge={false}
                  onOpenTPSLModal={handleOpenTPSLModal}
                  isDisabled={isActionsDisabled}
                />
              </div>
            </div>
          )}
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
                <Button
                  variant="secondary"
                  disabled={isCloseDisabled}
                  onClick={() => p.onClosePositionClick?.(OrderOption.Market)}
                >
                  <Trans>Market</Trans>
                </Button>
                <Button
                  variant="secondary"
                  disabled={isCloseDisabled}
                  onClick={() => p.onClosePositionClick?.(OrderOption.Twap)}
                >
                  <Trans>TWAP</Trans>
                </Button>
              </div>
              <div>
                <PositionDropdown
                  handleEditCollateral={p.onEditCollateralClick}
                  handleMarketSelect={() => p.onSelectPositionClick?.()}
                  handleMarketIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Market, true)}
                  handleShare={p.onShareClick}
                  handleLimitIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Limit, true)}
                  handleStopMarketIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.StopMarket, true)}
                  handleTwapIncreaseSize={() => p.onSelectPositionClick?.(TradeMode.Twap, true)}
                  handleTriggerClose={handleOpenAddTPSLModal}
                  disabled={isActionsDisabled}
                />
              </div>
            </div>
          </AppCardSection>
        )}
      </AppCard>
    );
  }

  return (
    <>
      {p.isLarge ? renderLarge() : renderSmall()}
      <TPSLModal
        isVisible={isTPSLModalVisible}
        setIsVisible={setIsTPSLModalVisible}
        position={p.position}
        initialView={tpslInitialView}
      />
    </>
  );
}
