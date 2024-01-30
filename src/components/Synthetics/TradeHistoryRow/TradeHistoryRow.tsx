import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { getExplorerUrl } from "config/chains";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { MarketInfo, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { isSwapOrderType } from "domain/synthetics/orders";
import { PositionTradeAction, SwapTradeAction, TradeAction } from "domain/synthetics/tradeHistory";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatDateTime } from "lib/dates";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import "./TradeHistoryRow.scss";
import { formatPositionMessage, formatSwapMessage } from "./utils";
import { t } from "@lingui/macro";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

type Props = {
  tradeAction: TradeAction;
  minCollateralUsd: BigNumber;
  shouldDisplayAccount?: boolean;
};

function renderMarketName(market: MarketInfo) {
  const indexName = getMarketIndexName(market);
  const poolName = getMarketPoolName(market);
  return (
    <div className="items-top lh-1">
      <span className="text-white">{indexName}</span>
      <span className="subtext">[{poolName}]</span>
    </div>
  );
}

function getSwapOrderMessage(tradeAction: SwapTradeAction) {
  return formatSwapMessage(tradeAction);
}

function getPositionOrderMessage(tradeAction: PositionTradeAction, minCollateralUsd: BigNumber) {
  const messages = formatPositionMessage(tradeAction, minCollateralUsd);
  if (messages === null) return null;

  return (
    <span className="TradeHistoryRow-message">
      {messages.map((message) => {
        const hasSmthAfterTitle = message.tooltipRows?.length || message.tooltipFooter;
        const hasSmthBeforeFooter = message.tooltipTitle || message.tooltipRows?.length;
        const showTooltip = message.tooltipRows || message.tooltipFooter || message.tooltipTitle;
        const textElement = (
          <span className={message.isError && !showTooltip ? "text-red" : undefined}>{message.text}</span>
        );

        return showTooltip ? (
          <TooltipWithPortal
            position="left-top"
            handle={textElement}
            className={message.isError ? "Tooltip-error" : undefined}
            renderContent={() => (
              <>
                {message.tooltipTitle ? (
                  <span className={message.tooltipTitleRed ? "text-red" : undefined}>
                    {message.tooltipTitle}
                    {hasSmthAfterTitle && (
                      <>
                        <br />
                        <br />
                      </>
                    )}
                  </span>
                ) : null}
                {message.tooltipRows?.map((props) => (
                  <StatsTooltipRow {...props} />
                ))}
                {message.tooltipFooter ? (
                  <span className={message.tooltipFooterRed ? "text-red" : undefined}>
                    {hasSmthBeforeFooter && (
                      <>
                        <br />
                        <br />
                      </>
                    )}
                    {message.tooltipFooter}
                  </span>
                ) : null}
              </>
            )}
          />
        ) : (
          textElement
        );
      })}
      , Market:{" "}
      <TooltipWithPortal
        position="right-bottom"
        handle={getMarketIndexName(tradeAction.marketInfo)}
        renderContent={() => (
          <StatsTooltipRow showDollar={false} label={t`Market`} value={renderMarketName(tradeAction.marketInfo)} />
        )}
      />
    </span>
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
            (<Link to={`/actions/${tradeAction.account}`}>{tradeAction.account}</Link>)
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
