import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import type { Address } from "viem";

import { getExplorerUrl } from "config/chains";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isSwapOrderType } from "domain/synthetics/orders";
import { PositionTradeAction, SwapTradeAction, TradeAction } from "domain/synthetics/tradeHistory";
import { EMPTY_ARRAY } from "lib/objects";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";
import { NETWORKS_BY_CHAIN_IDS } from "pages/ParseTransaction/ParseTransaction";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { MarketWithDirectionLabel } from "components/MarketWithDirectionLabel/MarketWithDirectionLabel";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { SwapMarketLabel } from "components/SwapMarketLabel/SwapMarketLabel";
import { TableTd, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import NewLink20ReactComponent from "img/ic_new_link_20.svg?react";

import { formatPositionMessage } from "./utils/position";
import { TooltipContent, TooltipString } from "./utils/shared";
import { formatSwapMessage } from "./utils/swap";

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
        "text-red-500": span.state === "error",
        "text-green-500": span.state === "success",
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
  const chainId = useSelector(selectChainId);
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
            <div className="flex items-center">
              <span>{msg.indexName!}</span>
              <span className="subtext leading-1">[{msg.poolName!}]</span>
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
            <span className="subtext leading-1">[{market.poolName}]</span>
          </span>
        ))}
      </>
    );
  }, [msg.fullMarketNames, msg.indexName, msg.poolName]);

  const renderPriceContent = useCallback(
    () => <TooltipContentComponent content={msg.priceComment ?? EMPTY_ARRAY} />,
    [msg.priceComment]
  );

  const renderActionTooltipContent = useCallback(
    () => <TooltipContentComponent content={msg.actionComment!} />,
    [msg.actionComment]
  );

  const marketTooltipHandle = useMemo(
    () =>
      msg.swapFromTokenSymbol ? (
        <SwapMarketLabel bordered fromSymbol={msg.swapFromTokenSymbol!} toSymbol={msg.swapToTokenSymbol!} />
      ) : (
        <div className="cursor-help">
          <MarketWithDirectionLabel
            bordered
            indexName={msg.indexName!}
            isLong={msg.isLong!}
            tokenSymbol={msg.indexTokenSymbol!}
          />
        </div>
      ),
    [msg.indexName, msg.indexTokenSymbol, msg.isLong, msg.swapFromTokenSymbol, msg.swapToTokenSymbol]
  );

  return (
    <>
      <TableTr
        className={cx("TradeHistoryRow", {
          debug: showDebugValues,
        })}
      >
        <TableTd>
          <div className="flex">
            {msg.actionComment ? (
              <TooltipWithPortal
                className={cx("TradeHistoryRow-action-handle")}
                handleClassName={cx("TradeHistoryRow-action-handle", {
                  "text-red-500 !decoration-red-500/50": msg.isActionError,
                })}
                handle={msg.action}
                renderContent={renderActionTooltipContent}
              />
            ) : (
              <span
                className={cx("TradeHistoryRow-action-handle", {
                  "text-red-500": msg.isActionError,
                })}
              >
                {msg.action}
              </span>
            )}
            <div className="flex flex-row items-center">
              <ExternalLink
                className="TradeHistoryRow-external-link ml-5"
                href={`${getExplorerUrl(chainId)}tx/${tradeAction.transaction.hash}`}
              >
                <NewLink20ReactComponent />
              </ExternalLink>
              {showDebugValues && (
                <Link
                  to={`/parsetx/${NETWORKS_BY_CHAIN_IDS[chainId]}/${tradeAction.transaction.hash}`}
                  className="text-body-small ml-5 text-slate-100 hover:text-white"
                >
                  Events
                </Link>
              )}
            </div>
          </div>
          <TooltipWithPortal
            disableHandleStyle
            handle={<span className="TradeHistoryRow-time muted cursor-help">{msg.timestamp}</span>}
            tooltipClassName="TradeHistoryRow-tooltip-portal cursor-help *:cursor-auto"
            renderContent={renderTimestamp}
          />
          {shouldDisplayAccount && (
            <Link
              className="TradeHistoryRow-account muted underline"
              to={buildAccountDashboardUrl(tradeAction.account as Address, undefined, 2)}
            >
              {tradeAction.account}
            </Link>
          )}
        </TableTd>
        <TableTd>
          <TooltipWithPortal
            disableHandleStyle
            tooltipClassName="cursor-help *:cursor-auto"
            handle={marketTooltipHandle}
            renderContent={renderMarketContent}
          />
        </TableTd>
        <TableTd>
          {msg.swapFromTokenSymbol ? (
            <Trans>
              {msg.swapFromTokenAmount} <TokenIcon symbol={msg.swapFromTokenSymbol!} displaySize={18} importSize={24} />
              <span> to </span>
              {msg.swapToTokenAmount} <TokenIcon symbol={msg.swapToTokenSymbol!} displaySize={18} importSize={24} />
            </Trans>
          ) : (
            msg.size
          )}
        </TableTd>
        <TableTd>
          {msg.priceComment ? (
            <TooltipWithPortal
              tooltipClassName="TradeHistoryRow-price-tooltip-portal"
              handle={msg.price}
              position="bottom-end"
              renderContent={renderPriceContent}
              maxAllowedWidth={PRICE_TOOLTIP_WIDTH}
            />
          ) : (
            <>{msg.price}</>
          )}
        </TableTd>
        <TableTd className="TradeHistoryRow-pnl-fees">
          {!msg.pnl ? (
            <span className="text-slate-100">-</span>
          ) : (
            <span
              className={cx({
                "text-red-500": msg.pnlState === "error",
                "text-green-500": msg.pnlState === "success",
              })}
            >
              {msg.pnl}
            </span>
          )}
        </TableTd>
      </TableTr>
      {showDebugValues && (
        <TableTr>
          <TableTd colSpan={42}>
            <div className="muted">Order Key: {tradeAction.orderKey}</div>
          </TableTd>
        </TableTr>
      )}
    </>
  );
}
