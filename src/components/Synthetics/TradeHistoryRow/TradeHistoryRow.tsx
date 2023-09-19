import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getExplorerUrl } from "config/chains";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { MarketInfo, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { isLimitOrderType, isSwapOrderType } from "domain/synthetics/orders";
import { adaptToV1TokenInfo, getTokensRatioByAmounts } from "domain/synthetics/tokens";
import { PositionTradeAction, SwapTradeAction, TradeAction, TradeActionType } from "domain/synthetics/tradeHistory";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatDateTime } from "lib/dates";
import { getExchangeRateDisplay } from "lib/legacy";
import { formatTokenAmount } from "lib/numbers";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import "./TradeHistoryRow.scss";
import { formatPositionOrderMessage, getOrderActionText } from "./helpers";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

type Props = {
  tradeAction: TradeAction;
  minCollateralUsd: BigNumber;
  shouldDisplayAccount?: boolean;
};

function renderMarketName(market: MarketInfo) {
  const indexName = getMarketIndexName(market);
  const poolName = getMarketPoolName(market);
  return (
    <div className="items-top">
      <span>{indexName}</span>
      <span className="subtext">[{poolName}]</span>
    </div>
  );
}

function getSwapOrderMessage(tradeAction: SwapTradeAction) {
  const tokenIn = tradeAction.initialCollateralToken!;
  const tokenOut = tradeAction.targetCollateralToken!;
  const amountIn = tradeAction.initialCollateralDeltaAmount!;

  const amountOut =
    tradeAction.eventName === TradeActionType.OrderExecuted
      ? tradeAction.executionAmountOut!
      : tradeAction.minOutputAmount!;

  const fromText = formatTokenAmount(amountIn, tokenIn?.decimals, tokenIn?.symbol);
  const toText = formatTokenAmount(amountOut, tokenOut?.decimals, tokenOut?.symbol);

  if (isLimitOrderType(tradeAction.orderType!)) {
    const actionText = getOrderActionText(tradeAction);

    const tokensRatio = getTokensRatioByAmounts({
      fromToken: tokenIn,
      toToken: tokenOut,
      fromTokenAmount: amountIn,
      toTokenAmount: amountOut,
    });

    const fromTokenInfo = tokenIn ? adaptToV1TokenInfo(tokenIn) : undefined;
    const toTokenInfo = tokenOut ? adaptToV1TokenInfo(tokenOut) : undefined;

    const [largest, smallest] =
      tokensRatio?.largestToken.address === tokenIn?.address
        ? [fromTokenInfo, toTokenInfo]
        : [toTokenInfo, fromTokenInfo];

    const ratioText = tokensRatio.ratio.gt(0) ? getExchangeRateDisplay(tokensRatio?.ratio, largest, smallest) : "0";

    return t`${actionText} Order: Swap ${fromText} for ${toText}, Price: ${ratioText}`;
  }

  const actionText =
    tradeAction.eventName === TradeActionType.OrderCreated ? t`Request` : getOrderActionText(tradeAction);

  return t`${actionText} Swap ${fromText} for ${toText}`;
}

function getPositionOrderMessage(tradeAction: PositionTradeAction, minCollateralUsd: BigNumber) {
  const messages = formatPositionOrderMessage(tradeAction, minCollateralUsd);
  if (messages === null) return null;

  return (
    <>
      {messages.map((message, i) => {
        const textElement = (
          <>
            <Trans>{message.text}</Trans>
          </>
        );

        const withTooltip = message.tooltipProps ? (
          <Tooltip
            position="left-top"
            handle={textElement}
            renderContent={() => (
              <>
                <Trans>{message.tooltipTitle}</Trans>
                <br />
                <br />
                {message.tooltipProps?.map((props) => (
                  <StatsTooltipRow {...props} />
                ))}
              </>
            )}
          />
        ) : (
          textElement
        );

        return i === messages.length - 1 ? withTooltip : <>{withTooltip} </>;
      })}
      , Market: {renderMarketName(tradeAction.marketInfo)}
    </>
  );
}

export function TradeHistoryRow(p: Props) {
  const { chainId } = useChainId();
  const { showDebugValues } = useSettings();
  const { tradeAction, minCollateralUsd, shouldDisplayAccount } = p;

  const msg = useMemo(() => {
    if (isSwapOrderType(tradeAction.orderType!)) {
      return getSwapOrderMessage(tradeAction as SwapTradeAction);
    } else {
      return getPositionOrderMessage(tradeAction as PositionTradeAction, minCollateralUsd);
    }
  }, [minCollateralUsd, tradeAction]);

  if (msg === null) return null;

  return (
    <div className="TradeHistoryRow App-box App-box-border">
      <div className="muted TradeHistoryRow-time">
        {formatDateTime(tradeAction.transaction.timestamp)}{" "}
        {shouldDisplayAccount && (
          <span>
            {" "}
            (<Link to={`/actions/v2/${tradeAction.account}`}>{tradeAction.account}</Link>)
          </span>
        )}
      </div>
      <ExternalLink className="plain" href={`${getExplorerUrl(chainId)}tx/${tradeAction.transaction.hash}`}>
        {msg}
      </ExternalLink>
      {showDebugValues && (
        <>
          <br />
          <br />
          <div className="muted">Order Key: {tradeAction.orderKey}</div>
        </>
      )}
    </div>
  );
}
