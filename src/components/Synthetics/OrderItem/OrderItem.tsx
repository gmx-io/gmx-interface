import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { MarketWithDirectionLabel } from "components/MarketWithDirectionLabel/MarketWithDirectionLabel";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import SwapTokenPathLabel from "components/SwapTokenPathLabel/SwapTokenPathLabel";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import Tooltip from "components/Tooltip/Tooltip";
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
  isSwapOrderType,
} from "domain/synthetics/orders";
import { PositionsInfoData, getTriggerNameByOrderType } from "domain/synthetics/positions";
import { adaptToV1TokenInfo, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { getMarkPrice } from "domain/synthetics/trade";
import { USD_DECIMALS, getExchangeRate, getExchangeRateDisplay } from "lib/legacy";
import { formatAmount, formatTokenAmount, formatUsd } from "lib/numbers";
import { useCallback, useMemo } from "react";
import { ExchangeTd, ExchangeTr } from "../OrderList/ExchangeTable";
import { getSwapPathTokenSymbols } from "../TradeHistory/TradeHistoryRow/utils/swap";
import "./OrderItem.scss";

type Props = {
  order: OrderInfo;
  onSelectOrder?: () => void;
  onCancelOrder?: () => void;
  isSelected?: boolean;
  isCanceling?: boolean;
  hideActions?: boolean;
  isLarge: boolean;
  positionsInfoData?: PositionsInfoData;
  setRef?: (el: HTMLTableRowElement | null) => void;
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
      onSelectOrder={p.onSelectOrder}
      setEditingOrderKey={setEditingOrderKey}
      onCancelOrder={p.onCancelOrder}
      isCanceling={p.isCanceling}
      isSelected={p.isSelected}
    />
  ) : (
    <OrderItemSmall
      order={p.order}
      showDebugValues={showDebugValues}
      hideActions={p.hideActions}
      onCancelOrder={p.onCancelOrder}
      setEditingOrderKey={setEditingOrderKey}
    />
  );
}

