import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Address } from "viem";

import { getChainSlug, getExplorerUrl } from "config/chains";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isDecreaseOrderType, isLiquidationOrderType, isSwapOrderType } from "domain/synthetics/orders";
import {
  isPositionTradeAction,
  PositionTradeAction,
  SwapTradeAction,
  TradeAction,
  TradeActionType,
} from "domain/synthetics/tradeHistory";
import { useLifecycleSettlement } from "domain/synthetics/tradeHistory/useLifecycleSettlement";
import { EMPTY_ARRAY } from "lib/objects";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionClickEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { MarketWithDirectionLabel } from "components/MarketWithDirectionLabel/MarketWithDirectionLabel";
import { NumericText } from "components/NumericValue/NumericValue";
import { SwapMarketLabel } from "components/SwapMarketLabel/SwapMarketLabel";
import { TableTd, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import {
  TooltipContent,
  TooltipDivider,
  TooltipFootnote,
  TooltipRow,
  TooltipRows,
  TooltipText,
} from "components/Tooltip/TooltipBlocks";

import FilterHistoryIcon from "img/ic_filter_history.svg?react";
import NewLinkIconThin from "img/ic_new_link_thin.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

import ShareClosedPosition from "./ShareClosedPosition";
import {
  getLifecycleSettlementLines,
  getLifecycleSettlementView,
  getSettlementNotes,
  getUnreconcilableLifecycleLines,
} from "./utils/lifecycleSettlement";
import { formatPositionMessage, getSettlementTooltipLines } from "./utils/position";
import { Line, TooltipString } from "./utils/shared";
import { formatSwapMessage } from "./utils/swap";

import "./TradeHistoryRow.scss";

type Props = {
  tradeAction: TradeAction;
  minCollateralUsd: bigint;
  shouldDisplayAccount?: boolean;
  showDebugValues?: boolean;
  onSelectPositionLifecycle?: (tradeAction: PositionTradeAction) => void;
};

function LineSpan({ span }: { span: TooltipString }) {
  if (span === undefined) {
    return null;
  }

  if (typeof span === "string") {
    return span;
  }

  return (
    <NumericText
      text={span.text}
      className={cx({
        "text-red-500": span.state === "error",
        "text-green-500": span.state === "success",
        muted: span.state === "muted",
      })}
    />
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

type RowLine = Extract<Line, { key: string }>;

function isRowLine(line: Line): line is RowLine {
  return typeof line === "object" && !Array.isArray(line) && "key" in line;
}

function isFootnoteLine(line: Line) {
  return typeof line === "object" && !Array.isArray(line) && "text" in line && line.state === "muted";
}

function getTooltipBlocks(content: Line[]): ReactNode[] {
  const blocks: ReactNode[] = [];
  let rows: RowLine[] = [];
  let lastBlock: "text" | "rows" | undefined;
  let hasGap = false;

  const flushRows = () => {
    if (rows.length === 0) {
      return;
    }

    blocks.push(
      <TooltipRows key={blocks.length}>
        {rows.map((row, i) => (
          <TooltipRow
            key={i}
            label={row.key}
            value={Array.isArray(row.value) ? <LineSpans spans={row.value} /> : <LineSpan span={row.value} />}
            valueClassName={Array.isArray(row.value) ? "min-w-0 !shrink !whitespace-normal" : undefined}
          />
        ))}
      </TooltipRows>
    );
    rows = [];
    lastBlock = "rows";
  };

  content.forEach((line) => {
    if (line === undefined) {
      return;
    }

    if (line === "") {
      flushRows();
      hasGap = lastBlock !== undefined;
      return;
    }

    if (!isRowLine(line)) {
      flushRows();
    }

    if (hasGap && lastBlock === "rows" && !isFootnoteLine(line)) {
      blocks.push(<TooltipDivider key={blocks.length} />);
    }

    hasGap = false;

    if (isRowLine(line)) {
      rows.push(line);
      return;
    }

    if (typeof line === "string") {
      blocks.push(<TooltipText key={blocks.length}>{line}</TooltipText>);
    } else if (Array.isArray(line)) {
      blocks.push(
        <TooltipText key={blocks.length}>
          <LineSpans spans={line} />
        </TooltipText>
      );
    } else if (isFootnoteLine(line)) {
      blocks.push(
        <TooltipFootnote key={blocks.length}>
          <NumericText text={line.text} />
        </TooltipFootnote>
      );
    } else {
      blocks.push(
        <TooltipText key={blocks.length}>
          <LineSpan span={line} />
        </TooltipText>
      );
    }

    lastBlock = "text";
  });

  flushRows();

  return blocks;
}

function TooltipContentComponent({ content }: { content: Line[] }) {
  return (
    <TooltipContent className="max-h-[min(70vh,calc(var(--tooltip-available-height,70vh)-28px))] overflow-y-auto">
      {getTooltipBlocks(content)}
    </TooltipContent>
  );
}

function getPlainText(content: Line[]): string | undefined {
  const lines = content.filter((line) => line !== undefined && line !== "");

  if (lines.length !== 1) {
    return undefined;
  }

  const [line] = lines;

  if (typeof line === "string") {
    return line;
  }

  if (
    typeof line === "object" &&
    !Array.isArray(line) &&
    "text" in line &&
    typeof line.text === "string" &&
    (line.state === undefined || line.state === "muted")
  ) {
    return line.text;
  }

  return undefined;
}

function renderTooltipContent(content: Line[]): ReactNode {
  return getPlainText(content) ?? <TooltipContentComponent content={content} />;
}

function getFullCloseCandidate(tradeAction: TradeAction): PositionTradeAction | undefined {
  if (!isPositionTradeAction(tradeAction)) {
    return undefined;
  }

  const isFullCloseCandidate =
    tradeAction.eventName === TradeActionType.OrderExecuted &&
    (isDecreaseOrderType(tradeAction.orderType) || isLiquidationOrderType(tradeAction.orderType)) &&
    tradeAction.sizeDeltaUsd > 0n &&
    tradeAction.positionSizeInUsd === 0n;

  return isFullCloseCandidate ? tradeAction : undefined;
}

function FeesTooltipContent({ tradeAction, feesLines }: { tradeAction: TradeAction; feesLines: Line[] }) {
  const chainId = useSelector(selectChainId);

  const fullCloseCandidate = getFullCloseCandidate(tradeAction);

  const { settlement, isLoading } = useLifecycleSettlement(chainId, fullCloseCandidate);

  const content = useMemo(() => {
    if (!fullCloseCandidate || !settlement) {
      return feesLines;
    }

    const view = getLifecycleSettlementView(fullCloseCandidate, settlement);

    const settlementLines =
      view.mode === "extended"
        ? getLifecycleSettlementLines(view.aggregate)
        : view.mode === "compact"
          ? [
              ...getSettlementTooltipLines(fullCloseCandidate, view.openRow, view.isMultichain),
              "",
              ...getSettlementNotes(view.isMultichain),
            ]
          : [
              ...getSettlementTooltipLines(fullCloseCandidate, undefined, view.isMultichain),
              "",
              ...getSettlementNotes(view.isMultichain),
              ...getUnreconcilableLifecycleLines(),
            ];

    if (feesLines.length === 0) {
      return settlementLines[0] === "" ? settlementLines.slice(1) : settlementLines;
    }

    return [...feesLines, ...settlementLines];
  }, [feesLines, fullCloseCandidate, settlement]);

  return (
    <>
      <TooltipContentComponent content={content} />
      {isLoading ? (
        <div className="mt-8">
          <SpinnerIcon className="size-12 animate-spin" />
        </div>
      ) : null}
    </>
  );
}

export function TradeHistoryRow({
  minCollateralUsd,
  tradeAction,
  shouldDisplayAccount,
  showDebugValues,
  onSelectPositionLifecycle,
}: Props) {
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

  const renderTimestamp = useCallback(() => <TooltipRow label="UTC" value={msg.timestampUTC} />, [msg.timestampUTC]);

  const renderMarketContent = useCallback(() => {
    if (msg.indexName) {
      return (
        <TooltipRow
          label={t`Market`}
          value={
            <div className="flex items-center">
              <span>{msg.indexName!}</span>
              <span className="subtext leading-1">[{msg.poolName!}]</span>
            </div>
          }
        />
      );
    }

    return (
      <TooltipText>
        {msg.fullMarketNames?.map((market, index) => (
          <span key={market.indexName}>
            {index > 0 && " → "}
            <span>{market.indexName}</span>
            <span className="subtext leading-1">[{market.poolName}]</span>
          </span>
        ))}
      </TooltipText>
    );
  }, [msg.fullMarketNames, msg.indexName, msg.poolName]);

  const renderPriceContent = useCallback(
    () => renderTooltipContent(msg.priceComment ?? EMPTY_ARRAY),
    [msg.priceComment]
  );

  const renderSizeContent = useCallback(() => renderTooltipContent(msg.sizeComment ?? EMPTY_ARRAY), [msg.sizeComment]);

  const renderActionTooltipContent = useCallback(() => renderTooltipContent(msg.actionComment!), [msg.actionComment]);

  const renderFeesTooltipContent = useCallback(
    () => <FeesTooltipContent tradeAction={tradeAction} feesLines={msg.feesTooltip ?? EMPTY_ARRAY} />,
    [msg.feesTooltip, tradeAction]
  );

  const marketTooltipHandle = useMemo(
    () =>
      msg.swapFromTokenSymbol ? (
        <span className="font-medium">
          <SwapMarketLabel fromSymbol={msg.swapFromTokenSymbol!} toSymbol={msg.swapToTokenSymbol!} />
        </span>
      ) : (
        <MarketWithDirectionLabel indexName={msg.indexName!} isLong={msg.isLong!} tokenSymbol={msg.indexTokenSymbol!} />
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
    account === tradeAction.account &&
    !tradeAction.twapParams;

  const isFullCloseSettlementCandidate = getFullCloseCandidate(tradeAction) !== undefined;

  const shouldDisplayPositionLifecycleButton =
    isPositionTradeAction(tradeAction) &&
    Boolean(tradeAction.positionLifecycleId) &&
    Boolean(onSelectPositionLifecycle);

  const handleSelectPositionLifecycleClick = useCallback(() => {
    if (isPositionTradeAction(tradeAction)) {
      onSelectPositionLifecycle?.(tradeAction);
    }
  }, [onSelectPositionLifecycle, tradeAction]);

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
                <StandardTooltip
                  className={cx("TradeHistoryRow-action-handle")}
                  handleClassName={cx("TradeHistoryRow-action-handle", {
                    "text-red-500": msg.isActionError,
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
                href={`${getExplorerUrl(chainId)}tx/${tradeAction.transactionHash}`}
              >
                <NewLinkIconThin />
              </ExternalLink>
            </div>
            <div className="flex flex-row items-center">
              {showDebugValues && (
                <Link
                  to={`/parsetx/${getChainSlug(chainId)}/${tradeAction.transactionHash}`}
                  className="text-body-small ml-5 text-typography-secondary hover:text-typography-primary"
                >
                  <Trans>Events</Trans>
                </Link>
              )}
            </div>
          </div>
          <StandardTooltip
            handle={<span className="TradeHistoryRow-time muted">{msg.timestamp}</span>}
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
          <StandardTooltip handle={marketTooltipHandle} renderContent={renderMarketContent} />
        </TableTd>
        <TableTd>
          {msg.swapFromTokenSymbol ? (
            <span className="numbers">
              <Trans>
                {msg.swapFromTokenAmount} <TokenIcon symbol={msg.swapFromTokenSymbol!} displaySize={18} />
                <span> to </span>
                {msg.swapToTokenAmount} <TokenIcon symbol={msg.swapToTokenSymbol!} displaySize={18} />
              </Trans>
            </span>
          ) : msg.sizeComment ? (
            <StandardTooltip
              handle={<NumericText text={msg.size} className="numbers" />}
              renderContent={renderSizeContent}
            />
          ) : (
            <NumericText text={msg.size} className="numbers" />
          )}
        </TableTd>
        <TableTd>
          {msg.priceComment ? (
            <StandardTooltip
              handle={<NumericText text={msg.price} />}
              handleClassName="numbers"
              position="bottom-end"
              renderContent={renderPriceContent}
            />
          ) : (
            <NumericText text={msg.price} className="numbers" />
          )}
        </TableTd>
        <TableTd>
          {!msg.pnl ? (
            <span className="text-typography-secondary">-</span>
          ) : msg.pnlTooltip ? (
            <StandardTooltip
              handle={
                <NumericText
                  text={msg.pnl}
                  className={cx("numbers", {
                    "text-red-500": msg.pnlState === "error",
                    "text-green-500": msg.pnlState === "success",
                  })}
                />
              }
              content={msg.pnlTooltip}
            />
          ) : (
            <NumericText
              text={msg.pnl}
              className={cx("numbers", {
                "text-red-500": msg.pnlState === "error",
                "text-green-500": msg.pnlState === "success",
              })}
            />
          )}
        </TableTd>
        <TableTd>
          {(msg.feesTooltip && msg.feesTooltip.length > 0) || isFullCloseSettlementCandidate ? (
            <StandardTooltip
              handle={
                msg.fees ? (
                  <NumericText text={msg.fees} className="numbers" />
                ) : (
                  <span className="text-typography-secondary">-</span>
                )
              }
              renderContent={renderFeesTooltipContent}
            />
          ) : !msg.fees ? (
            <span className="text-typography-secondary">-</span>
          ) : (
            <NumericText text={msg.fees} className="numbers" />
          )}
        </TableTd>
        <TableTd>
          <div className="flex items-center justify-end gap-4">
            {shouldDisplayShareButton ? (
              <Button variant="ghost" onClick={handleShareClick}>
                <NewLinkIconThin className="size-16" />
                <Trans>Share</Trans>
              </Button>
            ) : null}
            {shouldDisplayPositionLifecycleButton ? (
              <StandardTooltip
                variant="none"
                type="label"
                position="bottom-end"
                shouldPreventDefault={false}
                handle={
                  <Button
                    variant="ghost"
                    onClick={handleSelectPositionLifecycleClick}
                    className="!min-h-28 !px-8 !py-6"
                    aria-label={t`View position history`}
                  >
                    <FilterHistoryIcon className="size-14" />
                  </Button>
                }
                content={t`View position history`}
              />
            ) : (
              // Reserve the button's space so the Share button and layout don't shift between rows/states.
              <Button variant="ghost" className="invisible !min-h-28 !px-8 !py-6">
                <FilterHistoryIcon className="size-14" />
              </Button>
            )}
          </div>
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
              <Trans>Order key:</Trans> {tradeAction.orderKey}
            </div>
          </TableTd>
        </TableTr>
      )}
    </>
  );
}
