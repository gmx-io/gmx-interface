import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Address } from "viem";

import { getChainSlug, getExplorerUrl } from "config/chains";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isDecreaseOrderType, isSwapOrderType } from "domain/synthetics/orders";
import {
  isPositionTradeAction,
  PositionTradeAction,
  SwapTradeAction,
  TradeAction,
  TradeActionType,
} from "domain/synthetics/tradeHistory";
import { EMPTY_ARRAY } from "lib/objects";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionClickEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { MarketWithDirectionLabel } from "components/MarketWithDirectionLabel/MarketWithDirectionLabel";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { SwapMarketLabel } from "components/SwapMarketLabel/SwapMarketLabel";
import { TableTd, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import NewLinkIconThin from "img/ic_new_link_thin.svg?react";

import ShareClosedPosition from "./ShareClosedPosition";
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
    return span;
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
  const { account } = useWallet();
  const marketsInfoData = useMarketsInfoData();

  const msg = useMemo(() => {
    if (isSwapOrderType(tradeAction.orderType!)) {
      return formatSwapMessage(tradeAction as SwapTradeAction, marketsInfoData);
    }

    return formatPositionMessage(tradeAction as PositionTradeAction, minCollateralUsd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSwapOrderType(tradeAction.orderType!) && marketsInfoData, minCollateralUsd.toString(), tradeAction.id]);

  const renderTimestamp = useCallback(() => msg.timestampUTC, [msg.timestampUTC]);

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

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const handleShareClick = useCallback(() => {
    userAnalytics.pushEvent<SharePositionClickEvent>({
      event: "SharePositionAction",
      data: {
        action: "SharePositionClick",
      },
    });
    setIsShareModalOpen(true);
  }, [setIsShareModalOpen]);

  const shouldDisplayShareButton =
    isDecreaseOrderType(tradeAction.orderType) &&
    tradeAction.eventName === TradeActionType.OrderExecuted &&
    account === tradeAction.account;

  return (
    <>
      <TableTr
        hoverable={true}
        className={cx("TradeHistoryRow", {
          debug: showDebugValues,
        })}
      >
        <TableTd>
          <div className="flex">
            <div className="flex items-center gap-4">
              {msg.actionComment ? (
                <TooltipWithPortal
                  className={cx("TradeHistoryRow-action-handle")}
                  handleClassName={cx("TradeHistoryRow-action-handle", {
                    "text-red-500 !decoration-red-500/50": msg.isActionError,
                  })}
                  handle={<span className="font-medium">{msg.action}</span>}
                  renderContent={renderActionTooltipContent}
                />
              ) : (
                <span
                  className={cx("TradeHistoryRow-action-handle font-medium", {
                    "text-red-500": msg.isActionError,
                  })}
                >
                  {msg.action}
                </span>
              )}
              <ExternalLink
                className="TradeHistoryRow-external-link size-12"
                href={`${getExplorerUrl(chainId)}tx/${tradeAction.transaction.hash}`}
              >
                <NewLinkIconThin />
              </ExternalLink>
            </div>
            <div className="flex flex-row items-center">
              {showDebugValues && (
                <Link
                  to={`/parsetx/${getChainSlug(chainId)}/${tradeAction.transaction.hash}`}
                  className="text-body-small ml-5 text-typography-secondary hover:text-typography-primary"
                >
                  <Trans>Events</Trans>
                </Link>
              )}
            </div>
          </div>
          <TooltipWithPortal
            variant="none"
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
            variant="none"
            tooltipClassName="cursor-help *:cursor-auto"
            handle={marketTooltipHandle}
            renderContent={renderMarketContent}
          />
        </TableTd>
        <TableTd>
          <span className="numbers">
            {msg.swapFromTokenSymbol ? (
              <Trans>
                {msg.swapFromTokenAmount} <TokenIcon symbol={msg.swapFromTokenSymbol!} displaySize={18} />
                <span> to </span>
                {msg.swapToTokenAmount} <TokenIcon symbol={msg.swapToTokenSymbol!} displaySize={18} />
              </Trans>
            ) : (
              msg.size
            )}
          </span>
        </TableTd>
        <TableTd>
          {msg.priceComment ? (
            <TooltipWithPortal
              tooltipClassName="TradeHistoryRow-price-tooltip-portal"
              handle={msg.price}
              handleClassName="numbers"
              position="bottom-end"
              renderContent={renderPriceContent}
              maxAllowedWidth={PRICE_TOOLTIP_WIDTH}
            />
          ) : (
            <span className="numbers">{msg.price}</span>
          )}
        </TableTd>
        <TableTd>
          {!msg.pnl ? (
            <span className="text-typography-secondary">-</span>
          ) : (
            <span
              className={cx("numbers", {
                "text-red-500": msg.pnlState === "error",
                "text-green-500": msg.pnlState === "success",
              })}
            >
              {msg.pnl}
            </span>
          )}
        </TableTd>
        <TableTd>
          {shouldDisplayShareButton ? (
            <Button variant="ghost" onClick={handleShareClick}>
              <NewLinkIconThin className="size-16" />
              <Trans>Share</Trans>
            </Button>
          ) : null}
        </TableTd>
      </TableTr>
      {isPositionTradeAction(tradeAction) ? (
        <ShareClosedPosition
          tradeAction={tradeAction}
          isShareModalOpen={isShareModalOpen}
          setIsShareModalOpen={setIsShareModalOpen}
          shareSource="trade-history-list"
        />
      ) : null}
      {showDebugValues && (
        <TableTr>
          <TableTd colSpan={42}>
            <div className="muted">
              <Trans>Order Key:</Trans> {tradeAction.orderKey}
            </div>
          </TableTd>
        </TableTr>
      )}
    </>
  );
}
