import { t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";

import { isSwapOrderType } from "domain/synthetics/orders";
import { PositionTradeAction, SwapTradeAction, TradeAction } from "domain/synthetics/tradeHistory";

import { getExplorerUrl } from "config/chains";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useChainId } from "lib/chains";

import { formatPositionMessage } from "./utils/position";
import { formatSwapMessage } from "./utils/swap";
import { TooltipContent, TooltipString } from "./utils/shared";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { ReactComponent as NewLink20ReactComponent } from "img/ic_new_link_20.svg";

import "./TradeHistoryRow.scss";

type Props = {
  tradeAction: TradeAction;
  minCollateralUsd: bigint;
  shouldDisplayAccount?: boolean;
  showDebugValues?: boolean;
};

function LineSpan({ span }: { span: TooltipString }) {
  if (span === undefined) {
    return null;
  }

  if (typeof span === "string") {
    return <span>{span}</span>;
  }

  return (
    <span
      className={cx({
        "text-red": span.state === "error",
        "text-green": span.state === "success",
        muted: span.state === "muted",
      })}
    >
      {span.text}
    </span>
  );
}

function LineSpans({ spans }: { spans: TooltipString[] }) {
  return (
    <>
      {spans.map((span, i) => (
        <LineSpan key={i} span={span} />
      ))}
    </>
  );
}

function TooltipContentComponent({ content }: { content: TooltipContent }) {
  return (
    <div className="TradeHistoryRow-tooltip">
      {content.map((line, i) => {
        if (line === undefined) {
          return null;
        }

        if (line === "") {
          return <br key={i} />;
        }

        if (typeof line === "string") {
          return <div key={i}>{line}</div>;
        }

        if (Array.isArray(line)) {
          return (
            <div key={i}>
              <LineSpans spans={line} />
            </div>
          );
        }

        if ("key" in line && "value" in line) {
          return <StatsTooltipRow key={i} label={line.key} value={<LineSpan span={line.value} />} showDollar={false} />;
        }

        return (
          <div key={i}>
            <LineSpan span={line} />
          </div>
        );
      })}
    </div>
  );
}

const PRICE_TOOLTIP_WIDTH = 400;

export function TradeHistoryRow({ minCollateralUsd, tradeAction, shouldDisplayAccount, showDebugValues }: Props) {
  const { chainId } = useChainId();
  const marketsInfoData = useMarketsInfoData();

  const msg = useMemo(() => {
    if (isSwapOrderType(tradeAction.orderType!)) {
      return formatSwapMessage(tradeAction as SwapTradeAction, marketsInfoData);
    }

    return formatPositionMessage(tradeAction as PositionTradeAction, minCollateralUsd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSwapOrderType(tradeAction.orderType!) && marketsInfoData, minCollateralUsd.toString(), tradeAction.id]);

  const renderTimestamp = useCallback(() => msg.timestampISO, [msg.timestampISO]);

  const renderMarketContent = useCallback(() => {
    if (msg.indexName) {
      return (
        <StatsTooltipRow
          label={t`Market`}
          value={
            <div className="items-center">
              <span>{msg.indexName!}</span>
              <span className="subtext lh-1">[{msg.poolName!}]</span>
            </div>
          }
          showDollar={false}
        />
      );
    }

    return (
      <>
        {msg.fullMarketNames?.map((market, index) => (
          <span key={market.indexName}>
            {index > 0 && " → "}
            <span>{market.indexName}</span>
            <span className="subtext lh-1">[{market.poolName}]</span>
          </span>
        ))}
      </>
    );
  }, [msg.fullMarketNames, msg.indexName, msg.poolName]);

  const renderPriceContent = useCallback(
    () => <TooltipContentComponent content={msg.priceComment} />,
    [msg.priceComment]
  );

  const renderActionTooltipContent = useCallback(
    () => <TooltipContentComponent content={msg.actionComment!} />,
    [msg.actionComment]
  );

  return (
    <>
      <tr
        className={cx("TradeHistoryRow", {
          debug: showDebugValues,
        })}
      >
        <td>
          <div className="flex">
            {msg.actionComment ? (
              <TooltipWithPortal
                className={cx("TradeHistoryRow-action-handle", {
                  "Tooltip-error": msg.isActionError,
                })}
                handleClassName="TradeHistoryRow-action-handle"
                handle={msg.action}
                renderContent={renderActionTooltipContent}
              />
            ) : (
              <span
                className={cx("TradeHistoryRow-action-handle", {
                  "text-red": msg.isActionError,
                })}
              >
                {msg.action}
              </span>
            )}
            <ExternalLink
              className="TradeHistoryRow-external-link ml-xs"
              href={`${getExplorerUrl(chainId)}tx/${tradeAction.transaction.hash}`}
            >
              <NewLink20ReactComponent />
            </ExternalLink>
          </div>
          <TooltipWithPortal
            disableHandleStyle
            handle={<span className="TradeHistoryRow-time muted">{msg.timestamp}</span>}
            portalClassName="TradeHistoryRow-tooltip-portal"
            renderContent={renderTimestamp}
          />
          {shouldDisplayAccount && (
            <Link className="TradeHistoryRow-account muted" to={`/actions/${tradeAction.account}`}>
              {tradeAction.account}
            </Link>
          )}
        </td>
        <td>
          <TooltipWithPortal handle={msg.market} renderContent={renderMarketContent} />
        </td>
        <td>{msg.size}</td>
        <td className="TradeHistoryRow-price">
          <TooltipWithPortal
            portalClassName="TradeHistoryRow-price-tooltip-portal"
            handle={msg.price}
            renderContent={renderPriceContent}
            maxAllowedWidth={PRICE_TOOLTIP_WIDTH}
          />
        </td>
      </tr>
      {showDebugValues && (
        <tr>
          <td colSpan={4}>
            <div className="muted">Order Key: {tradeAction.orderKey}</div>
          </td>
        </tr>
      )}
    </>
  );
}
