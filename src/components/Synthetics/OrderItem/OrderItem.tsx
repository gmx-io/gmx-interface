import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Tooltip from "components/Tooltip/Tooltip";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { MarketsInfoData, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import {
  OrderInfo,
  OrderType,
  PositionOrderInfo,
  SwapOrderInfo,
  isDecreaseOrderType,
  isIncreaseOrderType,
  isSwapOrderType,
} from "domain/synthetics/orders";
import { PositionsInfoData } from "domain/synthetics/positions";
import { getTriggerNameByOrderType } from "domain/synthetics/positions";
import { adaptToV1TokenInfo, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { getMarkPrice } from "domain/synthetics/trade";
import { USD_DECIMALS, getExchangeRate, getExchangeRateDisplay } from "lib/legacy";
import { formatAmount, formatTokenAmount, formatUsd } from "lib/numbers";
import "./OrderItem.scss";
import { getByKey } from "lib/objects";
import { useCallback, useMemo } from "react";
import { useChainId } from "lib/chains";
import { getWrappedToken } from "config/tokens";
import { useOrderErrors } from "context/SyntheticsStateContext/hooks/orderHooks";
import { useEditingOrderKeyState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";

type Props = {
  order: OrderInfo;
  onSelectOrder?: () => void;
  onCancelOrder?: () => void;
  isSelected?: boolean;
  isCanceling?: boolean;
  hideActions?: boolean;
  isLarge: boolean;
  marketsInfoData?: MarketsInfoData;
  positionsInfoData?: PositionsInfoData;
  setRef?: (el: HTMLTableRowElement | null) => void;
};

export function OrderItem(p: Props) {
  const {
    initialCollateralDeltaAmount,
    initialCollateralToken,
    targetCollateralToken,
    shouldUnwrapNativeToken,
    orderType,
    minOutputAmount,
    key,
  } = p.order;
  const { errors, level } = useOrderErrors(key);
  const { chainId } = useChainId();
  const { showDebugValues } = useSettings();
  const wrappedToken = getWrappedToken(chainId);
  const [, setEditingOrderKeyWithArg] = useEditingOrderKeyState();

  const setEditingOrderKey = useCallback(() => {
    setEditingOrderKeyWithArg(p.order.key);
  }, [p.order.key, setEditingOrderKeyWithArg]);

  const isCollateralSwap = shouldUnwrapNativeToken || initialCollateralToken.address !== targetCollateralToken.address;

  function getCollateralText() {
    const collateralUsd = convertToUsd(
      initialCollateralDeltaAmount,
      initialCollateralToken.decimals,
      initialCollateralToken.prices.minPrice
    );

    const targetCollateralAmount = convertToTokenAmount(
      collateralUsd,
      targetCollateralToken.decimals,
      targetCollateralToken.prices.minPrice
    );

    const tokenAmountText = formatTokenAmount(
      targetCollateralAmount,
      targetCollateralToken?.decimals,
      targetCollateralToken.isNative ? wrappedToken.symbol : targetCollateralToken.symbol
    );

    return `${tokenAmountText}`;
  }

  function getSwapRatioText() {
    if (!isSwapOrderType(orderType)) return {};

    const fromToken = initialCollateralToken;
    const toToken = targetCollateralToken;

    const fromTokenInfo = fromToken ? adaptToV1TokenInfo(fromToken) : undefined;
    const toTokenInfo = toToken ? adaptToV1TokenInfo(toToken) : undefined;

    const triggerRatio = (p.order as SwapOrderInfo).triggerRatio;

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

  function renderTitle() {
    if (isSwapOrderType(orderType)) {
      if (showDebugValues) {
        return (
          <Tooltip
            handle={renderTitleWithIcon(p.order)}
            position="bottom-start"
            renderContent={() => (
              <>
                <StatsTooltipRow
                  label={"Key"}
                  value={<div className="debug-key muted">{key}</div>}
                  showDollar={false}
                />
                <StatsTooltipRow
                  label={"Amount"}
                  value={<div className="debug-key muted">{minOutputAmount.toString()}</div>}
                  showDollar={false}
                />
              </>
            )}
          />
        );
      }

      if (errors.length) {
        return (
          <Tooltip
            handle={renderTitleWithIcon(p.order)}
            className={cx(`order-error-text-msg`, `level-${level}`)}
            position="bottom-start"
            renderContent={() => (
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
            )}
          />
        );
      }

      return renderTitleWithIcon(p.order);
    }

    const positionOrder = p.order as PositionOrderInfo;
    const indexName = getMarketIndexName(positionOrder.marketInfo);
    const poolName = getMarketPoolName(positionOrder.marketInfo);

    return (
      <Tooltip
        handle={renderTitleWithIcon(p.order)}
        position="bottom-start"
        className={level ? `order-error-text-msg level-${level}` : undefined}
        renderContent={() => {
          return (
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
                      initialCollateralDeltaAmount,
                      initialCollateralToken.decimals,
                      initialCollateralToken[shouldUnwrapNativeToken ? "baseSymbol" : "symbol"]
                    )}{" "}
                    will be swapped to{" "}
                    {targetCollateralToken.isNative ? wrappedToken.symbol : targetCollateralToken.symbol} on order
                    execution.
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
          );
        }}
      />
    );
  }

  function renderTitleWithIcon(order: OrderInfo) {
    if (isSwapOrderType(order.orderType)) {
      const { initialCollateralToken, targetCollateralToken, minOutputAmount, initialCollateralDeltaAmount } = order;

      const fromTokenText = formatTokenAmount(initialCollateralDeltaAmount, initialCollateralToken.decimals, "");

      const fromTokenWithIcon = (
        <span className="whitespace-nowrap">
          <TokenIcon className="mr-5" symbol={initialCollateralToken.symbol} displaySize={18} importSize={24} />
          {initialCollateralToken.symbol}
        </span>
      );

      const toTokenText = formatTokenAmount(minOutputAmount, targetCollateralToken.decimals, "");

      const toTokenWithIcon = (
        <span className="whitespace-nowrap">
          <TokenIcon className="mr-5" symbol={targetCollateralToken.symbol} displaySize={18} importSize={24} />
          {targetCollateralToken.symbol}
        </span>
      );

      return (
        <span>
          Swap {fromTokenText} {fromTokenWithIcon} for {toTokenText} {toTokenWithIcon}
        </span>
      );
    } else {
      const marketInfo = getByKey(p.marketsInfoData, order.marketAddress);
      const indexToken = marketInfo?.indexToken;
      const { orderType, isLong, sizeDeltaUsd } = order;

      const symbolWithIcon = (
        <span>
          {indexToken && <TokenIcon className="mr-5" symbol={indexToken?.symbol} displaySize={18} importSize={24} />}
          {indexToken?.symbol}
        </span>
      );

      const longShortText = isLong ? t`Long` : t`Short`;
      const sizeText = formatUsd(sizeDeltaUsd);
      const increaseOrDecreaseText = isIncreaseOrderType(orderType) ? t`Increase` : t`Decrease`;

      return (
        <span>
          {increaseOrDecreaseText} {symbolWithIcon} {longShortText} by {sizeText}
        </span>
      );
    }
  }

  function renderTriggerPrice() {
    if (isSwapOrderType(orderType)) {
      const toAmount = minOutputAmount;
      const toToken = targetCollateralToken;
      const toAmountText = formatTokenAmount(toAmount, toToken?.decimals, toToken?.symbol);
      const { swapRatioText } = getSwapRatioText();

      return (
        <>
          {!p.hideActions ? (
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

  const positionOrder = p.order as PositionOrderInfo;
  const priceDecimals = positionOrder?.indexToken?.priceDecimals;

  const markPrice = useMemo(() => {
    if (isSwapOrderType(orderType)) {
      return undefined;
    }
    return getMarkPrice({
      prices: positionOrder.indexToken.prices,
      isIncrease: isIncreaseOrderType(positionOrder.orderType),
      isLong: positionOrder.isLong,
    });
  }, [orderType, positionOrder?.indexToken?.prices, positionOrder.isLong, positionOrder.orderType]);

  function renderMarkPrice() {
    if (isSwapOrderType(orderType)) {
      const { markSwapRatioText } = getSwapRatioText();

      return markSwapRatioText;
    } else {
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
                  Note that there may be rare cases where the order cannot be executed, for example, if the chain is
                  down and no oracle reports are produced or if the price impact exceeds your acceptable price.
                </p>
              </Trans>
            );
          }}
        />
      );
    }
  }

  function renderLarge() {
    return (
      <tr ref={p.setRef} className="Exchange-list-item">
        {!p.hideActions && p.onSelectOrder && (
          <td className="Exchange-list-item-type" onClick={p.onSelectOrder}>
            <Checkbox isChecked={p.isSelected} setIsChecked={p.onSelectOrder} />
          </td>
        )}
        <td className="Exchange-list-item-type">
          {isDecreaseOrderType(orderType) ? getTriggerNameByOrderType(positionOrder.orderType) : t`Limit`}
        </td>
        <td className="Order-list-item-text">{renderTitle()}</td>
        <td>{renderTriggerPrice()}</td>
        <td>{renderMarkPrice()}</td>
        {!p.hideActions && (
          <>
            <td>
              <button className="Exchange-list-action" onClick={setEditingOrderKey}>
                <Trans>Edit</Trans>
              </button>
            </td>
            {p.onCancelOrder && (
              <td>
                <button className="Exchange-list-action" onClick={p.onCancelOrder} disabled={p.isCanceling}>
                  <Trans>Cancel</Trans>
                </button>
              </td>
            )}
          </>
        )}
      </tr>
    );
  }

  function renderSmall() {
    return (
      <div className="App-card">
        <div>
          <div className="Order-list-card-title">{renderTitle()}</div>
          <div className="App-card-divider" />
          <div className="App-card-content">
            {showDebugValues && (
              <div className="App-card-row">
                <div className="label">Key</div>
                <div className="debug-key muted">{key}</div>
              </div>
            )}
            <div className="App-card-row">
              <div className="label">
                <Trans>Order Type</Trans>
              </div>
              <div>
                {isDecreaseOrderType(orderType) ? getTriggerNameByOrderType(positionOrder.orderType) : t`Limit`}
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Trigger Price</Trans>
              </div>
              <div>{renderTriggerPrice()}</div>
            </div>

            <div className="App-card-row">
              <div className="label">
                <Trans>Mark Price</Trans>
              </div>
              <div>{renderMarkPrice()}</div>
            </div>
          </div>
        </div>
        {!p.hideActions && (
          <div className="App-card-actions">
            <div className="App-card-divider"></div>
            <div className="remove-top-margin">
              <Button variant="secondary" className="mr-15 mt-15" onClick={setEditingOrderKey}>
                <Trans>Edit</Trans>
              </Button>

              {p.onCancelOrder && (
                <Button variant="secondary" className="mt-15" onClick={p.onCancelOrder}>
                  <Trans>Cancel</Trans>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return p.isLarge ? renderLarge() : renderSmall();
}