function Title({ order, showDebugValues }: { order: OrderInfo; showDebugValues: boolean | undefined }) {
  const { errors, level } = useOrderErrors(order.key);
  const chainId = useSelector(selectChainId);

  if (isSwapOrderType(order.orderType)) {
    if (showDebugValues) {
      return (
        <Tooltip
          handle={<TitleWithIcon order={order} />}
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

    if (errors.length) {
      return (
        <Tooltip
          handle={<TitleWithIcon order={order} />}
          className={cx(`order-error-text-msg`, `level-${level}`)}
          position="bottom-start"
          content={
            <>
              {errors.map((error, i) => (
                <div
                  className={cx({
                    "OrderItem-tooltip-row": i > 0,
                  })}
                  key={error.key}
                >
                  <span className={error!.level === "error" ? "negative" : "warning"}>{error.msg}</span>
                </div>
              ))}
            </>
          }
        />
      );
    }

    return <TitleWithIcon order={order} />;
  }

  const positionOrder = order as PositionOrderInfo;
  const indexName = getMarketIndexName(positionOrder.marketInfo);
  const poolName = getMarketPoolName(positionOrder.marketInfo);
  const isCollateralSwap =
    positionOrder.shouldUnwrapNativeToken ||
    positionOrder.initialCollateralToken.address !== positionOrder.targetCollateralToken.address;

  const wrappedToken = getWrappedToken(chainId);

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

    const tokenAmountText = formatTokenAmount(
      targetCollateralAmount,
      positionOrder.targetCollateralToken?.decimals,
      positionOrder.targetCollateralToken.isNative ? wrappedToken.symbol : positionOrder.targetCollateralToken.symbol
    );

    return `${tokenAmountText}`;
  }

  return (
    <Tooltip
      handle={<TitleWithIcon order={order} />}
      position="bottom-start"
      className={level ? `order-error-text-msg level-${level}` : undefined}
      content={
        <>
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
          <StatsTooltipRow label={t`Collateral`} value={getCollateralText()} showDollar={false} />

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

          {errors.length ? (
            <>
              {errors.map((error) => (
                <div className="OrderItem-tooltip-row" key={error.key}>
                  <span className={error!.level === "error" ? "negative" : "warning"}>{error.msg}</span>
                </div>
              ))}
            </>
          ) : null}
        </>
      }
    />
  );
}

function TitleWithIcon({ order }: { order: OrderInfo }) {
  if (isSwapOrderType(order.orderType)) {
    const { initialCollateralToken, targetCollateralToken, minOutputAmount, initialCollateralDeltaAmount } = order;

    const fromTokenText = formatTokenAmount(initialCollateralDeltaAmount, initialCollateralToken.decimals, "");
    const fromTokenWithIcon = (
      <TokenWithIcon
        symbol={initialCollateralToken.symbol}
        displaySize={18}
        importSize={24}
        className="underline decoration-gray-400 decoration-dashed decoration-1 underline-offset-2"
      />
    );

    const toTokenText = formatTokenAmount(minOutputAmount, targetCollateralToken.decimals, "");
    const toTokenWithIcon = (
      <TokenWithIcon
        symbol={targetCollateralToken.symbol}
        displaySize={18}
        importSize={24}
        className="underline decoration-gray-400 decoration-dashed decoration-1 underline-offset-2"
      />
    );

    return (
      <div className="leading-2">
        <Trans>
          {fromTokenText} {fromTokenWithIcon} for {toTokenText} {toTokenWithIcon}
        </Trans>
      </div>
    );
  }

  const { sizeDeltaUsd } = order;
  const sizeText = formatUsd(sizeDeltaUsd, { displayPlus: true });

  return <>{sizeText}</>;
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

  if (isSwapOrderType(order.orderType)) {
    const { markSwapRatioText } = getSwapRatioText(order);

    return markSwapRatioText;
  } else {
    const positionOrder = order as PositionOrderInfo;
    const priceDecimals = positionOrder?.indexToken?.priceDecimals;

    return (
      <Tooltip
        handle={formatUsd(markPrice, { displayDecimals: priceDecimals })}
        position="bottom-end"
        renderContent={() => {
          return (
            <Trans>
              <p>
                The order will be executed when the oracle price is {positionOrder.triggerThresholdType}{" "}
                {formatUsd(positionOrder.triggerPrice, { displayDecimals: priceDecimals })}.
              </p>
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
  if (isSwapOrderType(order.orderType)) {
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
              t`You will receive at least ${toAmountText} if this order is executed. This price is being updated in real time based on Swap Fees and Price Impact.`
            }
          />
        ) : (
          swapRatioText
        )}
      </>
    );
  } else {
    const positionOrder = order as PositionOrderInfo;
    const priceDecimals = positionOrder?.indexToken?.priceDecimals;
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
  onSelectOrder,
  showDebugValues,
  setEditingOrderKey,
  onCancelOrder,
  isCanceling,
  isSelected,
}: {
  order: OrderInfo;
  setRef?: (el: HTMLTableRowElement | null) => void;
  hideActions: boolean | undefined;
  showDebugValues: boolean | undefined;
  onSelectOrder: undefined | (() => void);
  setEditingOrderKey: undefined | (() => void);
  onCancelOrder: undefined | (() => void);
  isCanceling: boolean | undefined;
  isSelected: boolean | undefined;
}) {
  const marketInfoData = useSelector(selectMarketsInfoData);
  const isSwap = isSwapOrderType(order.orderType);
  const { indexName, tokenSymbol } = useMemo(() => {
    const marketInfo = marketInfoData?.[order.marketAddress];

    if (!marketInfo || isSwap)
      return {
        indexName: "...",
        tokenSymbol: "...",
      };
    return {
      indexName: getMarketIndexName(marketInfo),
      tokenSymbol: marketInfo.indexToken.symbol,
    };
  }, [isSwap, marketInfoData, order.marketAddress]);

  const swapPathTokenSymbols = useMemo(() => {
    if (!isSwap) return [];
    return getSwapPathTokenSymbols(marketInfoData, order.initialCollateralToken, order.swapPath);
  }, [isSwap, marketInfoData, order.initialCollateralToken, order.swapPath]);

  return (
    <ExchangeTr ref={setRef}>
      {!hideActions && onSelectOrder && (
        <ExchangeTd onClick={onSelectOrder}>
          <Checkbox isChecked={isSelected} setIsChecked={onSelectOrder} />
        </ExchangeTd>
      )}
      <ExchangeTd>
        {isSwap ? (
          <SwapTokenPathLabel pathTokenSymbols={swapPathTokenSymbols} />
        ) : (
          <MarketWithDirectionLabel indexName={indexName} isLong={order.isLong} tokenSymbol={tokenSymbol} />
        )}
      </ExchangeTd>
      <ExchangeTd>
        {isDecreaseOrderType(order.orderType) ? getTriggerNameByOrderType(order.orderType) : t`Limit`}
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
        <>
          <ExchangeTd>
            <button className="Exchange-list-action" onClick={setEditingOrderKey}>
              <Trans>Edit</Trans>
            </button>
          </ExchangeTd>
          {onCancelOrder && (
            <ExchangeTd>
              <button className="Exchange-list-action" onClick={onCancelOrder} disabled={isCanceling}>
                <Trans>X</Trans>
              </button>
            </ExchangeTd>
          )}
        </>
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
}: {
  showDebugValues: boolean;
  order: OrderInfo;
  hideActions: boolean | undefined;
  setEditingOrderKey: undefined | (() => void);
  onCancelOrder: undefined | (() => void);
}) {
  return (
    <div className="App-card">
      <div>
        <div className="Order-list-card-title">
          <Title order={order} showDebugValues={showDebugValues} />
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
            <div>{isDecreaseOrderType(order.orderType) ? getTriggerNameByOrderType(order.orderType) : t`Limit`}</div>
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
  if (!isSwapOrderType(order.orderType)) return {};

  const fromToken = order.initialCollateralToken;
  const toToken = order.targetCollateralToken;

  const fromTokenInfo = fromToken ? adaptToV1TokenInfo(fromToken) : undefined;
  const toTokenInfo = toToken ? adaptToV1TokenInfo(toToken) : undefined;

  const triggerRatio = (order as SwapOrderInfo).triggerRatio;

  const markExchangeRate =
    fromToken && toToken
      ? getExchangeRate(adaptToV1TokenInfo(fromToken), adaptToV1TokenInfo(toToken), false)
      : undefined;

  const swapRatioText = `${formatAmount(
    triggerRatio?.ratio,
    USD_DECIMALS,
    triggerRatio?.smallestToken.isStable ? 2 : 4,
    true
  )} ${triggerRatio?.smallestToken.symbol} / ${triggerRatio?.largestToken.symbol}`;

  const markSwapRatioText = getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo);

  return { swapRatioText, markSwapRatioText };
}
