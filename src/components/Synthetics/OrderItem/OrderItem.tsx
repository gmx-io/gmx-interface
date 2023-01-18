import { Trans, t } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import {
  AggregatedOrderData,
  getMarkPriceForOrder,
  getTriggerPricePrefix,
  isDecreaseOrder,
  isIncreaseOrder,
  isSwapOrder,
} from "domain/synthetics/orders";
import { adaptToTokenInfo, convertToUsd, formatTokenAmount, formatUsd } from "domain/synthetics/tokens";
import { PRECISION, getExchangeRate, getExchangeRateDisplay } from "lib/legacy";

type Props = {
  order: AggregatedOrderData;
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
    if (!isSwapOrder(p.order.orderType)) return {};

    const fromToken = p.order.initialCollateralToken;
    const fromAmount = p.order.initialCollateralDeltaAmount;
    const toAmount = p.order.minOutputAmount;
    const toToken = p.order.toCollateralToken;

    const fromTokenInfo = fromToken ? adaptToTokenInfo(fromToken) : undefined;
    const toTokenInfo = toToken ? adaptToTokenInfo(toToken) : undefined;

    const isFromGreater = fromAmount > toAmount;
    const ratio = isFromGreater ? fromAmount.mul(PRECISION).div(toAmount) : toAmount.mul(PRECISION).div(fromAmount);

    const markExchangeRate =
      fromToken && toToken
        ? getExchangeRate(adaptToTokenInfo(fromToken), adaptToTokenInfo(toToken), isFromGreater)
        : undefined;

    const swapRatioText = getExchangeRateDisplay(ratio, fromTokenInfo, toTokenInfo);
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
      if (isDecreaseOrder(p.order.orderType) || isSwapOrder(p.order.orderType)) {
        return p.order.title;
      }

      return (
        <Tooltip
          handle={p.order.title}
          position="left-bottom"
          renderContent={() => {
            return <StatsTooltipRow label={t`Collateral`} value={getCollateralText()} showDollar={false} />;
          }}
        />
      );
    } else {
      return p.order.title;
    }
  }

  function renderTriggerPrice() {
    if (isSwapOrder(p.order.orderType)) {
      const toAmount = p.order.minOutputAmount;
      const toToken = p.order.toCollateralToken;
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
      return `${getTriggerPricePrefix(p.order.orderType, p.order.isLong)} ${formatUsd(p.order.triggerPrice)}`;
    }
  }

  function renderMarkPrice() {
    if (isSwapOrder(p.order.orderType)) {
      const { markSwapRatioText } = getSwapRatioText();

      return markSwapRatioText;
    } else {
      const markPrice = getMarkPriceForOrder(
        isIncreaseOrder(p.order.orderType),
        p.order.isLong,
        p.order.indexToken?.prices
      );

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
        <td className="Exchange-list-item-type">{isDecreaseOrder(p.order.orderType) ? t`Trigger` : t`Limit`}</td>
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

          {isIncreaseOrder(p.order.orderType) && (
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
