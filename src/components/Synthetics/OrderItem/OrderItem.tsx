import { Trans, t } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  OrderInfo,
  OrderType,
  PositionOrderInfo,
  SwapOrderInfo,
  isDecreaseOrderType,
  isIncreaseOrderType,
  isSwapOrderType,
} from "domain/synthetics/orders";
import { adaptToV1TokenInfo, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { getMarkPrice } from "domain/synthetics/trade";
import { USD_DECIMALS, getExchangeRate, getExchangeRateDisplay } from "lib/legacy";
import { formatAmount, formatTokenAmount, formatUsd } from "lib/numbers";

type Props = {
  order: OrderInfo;
  onSelectOrder?: () => void;
  onEditOrder?: () => void;
  onCancelOrder?: () => void;
  isSelected?: boolean;
  isCanceling?: boolean;
  hideActions?: boolean;
  error?: string;
  isLarge: boolean;
};

export function OrderItem(p: Props) {
  const { showDebugValues } = useSettings();

  const isCollateralSwap = p.order.initialCollateralToken.address !== p.order.targetCollateralToken.address;

  function getCollateralText() {
    const initialCollateralToken = p.order.initialCollateralToken;
    const targetCollateralToken = p.order.targetCollateralToken;

    const collateralUsd = convertToUsd(
      p.order.initialCollateralDeltaAmount,
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
      targetCollateralToken?.symbol
    );

    return `${tokenAmountText}`;
  }

  function getSwapRatioText() {
    if (!isSwapOrderType(p.order.orderType)) return {};

    const fromToken = p.order.initialCollateralToken;
    const toToken = p.order.targetCollateralToken;

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
      triggerRatio?.smallestToken.isStable ? 2 : 4
    )} ${triggerRatio?.smallestToken.symbol} / ${triggerRatio?.largestToken.symbol}`;

    const markSwapRatioText = getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo);

    return { swapRatioText, markSwapRatioText };
  }

  function renderTitle() {
    if (p.error) {
      return (
        <Tooltip
          className="order-error"
          handle={p.order.title}
          position="right-bottom"
          handleClassName="plain"
          renderContent={() => <span className="negative">{p.error}</span>}
        />
      );
    }

    if (p.isLarge) {
      if (isSwapOrderType(p.order.orderType)) {
        if (showDebugValues) {
          return (
            <Tooltip
              handle={p.order.title}
              position="left-bottom"
              renderContent={() => (
                <>
                  <StatsTooltipRow
                    label={"Key"}
                    value={<div className="debug-key muted">{p.order.key}</div>}
                    showDollar={false}
                  />
                  <StatsTooltipRow
                    label={"Amount"}
                    value={<div className="debug-key muted">{p.order.minOutputAmount.toString()}</div>}
                    showDollar={false}
                  />
                </>
              )}
            />
          );
        }
        return p.order.title;
      }

      const positionOrder = p.order as PositionOrderInfo;

      return (
        <Tooltip
          handle={positionOrder.title}
          position="left-bottom"
          renderContent={() => {
            return (
              <>
                <StatsTooltipRow label={t`Market`} value={positionOrder.marketInfo.name} showDollar={false} />
                <StatsTooltipRow label={t`Collateral`} value={getCollateralText()} showDollar={false} />

                {isCollateralSwap && (
                  <>
                    <br />
                    <Trans>
                      {formatTokenAmount(
                        p.order.initialCollateralDeltaAmount,
                        p.order.initialCollateralToken.decimals,
                        p.order.initialCollateralToken.symbol
                      )}{" "}
                      will be swapped to {p.order.targetCollateralToken.symbol} on order execution.
                    </Trans>
                  </>
                )}

                {showDebugValues && (
                  <>
                    <br />
                    <br />
                    <StatsTooltipRow
                      label={"Key"}
                      value={<div className="debug-key muted">{positionOrder.key}</div>}
                      showDollar={false}
                    />
                  </>
                )}
              </>
            );
          }}
        />
      );
    } else {
      return p.order.title;
    }
  }

  function renderTriggerPrice() {
    if (isSwapOrderType(p.order.orderType)) {
      const toAmount = p.order.minOutputAmount;
      const toToken = p.order.targetCollateralToken;
      const toAmountText = formatTokenAmount(toAmount, toToken?.decimals, toToken?.symbol);

      const { swapRatioText } = getSwapRatioText();

      return (
        <>
          {!p.hideActions ? (
            <Tooltip
              position="right-bottom"
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
      const positionOrder = p.order as PositionOrderInfo;
      const priceDecimals = positionOrder.indexToken.priceDecimals;

      return (
        <Tooltip
          handle={`${positionOrder.triggerThresholdType} ${formatUsd(positionOrder.triggerPrice, {
            displayDecimals: priceDecimals,
          })}`}
          position="right-bottom"
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

  function renderMarkPrice() {
    if (isSwapOrderType(p.order.orderType)) {
      const { markSwapRatioText } = getSwapRatioText();

      return markSwapRatioText;
    } else {
      const positionOrder = p.order as PositionOrderInfo;
      const priceDecimals = positionOrder.indexToken.priceDecimals;

      const markPrice = getMarkPrice({
        prices: positionOrder.indexToken.prices,
        isIncrease: isIncreaseOrderType(positionOrder.orderType),
        isLong: positionOrder.isLong,
      });

      return (
        <Tooltip
          handle={formatUsd(markPrice, { displayDecimals: priceDecimals })}
          position="right-bottom"
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
      <tr className="Exchange-list-item">
        {!p.hideActions && p.onSelectOrder && (
          <td className="Exchange-list-item-type">
            <div>
              <Checkbox isChecked={p.isSelected} setIsChecked={p.onSelectOrder} />
            </div>
          </td>
        )}
        <td className="Exchange-list-item-type">{isDecreaseOrderType(p.order.orderType) ? t`Trigger` : t`Limit`}</td>
        <td>{renderTitle()}</td>
        <td>{renderTriggerPrice()}</td>
        <td>{renderMarkPrice()}</td>
        {!p.hideActions && (
          <>
            {p.onEditOrder && (
              <td>
                <button className="Exchange-list-action" onClick={p.onEditOrder}>
                  <Trans>Edit</Trans>
                </button>
              </td>
            )}
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
          <div className="App-card-title-small">{renderTitle()}</div>
          <div className="App-card-divider" />
          <div className="App-card-content">
            {showDebugValues && (
              <div className="App-card-row">
                <div className="label">Key</div>
                <div className="debug-key muted">{p.order.key}</div>
              </div>
            )}
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

            {isIncreaseOrderType(p.order.orderType) && (
              <div className="App-card-row">
                <div className="label">
                  <Trans>Collateral</Trans>
                </div>
                <div>
                  {isCollateralSwap ? (
                    <Tooltip
                      handle={getCollateralText()}
                      position="right-bottom"
                      renderContent={() => {
                        return (
                          <Trans>
                            {formatTokenAmount(
                              p.order.initialCollateralDeltaAmount,
                              p.order.initialCollateralToken.decimals,
                              p.order.initialCollateralToken.symbol
                            )}{" "}
                            will be swapped to {p.order.targetCollateralToken.symbol} on order execution.
                          </Trans>
                        );
                      }}
                    />
                  ) : (
                    getCollateralText()
                  )}
                </div>
              </div>
            )}

            {!p.hideActions && (
              <>
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {p.onEditOrder && (
                    <button className="App-button-option App-card-option" onClick={p.onEditOrder}>
                      <Trans>Edit</Trans>
                    </button>
                  )}

                  {p.onCancelOrder && (
                    <button className="App-button-option App-card-option" onClick={p.onCancelOrder}>
                      <Trans>Cancel</Trans>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return p.isLarge ? renderLarge() : renderSmall();
}
