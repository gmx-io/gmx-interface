import cx from "classnames";
import invert from "lodash/invert";
import mapValues from "lodash/mapValues";
import { useCallback, useMemo, useState } from "react";
import { Fragment } from "react/jsx-runtime";
import { Link, useParams } from "react-router-dom";
import { useCopyToClipboard } from "react-use";
import useSWR from "swr";
import { Hash, PublicClient, isHash } from "viem";
import { usePublicClient } from "wagmi";

import { ARBITRUM, CHAIN_SLUGS_MAP, ContractsChainId, getExplorerUrl } from "config/chains";
import { getIcon } from "config/icons";
import {
  getGlvDisplayName,
  getMarketFullName,
  useMarketTokensDataRequest,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import { getOrderTypeLabel } from "domain/synthetics/orders";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { CHAIN_ID_TO_TX_URL_BUILDER } from "lib/chains/blockExplorers";
import { formatFactor, formatUsd } from "lib/numbers";
import { parseTxEvents } from "pages/ParseTransaction/parseTxEvents";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Loader from "components/Loader/Loader";
import { Table, TableTd, TableTr } from "components/Table/Table";
import { TokenSymbolWithIcon } from "components/TokenSymbolWithIcon/TokenSymbolWithIcon";

import CopyIcon from "img/ic_copy.svg?react";

import {
  formatAmountByCollateralToken,
  formatAmountByCollateralToken15Shift,
  formatAmountByCollateralTokenInFeesEvent,
  formatAmountByEvent,
  formatAmountByField,
  formatAmountByIndexToken,
  formatAmountByLongToken15Shift,
  formatAmountByMarketToken,
  formatAmountByMarketTokenInDeposit,
  formatAmountByNativeToken,
  formatAmountByShortToken15Shift,
  formatByMarketLongToken,
  formatByMarketShortToken,
  formatDateField,
  formatPrice,
  formatPriceByCollateralToken,
  formatPriceByField,
  formatPriceByIndexToken,
  formatPriceByToken,
  formatRoleKey,
  formatSwapPath,
} from "./formatting";
import { LogEntryComponentProps } from "./types";
import { useRelatedTradeHistory } from "./useRelatedTradeHistory";

const NETWORKS = mapValues(invert(CHAIN_SLUGS_MAP), Number) as Record<string, ContractsChainId>;

export function ParseTransactionPage() {
  const { tx, network } = useParams<{ tx: string; network: string }>();
  const [, copyToClipboard] = useCopyToClipboard();

  /** Default is Arbitrum to prevent page crashes in hooks, wrong networks handled on :207 */
  const chainId = NETWORKS[network as string] ?? ARBITRUM;

  const client = usePublicClient({
    chainId,
  });

  const txHash = typeof tx === "string" && isHash(tx) ? (tx as Hash) : undefined;

  const {
    data,
    isLoading: isPrimaryTxLoading,
    error,
  } = useSWR(
    txHash ? [chainId, "transaction", txHash] as const : null,
    async ([, , hash]) => {
      try {
        return await parseTxEvents(client as PublicClient, hash as Hash);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      }
    }
  );

  const {
    primaryAction,
    executedAction,
    isLoading: isTradeHistoryLoading,
    error: tradeHistoryError,
  } = useRelatedTradeHistory(chainId, txHash);

  const relatedExecutionTxHash =
    executedAction && txHash && executedAction.transactionHash !== txHash ? executedAction.transactionHash : undefined;

  const {
    data: executedEvents,
    isLoading: isExecutedEventsLoading,
    error: executedEventsError,
  } = useSWR(
    relatedExecutionTxHash ? [chainId, "relatedExecution", relatedExecutionTxHash] : null,
    async ([, , hash]) => {
      try {
        return await parseTxEvents(client as PublicClient, hash as Hash);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      }
    }
  );

  const isDeposit = data ? data.some((event) => event.name.toLowerCase().includes("deposit")) : false;

  const { tokensData } = useTokensDataRequest(chainId, undefined);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const { glvData } = useGlvMarketsInfo(true, {
    marketsInfoData,
    tokensData,
    chainId,
    account: undefined,
  });
  const { marketTokensData } = useMarketTokensDataRequest(chainId, undefined, {
    isDeposit,
    withGlv: true,
    glvData,
  });

  const renderEvents = useCallback(
    (events: Awaited<ReturnType<typeof parseTxEvents>> | undefined, keyPrefix: string) => {
      if (!events?.length) {
        return (
          <TableTr key={`empty-${keyPrefix}`}>
            <TableTd className="!text-center font-medium" colSpan={3}>
              No events
            </TableTd>
          </TableTr>
        );
      }

      return events.map((event) => (
        <Fragment key={`${keyPrefix}-${event.key}`}>
          <TableTr>
            <TableTd className="w-[25rem] font-medium">Name</TableTd>
            <TableTd className="group !text-left" colSpan={2}>
              <div className="flex flex-row items-center justify-between gap-8">
                <span className="flex flex-row items-center gap-8 whitespace-nowrap">
                  {event.log}: {event.name}
                  <CopyButton value={event.name} />
                </span>
                <span>LogIndex: {event.logIndex}</span>
              </div>
            </TableTd>
          </TableTr>
          <TableTr>
            <TableTd className="w-[25rem] font-medium">Topics</TableTd>
            <TableTd className="group !text-left" colSpan={3}>
              {event.topics.length > 0
                ? event.topics.map((t) => (
                    <div className="mb-4 flex flex-row items-center gap-8" key={`${keyPrefix}-${event.name}-${t}`}>
                      {t}
                      <CopyButton value={t} />
                    </div>
                  ))
                : "No topics"}
            </TableTd>
          </TableTr>
          {event.values.map((value) => (
            <LogEntryComponent
              name={event.name}
              key={`${keyPrefix}-${event.key}-${value.item}`}
              {...value}
              network={network}
              chainId={chainId}
              entries={event.values}
              tokensData={tokensData}
              marketsInfoData={marketsInfoData}
              glvData={glvData}
              marketTokensData={marketTokensData}
              copyToClipboard={copyToClipboard}
              allEvents={events}
            />
          ))}
          <TableTr>
            <TableTd padding="compact" className="bg-slate-900" colSpan={3}></TableTd>
          </TableTr>
        </Fragment>
      ));
    },
    [chainId, copyToClipboard, glvData, marketTokensData, marketsInfoData, network, tokensData]
  );

  if (!network || typeof network !== "string" || !NETWORKS[network as string]) {
    return (
      <div className="text-body-large m-auto pt-24 text-center text-red-400 xl:px-[10%]">
        Specify network: arbitrum, avalanche, fuji, botanix, arbitrum-sepolia
      </div>
    );
  }

  if (!txHash) {
    return <div className="text-body-large m-auto pt-24 text-center text-red-400 xl:px-[10%]">Invalid transaction</div>;
  }

  if (error) {
    return (
      <div className="text-body-large m-auto pt-24 text-center text-red-400 xl:px-[10%]">Error: {error.message}</div>
    );
  }

  if (isPrimaryTxLoading || !data) {
    return (
      <div className="mt-32">
        <Loader />
      </div>
    );
  }

  return (
    <AppPageLayout>
      <div className="mx-auto max-w-[1280px] pt-24">
        <h1 className="text-body-large mb-24">
          Transaction: <ExternalLink href={CHAIN_ID_TO_TX_URL_BUILDER[chainId](txHash)}>{txHash}</ExternalLink>
        </h1>
        <Table className="mb-12 ">
          <tbody>{renderEvents(data, "primary")}</tbody>
        </Table>
        {tradeHistoryError ? (
          <div className="text-body-medium text-red-400">
            Failed to load related trade data: {tradeHistoryError.message}
          </div>
        ) : null}
        {relatedExecutionTxHash ? (
          <div className="mt-32">
            <h2 className="text-body-large mb-12">
              Related execution:{" "}
              <ExternalLink href={CHAIN_ID_TO_TX_URL_BUILDER[chainId](relatedExecutionTxHash)}>
                {relatedExecutionTxHash}
              </ExternalLink>
            </h2>
            <div className="text-body-medium mb-16">
              Order key: {executedAction?.orderKey ?? primaryAction?.orderKey ?? "n/a"}
            </div>
            {isExecutedEventsLoading || isTradeHistoryLoading ? (
              <Loader />
            ) : executedEventsError ? (
              <div className="text-body-medium text-red-400">
                Failed to parse related transaction: {executedEventsError.message}
              </div>
            ) : executedEvents ? (
              <Table className="mb-12 ">
                <tbody>{renderEvents(executedEvents, "executed")}</tbody>
              </Table>
            ) : null}
          </div>
        ) : null}
      </div>
    </AppPageLayout>
  );
}

const fieldFormatters = {
  minPrice: formatPriceByToken,
  maxPrice: formatPriceByToken,
  tokenPrice: formatPriceByToken,

  swapPath: formatSwapPath,
  longTokenSwapPath: formatSwapPath,
  shortTokenSwapPath: formatSwapPath,

  "indexTokenPrice.max": formatPriceByIndexToken,
  "indexTokenPrice.min": formatPriceByIndexToken,
  sizeInTokens: formatAmountByIndexToken,
  sizeDeltaInTokens: formatAmountByIndexToken,
  priceImpactAmount: formatAmountByIndexToken,
  impactPoolAmount: formatAmountByIndexToken,

  "collateralTokenPrice.min": formatPriceByCollateralToken,
  "collateralTokenPrice.max": formatPriceByCollateralToken,
  collateralAmount: formatAmountByCollateralToken,
  borrowingFeeAmount: formatAmountByCollateralToken,
  borrowingFeeAmountForFeeReceiver: formatAmountByCollateralToken,
  protocolFeeAmount: formatAmountByCollateralToken,
  totalBorrowingFees: formatAmountByCollateralToken,

  "referral.totalRebateAmount": formatAmountByCollateralToken,
  "referral.traderDiscountAmount": formatAmountByCollateralToken,
  "referral.affiliateRewardAmount": formatAmountByCollateralToken,

  executionPrice: formatPriceByIndexToken,
  triggerPrice: formatPriceByIndexToken,
  acceptablePrice: formatPriceByIndexToken,

  initialCollateralDeltaAmount: formatAmountByField("initialCollateralToken"),

  feeAmountForPool: formatAmountByEvent({
    SwapFeesCollected: "token",
    default: formatAmountByCollateralToken,
  }),
  positionFeeAmountForPool: formatAmountByCollateralToken,
  positionFeeAmount: formatAmountByCollateralToken,
  totalCostAmount: formatAmountByCollateralToken,
  uiFeeAmount: formatAmountByEvent({
    SwapFeesCollected: "token",
    default: formatAmountByCollateralToken,
  }),
  collateralDeltaAmount: formatAmountByCollateralToken,
  fundingFeeAmount: formatAmountByCollateralToken,
  feeReceiverAmount: formatAmountByEvent({
    SwapFeesCollected: "token",
    default: formatAmountByCollateralToken,
  }),
  liquidationFeeAmount: formatAmountByCollateralToken,
  liquidationFeeAmountForFeeReceiver: formatAmountByCollateralToken,

  tokenInPrice: formatPriceByField("tokenIn"),
  tokenOutPrice: formatPriceByField("tokenOut"),
  amountIn: formatAmountByField("tokenIn"),
  amountInAfterFees: formatAmountByField("tokenIn"),
  amountOut: formatAmountByField("tokenOut"),
  amountAfterFees: formatAmountByField("token"),

  timestamp: formatDateField,
  increasedAtTime: formatDateField,
  decreasedAtTime: formatDateField,
  updatedAtTime: formatDateField,

  minGlvTokens: formatAmountByMarketToken,
  initialShortTokenAmount: formatAmountByField("initialShortToken"),
  initialLongTokenAmount: formatAmountByField("initialLongToken"),

  claimableLongTokenAmount: formatByMarketLongToken,
  claimableShortTokenAmount: formatByMarketShortToken,

  longTokenAmount: formatByMarketLongToken,
  shortTokenAmount: formatByMarketShortToken,

  orderType: (t: bigint) => getOrderTypeLabel(Number(t)),
  roleKey: formatRoleKey,

  fundingFeeAmountPerSize: formatAmountByCollateralToken15Shift,
  latestFundingFeeAmountPerSize: formatAmountByCollateralToken15Shift,

  longTokenClaimableFundingAmountPerSize: formatAmountByLongToken15Shift,
  shortTokenClaimableFundingAmountPerSize: formatAmountByShortToken15Shift,
  latestLongTokenClaimableFundingAmountPerSize: formatAmountByLongToken15Shift,
  latestShortTokenClaimableFundingAmountPerSize: formatAmountByShortToken15Shift,

  poolValue: formatPrice,
  longPnl: formatPrice,
  shortPnl: formatPrice,
  netPnl: formatPrice,

  refundFeeAmount: formatAmountByNativeToken,
  executionFeeAmount: formatAmountByNativeToken,
  executionFee: formatAmountByNativeToken,

  minLongTokenAmount: formatByMarketLongToken,
  minShortTokenAmount: formatByMarketShortToken,

  minMarketTokens: formatAmountByMarketToken,
  marketTokensSupply: formatAmountByMarketToken,
  marketTokenAmount: formatAmountByMarketToken,
  positionCollateralAmount: formatAmountByCollateralTokenInFeesEvent,

  receivedMarketTokens: formatAmountByMarketTokenInDeposit,

  nextValue: formatAmountByEvent({
    CollateralSumUpdated: "collateralToken",
    CumulativeBorrowingFactorUpdated: formatFactor,
    OpenInterestUpdated: formatPrice,
    ClaimableFundingUpdated: "token",
    PoolAmountUpdated: "token",
    ClaimableFeeAmountUpdated: "token",
    OpenInterestInTokensUpdated: formatAmountByIndexToken,
    PositionImpactPoolAmountUpdated: formatAmountByIndexToken,
  }),

  delta: formatAmountByEvent({
    CollateralSumUpdated: "collateralToken",
    CumulativeBorrowingFactorUpdated: formatFactor,
    OpenInterestUpdated: formatPrice,
    PoolAmountUpdated: "token",
    ClaimableFundingUpdated: "token",
    ClaimableFeeAmountUpdated: "token",
    OpenInterestInTokensUpdated: formatAmountByIndexToken,
    FundingFeeAmountPerSizeUpdated: formatAmountByCollateralToken15Shift,
    ClaimableFundingAmountPerSizeUpdated: formatAmountByCollateralToken15Shift,
    PositionImpactPoolAmountUpdated: formatAmountByIndexToken,
  }),

  value: formatAmountByEvent({
    FundingFeeAmountPerSizeUpdated: formatAmountByCollateralToken15Shift,
    ClaimableFundingAmountPerSizeUpdated: formatAmountByCollateralToken15Shift,
  }),
};

function LogEntryComponent(props: LogEntryComponentProps) {
  let value;
  let withError = false;

  const explorerIconSrc = useMemo(() => getIcon(props.chainId, "network"), [props.chainId]);
  const explorerUrl = useMemo(() => getExplorerUrl(props.chainId), [props.chainId]);

  if (props.type === "address" && typeof props.value === "string") {
    if (props.item === "affiliate" || props.item === "callbackContract" || props.item === "uiFeeReceiver") {
      value = props.value;
    } else {
      const token = props.tokensData?.[props.value];
      const marketOrGlv = props.marketsInfoData?.[props.value] || props.glvData?.[props.value];

      if (token) {
        value = (
          <span className="flex flex-row items-center gap-8">
            <TokenSymbolWithIcon symbol={token.symbol} /> ({props.value})
            <ExternalLink
              className="text-typography-secondary underline"
              href={`${explorerUrl}address/${props.value.toString()}`}
            >
              <img src={explorerIconSrc} className="h-18 w-18" />
            </ExternalLink>
          </span>
        );
      } else if (marketOrGlv) {
        value = (
          <span className="flex flex-row items-center gap-8">
            {isGlvInfo(marketOrGlv) ? getGlvDisplayName(marketOrGlv) : getMarketFullName(marketOrGlv)} ({props.value})
            <ExternalLink
              className="text-typography-secondary underline"
              href={`${explorerUrl}address/${props.value.toString()}`}
            >
              <img src={explorerIconSrc} className="h-18 w-18" />
            </ExternalLink>
          </span>
        );
      } else {
        value = props.value;
      }
    }
  }

  if (props.item === "trader" || props.item === "account" || props.item === "receiver") {
    const network = CHAIN_SLUGS_MAP[props.chainId];
    const explorerUrl = getExplorerUrl(props.chainId);

    value = (
      <span className="flex flex-row items-center gap-8">
        <Link
          className="text-typography-secondary underline"
          to={`/accounts/${props.value.toString()}?network=${network}&v=2`}
        >
          {props.value.toString()}
        </Link>
        <ExternalLink
          className="text-typography-secondary underline"
          href={`${explorerUrl}address/${props.value.toString()}`}
        >
          <img src={explorerIconSrc} className="h-18 w-18" />
        </ExternalLink>
      </span>
    );
  }

  const field = fieldFormatters[props.item];

  if (typeof props.value === "bigint") {
    if (field) {
      try {
        value = field(props.value, props);
      } catch (e) {
        value = e.message;
        withError = true;
      }
    } else {
      value = props.value.toString() + "n";

      if (props.item.endsWith("Usd")) {
        value = formatUsd(props.value);
      } else if (props.item.endsWith("Factor")) {
        value = formatFactor(props.value);
      }
    }
  }

  if (props.type === "address" && field) {
    try {
      value = field(props.value, props);
    } catch (e) {
      value = e.message;
      withError = true;
    }
  }

  if (typeof props.value === "boolean") {
    value = props.value ? "true" : "false";
  }

  if (props.type === "bytes32") {
    value = props.value.toString();

    if (field) {
      try {
        value = field(props.value, props);
      } catch (e) {
        value = e.message;
        withError = true;
      }
    }
  }

  if (props.error) {
    return (
      <TableTr>
        <TableTd className="font-medium">{props.item}</TableTd>
        <TableTd className="text-red-400">{props.error ?? props.value.toString()}</TableTd>
        <TableTd>{props.type}</TableTd>
      </TableTr>
    );
  }

  return (
    <TableTr className="group">
      <TableTd className="font-medium">{props.item}</TableTd>
      <TableTd
        className={cx("!text-left", {
          "text-red-400": withError,
        })}
      >
        <div className="flex flex-row items-center gap-8">
          {value ?? props.value ?? "Unknown value"}

          <CopyButton value={props.value?.toString()} />
        </div>
      </TableTd>
      <TableTd>{props.type}</TableTd>
    </TableTr>
  );
}

function CopyButton({ value }: { value: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  const onClick = useCallback(() => {
    copyToClipboard(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 100);
  }, [copyToClipboard, value]);

  return (
    <CopyIcon
      className={cx(
        "invisible size-16 cursor-pointer text-typography-secondary transition-transform hover:text-typography-primary group-hover:visible",
        {
          "scale-110 text-typography-primary": isCopied,
        }
      )}
      onClick={onClick}
    />
  );
}
