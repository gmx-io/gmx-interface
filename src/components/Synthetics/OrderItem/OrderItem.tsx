import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo } from "react";
import { FaPen } from "react-icons/fa6";
import { MdClose } from "react-icons/md";

import { USD_DECIMALS } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useEditingOrderState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { useOrderErrors } from "context/SyntheticsStateContext/hooks/orderHooks";
import {
  selectChainId,
  selectMarketsInfoData,
  selectOracleSettings,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import {
  OrderInfo,
  PositionOrderInfo,
  SwapOrderInfo,
  TwapOrderInfo,
  isDecreaseOrderType,
  isIncreaseOrderType,
  isLimitOrderType,
  isMarketOrderType,
  isStopIncreaseOrderType,
  isStopLossOrderType,
  isSwapOrderType,
  isTwapOrder,
} from "domain/synthetics/orders";
import { useDisabledCancelMarketOrderMessage } from "domain/synthetics/orders/useDisabledCancelMarketOrderMessage";
import { PositionsInfoData, getNameByOrderType } from "domain/synthetics/positions";
import { adaptToV1TokenInfo, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { getMarkPrice } from "domain/synthetics/trade";
import { TokensRatioAndSlippage } from "domain/tokens";
import { getExchangeRate, getExchangeRateDisplay } from "lib/legacy";
import { calculateDisplayDecimals, formatAmount, formatBalanceAmount, formatUsd } from "lib/numbers";
import { getWrappedToken } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { MarketWithDirectionLabel } from "components/MarketWithDirectionLabel/MarketWithDirectionLabel";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { SwapMarketLabel } from "components/SwapMarketLabel/SwapMarketLabel";
import { TableTd, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import TwapOrdersList from "./TwapOrdersList/TwapOrdersList";
import { getSwapPathMarketFullNames, getSwapPathTokenSymbols } from "../TradeHistory/TradeHistoryRow/utils/swap";

import "./OrderItem.scss";

type Props = {
  order: OrderInfo;
  onToggleOrder?: () => void;
  onCancelOrder?: () => void;
  isSelected?: boolean;
  isCanceling?: boolean;
  hideActions?: boolean;
  isLarge: boolean;
  positionsInfoData?: PositionsInfoData;
  setRef?: (el: HTMLElement | null, orderKey: string) => void;
};

export function OrderItem(p: Props) {
  const { showDebugValues } = useSettings();

  const [, setEditingOrderState] = useEditingOrderState();

  const setEditingOrderKey = useCallback(() => {
    setEditingOrderState({ orderKey: p.order.key, source: "PositionsList" });
  }, [p.order.key, setEditingOrderState]);

  return p.isLarge ? (
    <OrderItemLarge
      order={p.order}
      hideActions={p.hideActions}
      showDebugValues={showDebugValues}
      onToggleOrder={p.onToggleOrder}
      setEditingOrderKey={setEditingOrderKey}
      onCancelOrder={p.onCancelOrder}
      isCanceling={p.isCanceling}
      isSelected={p.isSelected}
      setRef={p.setRef}
    />
  ) : (
    <OrderItemSmall
      order={p.order}
      showDebugValues={showDebugValues}
      hideActions={p.hideActions}
      onCancelOrder={p.onCancelOrder}
      setEditingOrderKey={setEditingOrderKey}
      isSelected={p.isSelected}
      onToggleOrder={p.onToggleOrder}
      setRef={p.setRef}
    />
  );
}

function Title({ order, showDebugValues }: { order: OrderInfo; showDebugValues: boolean | undefined }) {
  const chainId = useSelector(selectChainId);

  if (isSwapOrderType(order.orderType)) {
    if (showDebugValues) {
      return (
        <Tooltip
          disableHandleStyle
          handle={<TitleWithIcon bordered order={order} />}
          position="bottom-start"
          content={
            <>
              <StatsTooltipRow
                label={"Key"}
                value={<div className="debug-key muted">{order.key}</div>}
                showDollar={false}
              />
              <StatsTooltipRow
                label={"Amount"}
                value={<div className="debug-key muted">{order.minOutputAmount.toString()}</div>}
                showDollar={false}
              />
            </>
          }
        />
      );
    }

    return <TitleWithIcon order={order} />;
  }

  const positionOrder = order as PositionOrderInfo;
  const isCollateralSwap =
    positionOrder.shouldUnwrapNativeToken ||
    positionOrder.initialCollateralToken.address !== positionOrder.targetCollateralToken.address;

  const wrappedToken = getWrappedToken(chainId);

  function getCollateralLabel() {
    if (isDecreaseOrderType(positionOrder.orderType)) {
      return t`Collateral Delta`;
    }
    return t`Collateral`;
  }

  function getCollateralText() {
    const collateralUsd = convertToUsd(
      positionOrder.initialCollateralDeltaAmount,
      positionOrder.initialCollateralToken.decimals,
      positionOrder.initialCollateralToken.prices.minPrice
    )!;

    const targetCollateralAmount = convertToTokenAmount(
      collateralUsd,
      positionOrder.targetCollateralToken.decimals,
      positionOrder.targetCollateralToken.prices.minPrice
    )!;

    const decreaseMultiplier = isDecreaseOrderType(positionOrder.orderType) ? -1n : 1n;

    const signedTargetCollateralAmount = targetCollateralAmount * decreaseMultiplier;

    const tokenAmountText = formatBalanceAmount(
      signedTargetCollateralAmount,
      positionOrder.targetCollateralToken.decimals,
      positionOrder.targetCollateralToken.isNative ? wrappedToken.symbol : positionOrder.targetCollateralToken.symbol,
      { isStable: positionOrder.targetCollateralToken.isStable }
    );

    return `${tokenAmountText}`;
  }

  return (
    <Tooltip
      disableHandleStyle
      handle={<TitleWithIcon bordered order={order} />}
      position="bottom-start"
      tooltipClassName={isTwapOrder(order) ? "!p-0" : undefined}
      maxAllowedWidth={400}
      styleType="none"
      content={
        isTwapOrder(order) ? (
          <TwapOrdersList order={order} />
        ) : (
          <>
            <StatsTooltipRow label={getCollateralLabel()} value={getCollateralText()} showDollar={false} />

            {isCollateralSwap && (
              <div className="OrderItem-tooltip-row">
                <Trans>
                  {formatBalanceAmount(
                    positionOrder.initialCollateralDeltaAmount,
                    positionOrder.initialCollateralToken.decimals,
                    positionOrder.initialCollateralToken[
                      positionOrder.shouldUnwrapNativeToken ? "baseSymbol" : "symbol"
                    ],
                    { isStable: positionOrder.initialCollateralToken.isStable }
                  )}{" "}
                  will be swapped to{" "}
                  {positionOrder.targetCollateralToken.isNative
                    ? wrappedToken.symbol
                    : positionOrder.targetCollateralToken.symbol}{" "}
                  on order execution.
                </Trans>
              </div>
            )}

            {showDebugValues && (
              <div className="OrderItem-tooltip-row">
                <StatsTooltipRow
                  label={"Key"}
                  value={<div className="debug-key muted">{positionOrder.key}</div>}
                  showDollar={false}
                />
              </div>
            )}
          </>
        )
      }
    />
  );
}

export function TwapOrderProgress({ order, className }: { order: TwapOrderInfo; className?: string }) {
  const content = ` (${order.numberOfParts - order.orders.length}/${order.numberOfParts})`;
  return <span className={className}>{content}</span>;
}

export function TitleWithIcon({ order, bordered }: { order: OrderInfo; bordered?: boolean }) {
  if (isSwapOrderType(order.orderType)) {
    const { initialCollateralToken, targetCollateralToken, minOutputAmount, initialCollateralDeltaAmount } = order;

    const fromTokenText = formatBalanceAmount(
      initialCollateralDeltaAmount,
      initialCollateralToken.decimals,
      undefined,
      {
        isStable: initialCollateralToken.isStable,
      }
    );
    const fromTokenIcon = <TokenIcon symbol={initialCollateralToken.symbol} displaySize={18} importSize={24} />;

    const toTokenText = formatBalanceAmount(minOutputAmount, targetCollateralToken.decimals, undefined, {
      isStable: targetCollateralToken.isStable,
    });
    const toTokenIcon = <TokenIcon symbol={targetCollateralToken.symbol} displaySize={18} importSize={24} />;

    const handle = (
      <span className="font-medium">
        <Trans>
          <span>{fromTokenText} </span>
          {fromTokenIcon}
          <span> to </span>
          {isTwapOrder(order) ? null : <span>{toTokenText} </span>}
          {toTokenIcon}
          {isTwapOrder(order) ? <TwapOrderProgress order={order} className="font-normal text-slate-100" /> : null}
        </Trans>
      </span>
    );

    return (
      <div
        className={cx("inline-flex flex-wrap gap-y-8 whitespace-pre-wrap", {
          "cursor-help *:border-b *:border-dashed *:border-b-gray-400": bordered,
        })}
      >
        {isTwapOrder(order) ? (
          <Tooltip
            handle={handle}
            position="bottom-start"
            content={<TwapOrdersList order={order} />}
            tooltipClassName="!p-0"
            maxAllowedWidth={450}
            styleType="none"
          />
        ) : (
          handle
        )}
      </div>
    );
  }

  const { sizeDeltaUsd } = order;
  const sizeText = formatUsd(sizeDeltaUsd * (isIncreaseOrderType(order.orderType) ? 1n : -1n), {
    displayPlus: true,
  });

  return (
    <span
      className={cx("font-medium", {
        "cursor-help border-b border-dashed border-b-gray-400": bordered,
      })}
    >
      {sizeText} {isTwapOrder(order) && <TwapOrderProgress order={order} className="text-slate-100" />}
    </span>
  );
}

function MarkPrice({ order }: { order: OrderInfo }) {
  const markPrice = useMemo(() => {
    if (isSwapOrderType(order.orderType)) {
      return undefined;
    }

    const positionOrder = order as PositionOrderInfo;

    return getMarkPrice({
      prices: positionOrder.indexToken.prices,
      isIncrease: isIncreaseOrderType(positionOrder.orderType),
      isLong: positionOrder.isLong,
    });
  }, [order]);

  const positionOrder = order as PositionOrderInfo;
  const priceDecimals = calculateDisplayDecimals(
    positionOrder.indexToken?.prices?.minPrice,
    undefined,
    positionOrder.indexToken?.visualMultiplier
  );

  const markPriceFormatted = useMemo(() => {
    return formatUsd(markPrice, {
      displayDecimals: priceDecimals,
      visualMultiplier: positionOrder.indexToken?.visualMultiplier,
    });
  }, [markPrice, priceDecimals, positionOrder.indexToken?.visualMultiplier]);

  if (isTwapOrder(order) || isMarketOrderType(order.orderType)) {
    const { markSwapRatioText } = getSwapRatioText(order);

    return (
      <Tooltip
        handle={
          <span className="font-medium">
            {isSwapOrderType(order.orderType) ? markSwapRatioText : markPriceFormatted}
          </span>
        }
        position="bottom-end"
        content={
          <Trans>
            Note that there may be rare cases where the order cannot be executed, for example, if the chain is down and
            no oracle reports are produced or if there is not enough available liquidity.
          </Trans>
        }
      />
    );
  }

  if (isSwapOrderType(order.orderType)) {
    const { markSwapRatioText } = getSwapRatioText(order);

    return <span className="font-medium">{markSwapRatioText}</span>;
  } else {
    const positionOrder = order as PositionOrderInfo;

    return (
      <Tooltip
        handle={<span className="font-medium">{markPriceFormatted}</span>}
        position="bottom-end"
        renderContent={() => {
          return (
            <Trans>
              <p>
                The order will be executed when the oracle price is {positionOrder.triggerThresholdType}{" "}
                {formatUsd(positionOrder.triggerPrice, {
                  displayDecimals: priceDecimals,
                  visualMultiplier: positionOrder.indexToken?.visualMultiplier,
                })}
                .
              </p>
              <br />
              <p>
                Note that there may be rare cases where the order cannot be executed, for example, if the chain is down
                and no oracle reports are produced or if the price impact exceeds your acceptable price.
              </p>
            </Trans>
          );
        }}
      />
    );
  }
}

function TriggerPrice({ order, hideActions }: { order: OrderInfo; hideActions: boolean | undefined }) {
  if (isTwapOrder(order)) {
    return (
      <span className="font-medium">
        <Trans>N/A</Trans>
      </span>
    );
  }

  if (isMarketOrderType(order.orderType)) {
    const positionOrder = order as PositionOrderInfo;
    const priceDecimals = calculateDisplayDecimals(
      positionOrder?.indexToken?.prices?.minPrice,
      undefined,
      positionOrder?.indexToken?.visualMultiplier
    );

    return (
      <Tooltip
        position="bottom-end"
        handle={
          <span className="font-medium">
            <Trans>N/A</Trans>
          </span>
        }
        content={
          <StatsTooltipRow
            label={t`Acceptable Price`}
            value={formatUsd(positionOrder.acceptablePrice, {
              displayDecimals: priceDecimals,
              visualMultiplier: positionOrder.indexToken?.visualMultiplier,
            })}
            showDollar={false}
          />
        }
      />
    );
  }

  if (isSwapOrderType(order.orderType)) {
    const swapOrder = order as SwapOrderInfo;
    const toAmount = swapOrder.minOutputAmount;
    const toToken = order.targetCollateralToken;
    const toAmountText = formatBalanceAmount(toAmount, toToken.decimals, toToken.symbol, {
      isStable: toToken.isStable,
    });
    const { swapRatioText, acceptablePriceText } = getSwapRatioText(order);

    return (
      <>
        {!hideActions ? (
          <Tooltip
            position="bottom-end"
            handle={<span className="font-medium">{swapRatioText}</span>}
            renderContent={() => (
              <>
                <div className="pb-8">
                  <StatsTooltipRow label={t`Acceptable Price`} value={acceptablePriceText} showDollar={false} />
                </div>
                {t`You will receive at least ${toAmountText} if this order is executed. This price is being updated in real time based on swap fees and price impact.`}
              </>
            )}
          />
        ) : (
          swapRatioText
        )}
      </>
    );
  } else {
    const positionOrder = order as PositionOrderInfo;
    const priceDecimals = calculateDisplayDecimals(
      positionOrder?.indexToken?.prices?.minPrice,
      undefined,
      positionOrder?.indexToken?.visualMultiplier
    );
    return (
      <Tooltip
        handle={
          <span className="font-medium">
            {`${positionOrder.triggerThresholdType} ${formatUsd(positionOrder.triggerPrice, {
              displayDecimals: priceDecimals,
              visualMultiplier: positionOrder.indexToken?.visualMultiplier,
            })}`}
          </span>
        }
        position="bottom-end"
        renderContent={() => (
          <>
            <StatsTooltipRow
              label={t`Acceptable Price`}
              value={
                isStopLossOrderType(positionOrder.orderType) || isStopIncreaseOrderType(positionOrder.orderType)
                  ? "NA"
                  : `${positionOrder.triggerThresholdType} ${formatUsd(positionOrder.acceptablePrice, {
                      displayDecimals: priceDecimals,
                      visualMultiplier: positionOrder.indexToken?.visualMultiplier,
                    })}`
              }
              showDollar={false}
            />
          </>
        )}
      />
    );
  }
}

function OrderItemLarge({
  order,
  setRef,
  hideActions,
  onToggleOrder,
  showDebugValues,
  setEditingOrderKey,
  onCancelOrder,
  isCanceling,
  isSelected,
}: {
  order: OrderInfo;
  setRef?: (el: HTMLElement | null, orderKey: string) => void;
  hideActions: boolean | undefined;
  showDebugValues: boolean | undefined;
  onToggleOrder: undefined | (() => void);
  setEditingOrderKey: undefined | (() => void);
  onCancelOrder: undefined | (() => void);
  isCanceling: boolean | undefined;
  isSelected: boolean | undefined;
}) {
  const marketInfoData = useSelector(selectMarketsInfoData);
  const isSwap = isSwapOrderType(order.orderType);
  const { indexName, poolName, tokenSymbol } = useMemo(() => {
    const marketInfo = marketInfoData?.[order.marketAddress];

    if (!marketInfo || isSwap)
      return {
        indexName: "...",
        tokenSymbol: "...",
      };
    return {
      indexName: getMarketIndexName(marketInfo),
      poolName: getMarketPoolName(marketInfo),
      tokenSymbol: marketInfo.indexToken.symbol,
    };
  }, [isSwap, marketInfoData, order.marketAddress]);

  const { swapPathTokenSymbols, swapPathMarketFullNames } = useMemo(() => {
    if (!isSwap) return {};
    const swapPathTokenSymbols = getSwapPathTokenSymbols(marketInfoData, order.initialCollateralToken, order.swapPath);
    const swapPathMarketFullNames = getSwapPathMarketFullNames(marketInfoData, order.swapPath);
    return { swapPathTokenSymbols, swapPathMarketFullNames };
  }, [isSwap, marketInfoData, order.initialCollateralToken, order.swapPath]);

  const handleSetRef = useCallback(
    (el: HTMLElement | null) => {
      if (setRef) setRef(el, order.key);
    },
    [order.key, setRef]
  );

  const oracleSettings = useSelector(selectOracleSettings);
  const disabledCancelMarketOrderMessage = useDisabledCancelMarketOrderMessage(order, oracleSettings);

  const cancelButton = (
    <button
      className={cx("cursor-pointer p-6 text-slate-100 disabled:cursor-wait", {
        "hover:text-white": !isCanceling && !disabledCancelMarketOrderMessage,
      })}
      disabled={isCanceling || Boolean(disabledCancelMarketOrderMessage)}
      onClick={onCancelOrder}
    >
      <MdClose fontSize={20} />
    </button>
  );

  return (
    <TableTr ref={handleSetRef}>
      {!hideActions && onToggleOrder && (
        <TableTd className="cursor-pointer" onClick={onToggleOrder}>
          <Checkbox isChecked={isSelected} setIsChecked={onToggleOrder} />
        </TableTd>
      )}
      <TableTd>
        {isSwap ? (
          <Tooltip
            handle={
              <SwapMarketLabel
                bordered
                fromSymbol={swapPathTokenSymbols?.at(0)}
                toSymbol={swapPathTokenSymbols?.at(-1)}
              />
            }
            content={
              <>
                {swapPathMarketFullNames?.map((market, index) => (
                  <span key={market.indexName}>
                    {index > 0 && " → "}
                    <span>{market.indexName}</span>
                    <span className="subtext leading-1">[{market.poolName}]</span>
                  </span>
                ))}
              </>
            }
            disableHandleStyle
          />
        ) : (
          <OrderItemMarket indexName={indexName} isLong={order.isLong} tokenSymbol={tokenSymbol} poolName={poolName} />
        )}
      </TableTd>
      <TableTd>
        <OrderItemTypeLabel order={order} />
      </TableTd>
      <TableTd>
        <Title order={order} showDebugValues={showDebugValues} />
      </TableTd>

      <TableTd>
        <TriggerPrice order={order} hideActions={hideActions} />
      </TableTd>
      <TableTd>
        <MarkPrice order={order} />
      </TableTd>
      {!hideActions && (
        <TableTd>
          <div className="inline-flex items-center">
            {!isTwapOrder(order) && !isMarketOrderType(order.orderType) && (
              <button className="cursor-pointer p-6 text-slate-100 hover:text-white" onClick={setEditingOrderKey}>
                <FaPen title={t`Edit order`} fontSize={12} />
              </button>
            )}
            {onCancelOrder ? (
              disabledCancelMarketOrderMessage ? (
                <TooltipWithPortal handle={cancelButton} content={disabledCancelMarketOrderMessage} />
              ) : (
                cancelButton
              )
            ) : null}
          </div>
        </TableTd>
      )}
    </TableTr>
  );
}

function OrderItemSmall({
  showDebugValues,
  order,
  setEditingOrderKey,
  onCancelOrder,
  hideActions,
  isSelected,
  onToggleOrder,
  setRef,
}: {
  showDebugValues: boolean;
  order: OrderInfo;
  hideActions: boolean | undefined;
  setEditingOrderKey: undefined | (() => void);
  onCancelOrder: undefined | (() => void);
  isSelected: boolean | undefined;
  onToggleOrder: undefined | (() => void);
  setRef?: (el: HTMLElement | null, orderKey: string) => void;
}) {
  const marketInfoData = useSelector(selectMarketsInfoData);

  const title = useMemo(() => {
    if (isSwapOrderType(order.orderType)) {
      const swapPathTokenSymbols = getSwapPathTokenSymbols(
        marketInfoData,
        order.initialCollateralToken,
        order.swapPath
      );

      return <SwapMarketLabel fromSymbol={swapPathTokenSymbols?.at(0)} toSymbol={swapPathTokenSymbols?.at(-1)} />;
    }

    const marketInfo = marketInfoData?.[order.marketAddress];

    if (!marketInfo) {
      return "...";
    }

    const indexName = getMarketIndexName(marketInfo);

    const tokenSymbol = marketInfoData?.[order.marketAddress]?.indexToken.symbol;

    return <MarketWithDirectionLabel isLong={order.isLong} indexName={indexName} tokenSymbol={tokenSymbol} />;
  }, [
    marketInfoData,
    order.initialCollateralToken,
    order.isLong,
    order.marketAddress,
    order.orderType,
    order.swapPath,
  ]);

  const handleSetRef = useCallback(
    (el: HTMLElement | null) => {
      if (setRef) setRef(el, order.key);
    },
    [order.key, setRef]
  );

  const oracleSettings = useSelector(selectOracleSettings);
  const disabledCancelMarketOrderMessage = useDisabledCancelMarketOrderMessage(order, oracleSettings);
  const cancelButton = (
    <Button
      variant="secondary"
      className="mt-15 !text-white"
      onClick={onCancelOrder}
      disabled={Boolean(disabledCancelMarketOrderMessage)}
    >
      <Trans>Cancel</Trans>
    </Button>
  );

  return (
    <div className="App-card" ref={handleSetRef}>
      <div>
        <div className="flex cursor-pointer items-center" onClick={onToggleOrder}>
          {hideActions ? (
            title
          ) : (
            <Checkbox isChecked={isSelected} setIsChecked={onToggleOrder}>
              {title}
            </Checkbox>
          )}
        </div>
        <div className="App-card-divider" />
        <div className="App-card-content">
          {showDebugValues && (
            <div className="App-card-row">
              <div className="label">Key</div>
              <div className="debug-key muted">{order.key}</div>
            </div>
          )}
          <div className="App-card-row">
            <div className="label">
              <Trans>Order Type</Trans>
            </div>
            <div>
              <OrderItemTypeLabel order={order} />
            </div>
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Size</Trans>
            </div>
            <Title order={order} showDebugValues={showDebugValues} />
          </div>
          <div className="App-card-row">
            <div className="label">
              <Trans>Trigger Price</Trans>
            </div>
            <div>
              <TriggerPrice order={order} hideActions={hideActions} />
            </div>
          </div>

          <div className="App-card-row">
            <div className="label">
              <Trans>Mark Price</Trans>
            </div>
            <div>
              <MarkPrice order={order} />
            </div>
          </div>
        </div>
      </div>
      {!hideActions && (
        <div className="App-card-actions">
          <div className="App-card-divider"></div>
          <div className="remove-top-margin">
            {!isTwapOrder(order) && !isMarketOrderType(order.orderType) && (
              <Button variant="secondary" className="mr-15 mt-15" onClick={setEditingOrderKey}>
                <Trans>Edit</Trans>
              </Button>
            )}

            {onCancelOrder ? (
              disabledCancelMarketOrderMessage ? (
                <TooltipWithPortal handle={cancelButton} content={disabledCancelMarketOrderMessage} />
              ) : (
                cancelButton
              )
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function getSwapRatioText(order: OrderInfo) {
  if (!isLimitOrderType(order.orderType) && !isMarketOrderType(order.orderType)) return {};

  const fromToken = order.initialCollateralToken;
  const toToken = order.targetCollateralToken;

  const fromTokenInfo = fromToken ? adaptToV1TokenInfo(fromToken) : undefined;
  const toTokenInfo = toToken ? adaptToV1TokenInfo(toToken) : undefined;

  const triggerRatio = (order as SwapOrderInfo).triggerRatio as TokensRatioAndSlippage;

  const markExchangeRate =
    fromToken && toToken
      ? getExchangeRate(adaptToV1TokenInfo(fromToken), adaptToV1TokenInfo(toToken), false)
      : undefined;

  const ratioDecimals = calculateDisplayDecimals(triggerRatio?.ratio);

  const sign = triggerRatio?.smallestToken.address === fromToken.address ? "<" : ">";

  const swapRatioText = `${sign} ${formatAmount(
    triggerRatio?.ratio,
    USD_DECIMALS,
    ratioDecimals,
    true
  )} ${triggerRatio?.smallestToken.symbol} / ${triggerRatio?.largestToken.symbol}`;

  const markSwapRatioText = getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo);

  const acceptablePriceText = `${sign} ${formatAmount(triggerRatio?.acceptablePrice, USD_DECIMALS, 2, true)} ${triggerRatio?.smallestToken.symbol} / ${triggerRatio?.largestToken.symbol}`;

  return { swapRatioText, markSwapRatioText, acceptablePriceText };
}

function OrderItemTypeLabel({ order }: { order: OrderInfo }) {
  const { errors, level } = useOrderErrors(order.key);

  const handle = <span className="font-medium">{getNameByOrderType(order.orderType, order.isTwap)}</span>;

  if (errors.length === 0) {
    return <>{handle}</>;
  }

  return (
    <Tooltip
      disableHandleStyle
      handle={
        <span
          className={cx("cursor-help underline decoration-dashed decoration-1 underline-offset-2", {
            "text-red-500 decoration-red-500/50": level === "error",
            "text-yellow-500 decoration-yellow-500/50": level === "warning",
          })}
        >
          {handle}
        </span>
      }
      content={
        errors.length ? (
          <div className="flex flex-col gap-20">
            {errors.map((error) => (
              <div key={error.key}>
                <span
                  className={cx({
                    "text-red-500": error!.level === "error",
                    "text-yellow-500": error!.level === "warning",
                  })}
                >
                  {error.msg}
                </span>
              </div>
            ))}
          </div>
        ) : null
      }
    />
  );
}

function OrderItemMarket({
  indexName,
  isLong,
  tokenSymbol,
  poolName,
}: {
  indexName: string;
  isLong: boolean;
  tokenSymbol: string;
  poolName: string | undefined;
}) {
  return (
    <div className={cx("flex items-center gap-4")}>
      <TokenIcon className="size-20 !align-[-3px]" displaySize={20} symbol={tokenSymbol} />
      <Tooltip
        handle={<span className="font-medium">{indexName}</span>}
        content={
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
        }
        disableHandleStyle
      />
      <span className={cx(isLong ? "text-green-500" : "text-red-500")}>{isLong ? t`Long` : t`Short`}</span>
    </div>
  );
}
