import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo } from "react";
import { AiOutlineEdit } from "react-icons/ai";
import { MdClose } from "react-icons/md";

import { getWrappedToken } from "config/tokens";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useEditingOrderKeyState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { useOrderErrors } from "context/SyntheticsStateContext/hooks/orderHooks";
import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import {
  OrderInfo,
  OrderType,
  PositionOrderInfo,
  SwapOrderInfo,
  isDecreaseOrderType,
  isIncreaseOrderType,
  isLimitIncreaseOrderType,
  isLimitOrderType,
  isLimitSwapOrderType,
} from "domain/synthetics/orders";
import { PositionsInfoData, getTriggerNameByOrderType } from "domain/synthetics/positions";
import { adaptToV1TokenInfo, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { getMarkPrice } from "domain/synthetics/trade";
import { getExchangeRate, getExchangeRateDisplay } from "lib/legacy";
import { USD_DECIMALS } from "config/factors";
import { calculatePriceDecimals, formatAmount, formatTokenAmount, formatUsd } from "lib/numbers";
import { getSwapPathMarketFullNames, getSwapPathTokenSymbols } from "../TradeHistory/TradeHistoryRow/utils/swap";

import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { MarketWithDirectionLabel } from "components/MarketWithDirectionLabel/MarketWithDirectionLabel";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Tooltip from "components/Tooltip/Tooltip";
import { SwapMarketLabel } from "../../SwapMarketLabel/SwapMarketLabel";
import { ExchangeTd, ExchangeTr } from "../OrderList/ExchangeTable";

import { makeSelectMarketPriceDecimals } from "context/SyntheticsStateContext/selectors/statsSelectors";
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

  const [, setEditingOrderKeyWithArg] = useEditingOrderKeyState();

  const setEditingOrderKey = useCallback(() => {
    setEditingOrderKeyWithArg(p.order.key);
  }, [p.order.key, setEditingOrderKeyWithArg]);

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

  if (isLimitSwapOrderType(order.orderType)) {
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
    );

    const targetCollateralAmount = convertToTokenAmount(
      collateralUsd,
      positionOrder.targetCollateralToken.decimals,
      positionOrder.targetCollateralToken.prices.minPrice
    );

    const decreaseMultiplier = isDecreaseOrderType(positionOrder.orderType) ? -1n : 1n;

    const signedTargetCollateralAmount =
      targetCollateralAmount !== undefined ? targetCollateralAmount * decreaseMultiplier : undefined;

    const tokenAmountText = formatTokenAmount(
      signedTargetCollateralAmount,
      positionOrder.targetCollateralToken?.decimals,
      positionOrder.targetCollateralToken.isNative ? wrappedToken.symbol : positionOrder.targetCollateralToken.symbol
    );

    return `${tokenAmountText}`;
  }

  return (
    <Tooltip
      disableHandleStyle
      handle={<TitleWithIcon bordered order={order} />}
      position="bottom-start"
      content={
        <>
          <StatsTooltipRow label={getCollateralLabel()} value={getCollateralText()} showDollar={false} />

          {isCollateralSwap && (
            <div className="OrderItem-tooltip-row">
              <Trans>
                {formatTokenAmount(
                  positionOrder.initialCollateralDeltaAmount,
                  positionOrder.initialCollateralToken.decimals,
                  positionOrder.initialCollateralToken[positionOrder.shouldUnwrapNativeToken ? "baseSymbol" : "symbol"]
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
      }
    />
  );
}

export function TitleWithIcon({ order, bordered }: { order: OrderInfo; bordered?: boolean }) {
  if (isLimitSwapOrderType(order.orderType)) {
    const { initialCollateralToken, targetCollateralToken, minOutputAmount, initialCollateralDeltaAmount } = order;

    const fromTokenText = formatTokenAmount(initialCollateralDeltaAmount, initialCollateralToken.decimals, "");
    const fromTokenIcon = <TokenIcon symbol={initialCollateralToken.symbol} displaySize={18} importSize={24} />;

    const toTokenText = formatTokenAmount(minOutputAmount, targetCollateralToken.decimals, "");
    const toTokenIcon = <TokenIcon symbol={targetCollateralToken.symbol} displaySize={18} importSize={24} />;

    return (
      <div
        className={cx("inline-flex flex-wrap gap-y-8 whitespace-pre-wrap", {
          "cursor-help *:border-b *:border-dashed *:border-b-gray-400": bordered,
        })}
      >
        <Trans>
          <span>{fromTokenText} </span>
          {fromTokenIcon}
          <span> to </span>
          <span>{toTokenText} </span>
          {toTokenIcon}
        </Trans>
      </div>
    );
  }

  const { sizeDeltaUsd } = order;
  const sizeText = formatUsd(sizeDeltaUsd * (isLimitIncreaseOrderType(order.orderType) ? 1n : -1n), {
    displayPlus: true,
  });

  return (
    <span
      className={cx({
        "cursor-help border-b border-dashed border-b-gray-400": bordered,
      })}
    >
      {sizeText}
    </span>
  );
}

function MarkPrice({ order }: { order: OrderInfo }) {
  const markPrice = useMemo(() => {
    if (isLimitSwapOrderType(order.orderType)) {
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
  const priceDecimals = useSelector(makeSelectMarketPriceDecimals(positionOrder.marketInfo?.indexTokenAddress));

  const markPriceFormatted = useMemo(() => {
    return formatUsd(markPrice, { displayDecimals: priceDecimals });
  }, [markPrice, priceDecimals]);

  if (isLimitSwapOrderType(order.orderType)) {
    const { markSwapRatioText } = getSwapRatioText(order);

    return markSwapRatioText;
  } else {
    const positionOrder = order as PositionOrderInfo;

    return (
      <Tooltip
        handle={markPriceFormatted}
        position="bottom-end"
        renderContent={() => {
          return (
            <Trans>
              <p>
                The order will be executed when the oracle price is {positionOrder.triggerThresholdType}{" "}
                {formatUsd(positionOrder.triggerPrice, { displayDecimals: priceDecimals })}.
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
  if (isLimitSwapOrderType(order.orderType)) {
    const swapOrder = order as SwapOrderInfo;
    const toAmount = swapOrder.minOutputAmount;
    const toToken = order.targetCollateralToken;
    const toAmountText = formatTokenAmount(toAmount, toToken?.decimals, toToken?.symbol);
    const { swapRatioText } = getSwapRatioText(order);

    return (
      <>
        {!hideActions ? (
          <Tooltip
            position="bottom-end"
            handle={swapRatioText}
            renderContent={() =>
              t`You will receive at least ${toAmountText} if this order is executed. This price is being updated in real time based on swap fees and price impact.`
            }
          />
        ) : (
          swapRatioText
        )}
      </>
    );
  } else {
    const positionOrder = order as PositionOrderInfo;
    const priceDecimals =
      calculatePriceDecimals(positionOrder?.indexToken?.prices?.minPrice) || positionOrder?.indexToken?.priceDecimals;
    return (
      <Tooltip
        handle={`${positionOrder.triggerThresholdType} ${formatUsd(positionOrder.triggerPrice, {
          displayDecimals: priceDecimals,
        })}`}
        position="bottom-end"
        renderContent={() => (
          <>
            <StatsTooltipRow
              label={t`Acceptable Price`}
              value={
                positionOrder.orderType === OrderType.StopLossDecrease
                  ? "NA"
                  : `${positionOrder.triggerThresholdType} ${formatUsd(positionOrder.acceptablePrice, {
                      displayDecimals: priceDecimals,
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
  const isSwap = isLimitSwapOrderType(order.orderType);
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
      setRef && setRef(el, order.key);
    },
    [order.key, setRef]
  );

  const qa = useMemo(() => {
    if ("marketInfo" in order) {
      return `order-market-${order.marketInfo.name}-${order.isLong ? "Long" : "Short"}`;
    }

    return `order-swap-${order.initialCollateralToken.symbol}-${order.targetCollateralToken.symbol}`;
  }, [order]);

  return (
    <ExchangeTr ref={handleSetRef} qa={qa}>
      {!hideActions && onToggleOrder && (
        <ExchangeTd className="cursor-pointer" onClick={onToggleOrder}>
          <Checkbox isChecked={isSelected} setIsChecked={onToggleOrder} />
        </ExchangeTd>
      )}
      <ExchangeTd>
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
          <Tooltip
            handle={
              <MarketWithDirectionLabel
                bordered
                indexName={indexName}
                isLong={order.isLong}
                tokenSymbol={tokenSymbol}
              />
            }
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
        )}
      </ExchangeTd>
      <ExchangeTd>
        <OrderItemTypeLabel order={order} />
      </ExchangeTd>
      <ExchangeTd>
        <Title order={order} showDebugValues={showDebugValues} />
      </ExchangeTd>

      <ExchangeTd>
        <TriggerPrice order={order} hideActions={hideActions} />
      </ExchangeTd>
      <ExchangeTd>
        <MarkPrice order={order} />
      </ExchangeTd>
      {!hideActions && (
        <ExchangeTd>
          <div className="flex items-center">
            <button
              className="cursor-pointer p-6 text-gray-300 hover:text-white"
              onClick={setEditingOrderKey}
              data-qa="edit-order"
            >
              <AiOutlineEdit title={t`Edit order`} fontSize={16} />
            </button>
            {onCancelOrder && (
              <button
                className="cursor-pointer p-6 text-gray-300 hover:text-white disabled:cursor-wait"
                disabled={isCanceling}
                onClick={onCancelOrder}
                data-qa="close-order"
              >
                <MdClose title={t`Close order`} fontSize={16} />
              </button>
            )}
          </div>
        </ExchangeTd>
      )}
    </ExchangeTr>
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
    if (isLimitSwapOrderType(order.orderType)) {
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
      setRef && setRef(el, order.key);
    },
    [order.key, setRef]
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
            <Button variant="secondary" className="mr-15 mt-15" onClick={setEditingOrderKey}>
              <Trans>Edit</Trans>
            </Button>

            {onCancelOrder && (
              <Button variant="secondary" className="mt-15" onClick={onCancelOrder}>
                <Trans>Cancel</Trans>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getSwapRatioText(order: OrderInfo) {
  if (!isLimitOrderType(order.orderType)) return {};

  const fromToken = order.initialCollateralToken;
  const toToken = order.targetCollateralToken;

  const fromTokenInfo = fromToken ? adaptToV1TokenInfo(fromToken) : undefined;
  const toTokenInfo = toToken ? adaptToV1TokenInfo(toToken) : undefined;

  const triggerRatio = (order as SwapOrderInfo).triggerRatio;

  const markExchangeRate =
    fromToken && toToken
      ? getExchangeRate(adaptToV1TokenInfo(fromToken), adaptToV1TokenInfo(toToken), false)
      : undefined;

  const ratioDecimals = calculatePriceDecimals(triggerRatio?.ratio);
  const swapRatioText = `${formatAmount(
    triggerRatio?.ratio,
    USD_DECIMALS,
    ratioDecimals,
    true
  )} ${triggerRatio?.smallestToken.symbol} / ${triggerRatio?.largestToken.symbol}`;

  const markSwapRatioText = getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo);

  return { swapRatioText, markSwapRatioText };
}

function OrderItemTypeLabel({ order }: { order: OrderInfo }) {
  const { errors, level } = useOrderErrors(order.key);

  const handle = isDecreaseOrderType(order.orderType) ? getTriggerNameByOrderType(order.orderType) : t`Limit`;

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
          <>
            {errors.map((error) => (
              <div className="mt-20" key={error.key}>
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
          </>
        ) : null
      }
    />
  );
}
