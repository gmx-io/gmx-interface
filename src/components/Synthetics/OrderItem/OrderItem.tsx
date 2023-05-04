import { Trans, t } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import {
  OrderInfo,
  PositionOrderInfo,
  isDecreaseOrderType,
  isIncreaseOrderType,
  isSwapOrderType,
} from "domain/synthetics/orders";
import { adaptToV1TokenInfo, convertToUsd, getTokensRatioByAmounts } from "domain/synthetics/tokens";
import { getMarkPrice } from "domain/synthetics/trade";
import { getExchangeRate, getExchangeRateDisplay } from "lib/legacy";
import { formatTokenAmount, formatUsd } from "lib/numbers";

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
  function getCollateralText() {
    const collateralAmount = p.order.initialCollateralDeltaAmount;
    const collateralToken = p.order.initialCollateralToken;

    const collateralUsd = collateralToken?.prices
      ? convertToUsd(collateralAmount, collateralToken.decimals, collateralToken.prices.maxPrice)
      : undefined;

    const usdText = formatUsd(collateralUsd);

    const tokenAmountText = formatTokenAmount(collateralAmount, collateralToken?.decimals, collateralToken?.symbol);

    return `${usdText} (${tokenAmountText})`;
  }

  function getSwapRatioText() {
    if (!isSwapOrderType(p.order.orderType)) return {};

    const fromToken = p.order.initialCollateralToken;
    const fromAmount = p.order.initialCollateralDeltaAmount;
    const toAmount = p.order.minOutputAmount;
    const toToken = p.order.targetCollateralToken;

    const fromTokenInfo = fromToken ? adaptToV1TokenInfo(fromToken) : undefined;
    const toTokenInfo = toToken ? adaptToV1TokenInfo(toToken) : undefined;

    const tokensRatio =
      fromToken &&
      toToken &&
      getTokensRatioByAmounts({
        fromToken,
        toToken,
        fromTokenAmount: fromAmount,
        toTokenAmount: toAmount,
      });

    const markExchangeRate =
      fromToken && toToken
        ? getExchangeRate(adaptToV1TokenInfo(fromToken), adaptToV1TokenInfo(toToken), false)
        : undefined;

    const [largest, smallest] =
      tokensRatio?.largestToken.address === fromToken?.address
        ? [fromTokenInfo, toTokenInfo]
        : [toTokenInfo, fromTokenInfo];

    const swapRatioText = tokensRatio.ratio.gt(0) ? getExchangeRateDisplay(tokensRatio?.ratio, largest, smallest) : "0";
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
              handle={swapRatioText}
              renderContent={() =>
                t`You will receive at least ${toAmountText} if this order is executed. The execution price may vary depending on swap fees at the time the order is executed.`
              }
            />
          ) : (
            swapRatioText
          )}
        </>
      );
    } else {
      const positionOrder = p.order as PositionOrderInfo;
      return `${positionOrder.triggerThresholdType} ${formatUsd(positionOrder.triggerPrice)}`;
    }
  }

  function renderMarkPrice() {
    if (isSwapOrderType(p.order.orderType)) {
      const { markSwapRatioText } = getSwapRatioText();

      return markSwapRatioText;
    } else {
      const positionOrder = p.order as PositionOrderInfo;

      const markPrice = getMarkPrice({
        prices: positionOrder.indexToken.prices,
        isIncrease: isIncreaseOrderType(positionOrder.orderType),
        isLong: positionOrder.isLong,
      });

      return (
        <Tooltip
          handle={formatUsd(markPrice)}
          position="right-bottom"
          renderContent={() => {
            return (
              <Trans>
                <p>
                  The price that orders can be executed at may differ slightly from the chart price, as market orders
                  update oracle prices, while limit/trigger orders do not.
                </p>
                <p>
                  This can also cause limit/triggers to not be executed if the price is not reached for long enough.{" "}
                  <ExternalLink href="https://gmxio.gitbook.io/gmx/trading#stop-loss-take-profit-orders">
                    Read more
                  </ExternalLink>
                  .
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
        <div className="App-card-title-small">{renderTitle()}</div>
        <div className="App-card-divider" />
        <div className="App-card-content">
          <div className="App-card-row">
            <div className="label">
              <Trans>Price</Trans>
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
              <div>{getCollateralText()}</div>
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
    );
  }

  return p.isLarge ? renderLarge() : renderSmall();
}
