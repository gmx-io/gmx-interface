import cx from "classnames";
import { Link, useParams } from "react-router-dom";
import useSWR from "swr";
import { Hash, isHash, PublicClient } from "viem";
import { usePublicClient } from "wagmi";

import Loader from "components/Common/Loader";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { Table, TableTd, TableTr } from "components/Table/Table";
import { TokenSymbolWithIcon } from "components/TokenSymbolWithIcon/TokenSymbolWithIcon";
import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, getExplorerUrl } from "config/chains";
import {
  getGlvDisplayName,
  getMarketFullName,
  useMarketsInfoRequest,
  useMarketTokensDataRequest,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import { getOrderTypeLabel } from "domain/synthetics/orders";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { formatUsd } from "lib/numbers";
import { useCallback, useState } from "react";
import { BiCopy } from "react-icons/bi";
import { useCopyToClipboard } from "react-use";
import { Fragment } from "react/jsx-runtime";
import {
  formatAmount30Decimals,
  formatAmountByCollateralToken,
  formatAmountByCollateralToken15Shift,
  formatAmountByEvent,
  formatAmountByField,
  formatAmountByIndexToken,
  formatAmountByLongToken15Shift,
  formatAmountByMarketToken,
  formatAmountByMarketTokenInDeposit,
  formatAmountByNativeToken,
  formatAmountByShortToken15Shift,
  formatByMarketLongOrShortToken,
  formatDateField,
  formatPrice,
  formatPriceByCollateralToken,
  formatPriceByIndexToken,
  formatPriceByToken,
} from "./formatting";
import { parseTxEvents } from "./parseTxEvents";
import { LogEntryComponentProps } from "./types";

const NETWORKS = {
  arbitrum: ARBITRUM,
  avalanche: AVALANCHE,
  fuji: AVALANCHE_FUJI,
};

const NETWORKS_BY_CHAIN_IDS = {
  [ARBITRUM]: "arbitrum",
  [AVALANCHE]: "avalanche",
  [AVALANCHE_FUJI]: "fuji",
};

const EXPLORER_TX_URLS = {
  [ARBITRUM]: getExplorerUrl(ARBITRUM) + "/tx/",
  [AVALANCHE]: getExplorerUrl(AVALANCHE) + "/tx/",
  [AVALANCHE_FUJI]: getExplorerUrl(AVALANCHE_FUJI) + "/tx/",
};

export function ParseTransactionPage() {
  const { tx, network } = useParams<{ tx: string; network: string }>();
  const [, copyToClipboard] = useCopyToClipboard();

  /** Default is Arbitrum to prevent page crashes in hooks, wrong networks handled on :207 */
  const chainId = NETWORKS[network as string] ?? ARBITRUM;

  const client = usePublicClient({ chainId });

  const { data, isLoading, error } = useSWR([chainId, tx], async function fetchTransaction() {
    try {
      return await parseTxEvents(client as PublicClient, tx as Hash);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }
  });

  const isDeposit = data ? data.some((event) => event.name.toLowerCase().includes("deposit")) : false;

  const { tokensData } = useTokensDataRequest(chainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId);
  const { glvData } = useGlvMarketsInfo(true, {
    marketsInfoData,
    tokensData,
    chainId,
    account: undefined,
    filterIncorrectMarkets: false,
  });
  const { marketTokensData } = useMarketTokensDataRequest(chainId, {
    isDeposit,
    withGlv: true,
    glvData,
  });

  if (!network || typeof network !== "string" || !NETWORKS[network as string]) {
    return (
      <div className="text-body-large m-auto pt-24 text-center text-red-400 xl:px-[10%]">
        Specify network: arbitrum, avalanche, fuji
      </div>
    );
  }

  if (!tx || !isHash(tx)) {
    return (
      <div className="text-body-large m-auto pt-24  text-center text-red-400 xl:px-[10%]">Invalid transaction</div>
    );
  }

  if (error) {
    return (
      <div className="text-body-large m-auto pt-24 text-center text-red-400 xl:px-[10%]">Error: {error.message}</div>
    );
  }

  if (isLoading || !data || !tokensData || !marketsInfoData || !glvData || !marketTokensData) {
    return (
      <div className="mt-32">
        <Loader />
      </div>
    );
  }

  return (
    <div className="pt-24 xl:px-[10%]">
      <h1 className="text-body-large mb-24">
        Transaction: <ExternalLink href={EXPLORER_TX_URLS[chainId] + tx}>{tx}</ExternalLink>
      </h1>
      <Table className="mb-12">
        <tbody>
          {data.length ? (
            data.map((event) => {
              return (
                <Fragment key={event.key}>
                  <TableTr>
                    <TableTd className="w-[25rem] font-bold">Name</TableTd>
                    <TableTd className="group !text-left" colSpan={2}>
                      <div className="flex flex-row items-center gap-8">
                        {event.log}: {event.name}
                        <CopyButton value={event.name} />
                      </div>
                    </TableTd>
                  </TableTr>
                  <TableTr>
                    <TableTd className="w-[25rem] font-bold">Topics</TableTd>
                    <TableTd className="group !text-left" colSpan={3}>
                      {event.topics.length > 0
                        ? event.topics.map((t) => (
                            <div className="mb-4 flex flex-row items-center gap-8" key={event.name + t}>
                              {t}
                              <CopyButton value={t} />
                            </div>
                          ))
                        : "No topics"}
                    </TableTd>
                  </TableTr>
                  <TableTr>
                    <TableTd className="!text-center font-bold" colSpan={3}>
                      Values
                    </TableTd>
                  </TableTr>
                  {event.values.map((value) => (
                    <LogEntryComponent
                      name={event.name}
                      key={value.item}
                      {...value}
                      network={network}
                      chainId={chainId}
                      entries={event.values}
                      tokensData={tokensData}
                      marketsInfoData={marketsInfoData}
                      glvData={glvData}
                      marketTokensData={marketTokensData}
                      copyToClipboard={copyToClipboard}
                      allEvents={data}
                    />
                  ))}
                  <TableTr>
                    <TableTd padding="compact" className="bg-slate-950" colSpan={3}></TableTd>
                  </TableTr>
                </Fragment>
              );
            })
          ) : (
            <TableTr>
              <TableTd className="!text-center font-bold" colSpan={3}>
                No events
              </TableTd>
            </TableTr>
          )}
        </tbody>
      </Table>
    </div>
  );
}

const fieldFormatters = {
  minPrice: formatPriceByToken,
  maxPrice: formatPriceByToken,
  tokenPrice: formatPriceByToken,

  "collateralTokenPrice.min": formatPriceByCollateralToken,
  "collateralTokenPrice.max": formatPriceByCollateralToken,
  "indexTokenPrice.max": formatPriceByIndexToken,
  "indexTokenPrice.min": formatPriceByIndexToken,

  collateralAmount: formatAmountByCollateralToken,

  sizeInTokens: formatAmountByIndexToken,
  sizeDeltaInTokens: formatAmountByIndexToken,
  priceImpactAmount: formatAmountByIndexToken,
  impactPoolAmount: formatAmountByIndexToken,

  borrowingFactor: formatAmount30Decimals,
  borrowingFeeReceiverFactor: formatAmount30Decimals,
  positionFeeFactor: formatAmount30Decimals,
  positionFeeReceiverFactor: formatAmount30Decimals,
  uiFeeReceiverFactor: formatAmount30Decimals,
  totalRebateFactor: formatAmount30Decimals,
  traderDiscountFactor: formatAmount30Decimals,
  borrowingFeePoolFactor: formatAmount30Decimals,

  timestamp: formatDateField,
  increasedAtTime: formatDateField,
  decreasedAtTime: formatDateField,
  updatedAtTime: formatDateField,

  collateralDeltaAmount: formatAmountByCollateralToken,
  minGlvTokens: formatAmountByMarketToken,
  initialShortTokenAmount: formatAmountByField("initialShortToken"),
  initialLongTokenAmount: formatAmountByField("initialLongToken"),

  claimableLongTokenAmount: formatByMarketLongOrShortToken(true),
  claimableShortTokenAmount: formatByMarketLongOrShortToken(false),

  longTokenAmount: formatByMarketLongOrShortToken(true),
  shortTokenAmount: formatByMarketLongOrShortToken(false),

  fundingFeeAmount: formatAmountByCollateralToken,
  feeReceiverAmount: formatAmountByCollateralToken,

  orderType: (t: bigint) => getOrderTypeLabel(Number(t)),

  nextValue: formatAmountByEvent({
    CollateralSumUpdated: "collateralToken",
    CumulativeBorrowingFactorUpdated: formatAmount30Decimals,
  }),

  fundingFeeAmountPerSize: formatAmountByCollateralToken15Shift,
  latestFundingFeeAmountPerSize: formatAmountByCollateralToken15Shift,

  longTokenClaimableFundingAmountPerSize: formatAmountByLongToken15Shift,
  shortTokenClaimableFundingAmountPerSize: formatAmountByShortToken15Shift,
  latestLongTokenClaimableFundingAmountPerSize: formatAmountByLongToken15Shift,
  latestShortTokenClaimableFundingAmountPerSize: formatAmountByShortToken15Shift,

  delta: formatAmountByEvent({
    CollateralSumUpdated: "collateralToken",
    CumulativeBorrowingFactorUpdated: formatAmount30Decimals,
    OpenInterestUpdated: formatPrice,
    FundingFeeAmountPerSizeUpdated: formatAmountByCollateralToken15Shift,
    ClaimableFundingAmountPerSizeUpdated: formatAmountByCollateralToken15Shift,
  }),

  value: formatAmountByEvent({
    FundingFeeAmountPerSizeUpdated: formatAmountByCollateralToken15Shift,
    ClaimableFundingAmountPerSizeUpdated: formatAmountByCollateralToken15Shift,
  }),

  refundFeeAmount: formatAmountByNativeToken,
  executionFeeAmount: formatAmountByNativeToken,
  executionFee: formatAmountByNativeToken,

  minLongTokenAmount: formatByMarketLongOrShortToken(true),
  minShortTokenAmount: formatByMarketLongOrShortToken(false),

  minMarketTokens: formatAmountByMarketToken,
  marketTokensSupply: formatAmountByMarketToken,
  marketTokenAmount: formatAmountByMarketToken,

  receivedMarketTokens: formatAmountByMarketTokenInDeposit,
};

function LogEntryComponent(props: LogEntryComponentProps) {
  let value;

  if (props.type === "address" && typeof props.value === "string") {
    if (props.item === "affiliate" || props.item === "callbackContract") {
      value = props.value;
    } else {
      const token = props.tokensData[props.value];
      const marketOrGlv = props.marketsInfoData[props.value] || props.glvData[props.value];

      if (token) {
        value = (
          <>
            <TokenSymbolWithIcon symbol={token.symbol} /> ({props.value})
          </>
        );
      } else if (marketOrGlv) {
        value = (
          <>
            {isGlvInfo(marketOrGlv) ? getGlvDisplayName(marketOrGlv) : getMarketFullName(marketOrGlv)} ({props.value})
          </>
        );
      } else {
        value = props.value;
      }
    }
  }

  if (props.item === "trader" || props.item === "account" || props.item === "receiver") {
    const network = NETWORKS_BY_CHAIN_IDS[props.chainId];
    value = (
      <Link className="text-slate-100 underline" to={`/accounts/${props.value.toString()}?network=${network}&v=2`}>
        {props.value.toString()}
      </Link>
    );
  }

  const field = fieldFormatters[props.item];

  if (typeof props.value === "bigint") {
    if (field) {
      value = field(props.value, props);
    } else {
      value = props.value.toString() + "n";

      if (props.item.endsWith("Usd")) {
        value = formatUsd(props.value);
      }
    }
  }

  if (typeof props.value === "boolean") {
    value = props.value ? "true" : "false";
  }

  if (props.type === "bytes32") {
    value = props.value.toString();
  }

  if (props.error) {
    return (
      <TableTr>
        <TableTd className="font-bold">{props.item}</TableTd>
        <TableTd className="text-red-400">{props.error ?? props.value.toString()}</TableTd>
        <TableTd>{props.type}</TableTd>
      </TableTr>
    );
  }

  return (
    <TableTr className="group">
      <TableTd className="font-bold">{props.item}</TableTd>
      <TableTd className="!text-left">
        <div className="flex flex-row items-center gap-8">
          {value ?? props.value}

          <CopyButton value={props.value.toString()} />
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
    <BiCopy
      size={16}
      className={cx("hidden cursor-pointer text-slate-100 transition-transform hover:text-white group-hover:block", {
        "scale-110 text-white": isCopied,
      })}
      onClick={onClick}
    />
  );
}
