import { Trans } from "@lingui/macro";
import cx from "classnames";
import { BigNumber } from "ethers";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { isSwapOrderType } from "domain/synthetics/orders";
import { PositionTradeAction, SwapTradeAction, TradeAction } from "domain/synthetics/tradeHistory";

import { getExplorerUrl } from "config/chains";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useChainId } from "lib/chains";

import { formatSwapMessage } from "./utils/swap";

import ExternalLink from "components/ExternalLink/ExternalLink";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { TooltipContent, TooltipString } from "./utils/shared";

import { formatPositionMessage } from "./utils/position";

import "./TradeHistoryRow.scss";

type Props = {
  tradeAction: TradeAction;
  minCollateralUsd: BigNumber;
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

        return (
          <div key={i}>
            <LineSpan span={line} />
          </div>
        );
      })}
    </div>
  );
}

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

  if (msg === null) return null;

  return (
    <>
      <tr
        className={cx("TradeHistoryRow", {
          debug: showDebugValues,
        })}
      >
        <td>
          <ExternalLink className="plain" href={`${getExplorerUrl(chainId)}tx/${tradeAction.transaction.hash}`}>
            {msg.action}
          </ExternalLink>
          <br />
          <span className="TradeHistoryRow-time muted">({msg.timestamp})</span>
          {shouldDisplayAccount && (
            <>
              <br />
              <Link className="TradeHistoryRow-account muted" to={`/actions/${tradeAction.account}`}>
                {tradeAction.account}
              </Link>
            </>
          )}
        </td>
        <td>
          {msg.fullMarket ? (
            <TooltipWithPortal
              handle={msg.market}
              renderContent={() => (
                <>
                  <Trans>Market</Trans>: {msg.fullMarket}
                </>
              )}
            />
          ) : (
            msg.market
          )}
        </td>
        <td>{msg.size}</td>
        <td>
          <TooltipWithPortal
            handle={msg.price}
            renderContent={() => <TooltipContentComponent content={msg.priceComment} />}
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
