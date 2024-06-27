import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import type { Address } from "viem";

import { isSwapOrderType } from "domain/synthetics/orders";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens/utils";
import { PositionTradeAction, SwapTradeAction, TradeAction } from "domain/synthetics/tradeHistory";

import { getExplorerUrl } from "config/chains";
import { getWrappedToken } from "config/tokens";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { formatTokenAmount } from "lib/numbers";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/AccountDashboard";
import { formatPositionMessage } from "./utils/position";
import { TooltipContent, TooltipString } from "./utils/shared";
import { formatSwapMessage } from "./utils/swap";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { MarketWithDirectionLabel } from "components/MarketWithDirectionLabel/MarketWithDirectionLabel";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { SwapMarketLabel } from "components/SwapMarketLabel/SwapMarketLabel";
import TokenIcon from "components/TokenIcon/TokenIcon";
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
    () => <TooltipContentComponent content={msg.priceComment} />,
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

  const wrappedToken = getWrappedToken(chainId);
  function getCollateralText() {
    const collateralUsd = convertToUsd(
      tradeAction.initialCollateralDeltaAmount,
      tradeAction.initialCollateralToken.decimals,
      tradeAction.initialCollateralToken.prices.minPrice
    );

    const targetCollateralAmount = convertToTokenAmount(
      collateralUsd,
      tradeAction.targetCollateralToken.decimals,
      tradeAction.targetCollateralToken.prices.minPrice
    );

    const tokenAmountText = formatTokenAmount(
      targetCollateralAmount,
      tradeAction.targetCollateralToken?.decimals,
      tradeAction.targetCollateralToken.isNative ? wrappedToken.symbol : tradeAction.targetCollateralToken.symbol
    );

    return `${tokenAmountText}`;
  }

  const isCollateralSwap =
    tradeAction.shouldUnwrapNativeToken ||
    tradeAction.initialCollateralToken.address !== tradeAction.targetCollateralToken.address;

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
                  "text-red-500": msg.isActionError,
                })}
              >
                {msg.action}
              </span>
            )}
            <ExternalLink
              className="TradeHistoryRow-external-link ml-5"
              href={`${getExplorerUrl(chainId)}tx/${tradeAction.transaction.hash}`}
            >
              <NewLink20ReactComponent />
            </ExternalLink>
          </div>
          <TooltipWithPortal
            disableHandleStyle
            handle={<span className="TradeHistoryRow-time muted cursor-help">{msg.timestamp}</span>}
            portalClassName="TradeHistoryRow-tooltip-portal cursor-help *:cursor-auto"
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
        </td>
        <td>
          <TooltipWithPortal
            disableHandleStyle
            portalClassName="cursor-help *:cursor-auto"
            handle={marketTooltipHandle}
            renderContent={renderMarketContent}
          />
        </td>
        <td>
          {msg.swapFromTokenSymbol ? (
            <Trans>
              {msg.swapFromTokenAmount} <TokenIcon symbol={msg.swapFromTokenSymbol!} displaySize={18} importSize={24} />
              <span> to </span>
              {msg.swapToTokenAmount} <TokenIcon symbol={msg.swapToTokenSymbol!} displaySize={18} importSize={24} />
            </Trans>
          ) : (
            <TooltipWithPortal
              content={
                <>
                  <StatsTooltipRow label={t`Collateral`} value={getCollateralText()} showDollar={false} />

                  {isCollateralSwap && (
                    <div className="OrderItem-tooltip-row">
                      <Trans>
                        {formatTokenAmount(
                          tradeAction.initialCollateralDeltaAmount,
                          tradeAction.initialCollateralToken.decimals,
                          tradeAction.initialCollateralToken[
                            tradeAction.shouldUnwrapNativeToken ? "baseSymbol" : "symbol"
                          ]
                        )}{" "}
                        will be swapped to{" "}
                        {tradeAction.targetCollateralToken.isNative
                          ? wrappedToken.symbol
                          : tradeAction.targetCollateralToken.symbol}{" "}
                        on order execution.
                      </Trans>
                    </div>
                  )}
                </>
              }
            >
              {msg.size}
            </TooltipWithPortal>
          )}
        </td>
        <td>
          <TooltipWithPortal
            portalClassName="TradeHistoryRow-price-tooltip-portal"
            handle={msg.price}
            position="bottom-end"
            renderContent={renderPriceContent}
            maxAllowedWidth={PRICE_TOOLTIP_WIDTH}
          />
        </td>
        <td className="TradeHistoryRow-pnl-fees">
          {!msg.pnl ? (
            <span className="text-gray-300">-</span>
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
