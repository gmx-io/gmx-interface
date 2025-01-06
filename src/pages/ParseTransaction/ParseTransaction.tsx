import * as ethers from "ethers";
import { useParams } from "react-router-dom";
import Errors from "sdk/abis/CustomErrors.json";
import EventEmitter from "sdk/abis/EventEmitter.json";
import useSWR from "swr";
import { Abi, Hash, isHash, parseEventLogs, ParseEventLogsReturnType, PublicClient } from "viem";
import { usePublicClient } from "wagmi";

import Loader from "components/Common/Loader";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { Table, TableTd, TableTr } from "components/Table/Table";
import { TokenSymbolWithIcon } from "components/TokenSymbolWithIcon/TokenSymbolWithIcon";
import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "config/chains";
import {
  getGlvDisplayName,
  getMarketFullName,
  useMarketsInfoRequest,
  useMarketTokensDataRequest,
} from "domain/synthetics/markets";
import { useGlvMarketsInfo } from "domain/synthetics/markets/useGlvMarkets";
import { getOrderTypeLabel } from "domain/synthetics/orders";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { expandDecimals, formatUsd } from "lib/numbers";
import { BiCopy } from "react-icons/bi";
import { useCopyToClipboard } from "react-use";
import { Fragment } from "react/jsx-runtime";
import { LogEntry, LogEntryComponentProps } from "./types";
import {
  formatAmountByCollateralToken,
  formatAmountByEvent,
  formatAmountByField,
  formatAmountByNativeToken,
  formatByMarketLongOrShortToken,
  formatDateField,
  formatPriceByCollateralToken,
  formatPriceByIndexToken,
  formatPriceByToken,
} from "./formatting";

const PANIC_SIGNATURE4 = ethers.id("Panic(uint256)").slice(0, 10);
const PANIC_MAP = {
  0x00: "generic compiler inserted panics",
  0x01: "call assert with an argument that evaluates to false",
  0x11: "arithmetic operation results in underflow or overflow outside of an unchecked { ... } block.",
  0x12: "divide or modulo operation by zero (e.g. 5 / 0 or 23 % 0)",
  0x21: "convert a value that is too big or negative into an enum type",
  0x22: "access a storage byte array that is incorrectly encoded",
  0x31: "call .pop() on an empty array.",
  0x32: "access an array, bytesN or an array slice at an out-of-bounds or negative index",
  0x41: "allocate too much memory or create an array that is too large",
  0x51: "call a zero-initialized variable of internal function type.",
};

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

const EXPLORER_URLS = {
  [ARBITRUM]: "https://arbiscan.io/tx/",
  [AVALANCHE]: "https://snowtrace.io/tx/",
  [AVALANCHE_FUJI]: "https://testnet.snowtrace.io/tx/",
};

const errorsInterface = new ethers.Interface(Errors.abi);
const eventEmitterInterface = new ethers.Interface(EventEmitter.abi);
const defaultAbiCoder = new ethers.AbiCoder();

function getErrorString(error: { name: string; args: any[] }) {
  return JSON.stringify({
    name: error.name,
    args: error.args.map((value) => value.toString()),
  });
}

function parseError(reasonBytes, shouldThrow = true) {
  if (reasonBytes.startsWith(PANIC_SIGNATURE4)) {
    const [panicCode] = defaultAbiCoder.decode(["uint256"], "0x" + reasonBytes.slice(10));
    return {
      name: "Panic",
      args: [panicCode.toString(), PANIC_MAP[panicCode.toString()]],
    } as any;
  }

  try {
    const reason = errorsInterface.parseError(reasonBytes);
    return reason;
  } catch (e) {
    if (!shouldThrow) {
      return;
    }
    throw new Error(`Could not parse errorBytes ${reasonBytes}`);
  }
}

export function convertToContractPrice(price: bigint, tokenDecimals: number) {
  return price / expandDecimals(1, tokenDecimals);
}

export function convertFromContractPrice(price: bigint, tokenDecimals: number) {
  return price * expandDecimals(1, tokenDecimals);
}

function parseEvent(event: ParseEventLogsReturnType<Abi, undefined, true, undefined>[number]) {
  const values: LogEntry[] = [];
  const parsedLog = eventEmitterInterface.parseLog(event);

  if (!parsedLog) {
    return {
      key: `${event.logIndex}${event.transactionHash}`,
      topics: event.topics,
      name: event.eventName,
      values: [],
    };
  }

  const eventName = parsedLog.args[1];
  const eventData = parsedLog.args[parsedLog.args.length - 1];

  for (const type of ["address", "uint", "int", "bool", "bytes32", "bytes", "string"]) {
    const key = `${type}Items`;
    for (const item of eventData[key].items) {
      const value: LogEntry = {
        item: item.key,
        value: type === "bytes32" ? item.value.toString() : item.value,
        type,
      };

      if (item.key === "reasonBytes") {
        const error = parseError(item.value, false);
        const parsedReason = error ? getErrorString(error) : undefined;
        value.error = parsedReason;
      }

      values.push(value);
    }

    for (const item of eventData[key].arrayItems) {
      for (const arrayItem of item.value) {
        const value = {
          item: arrayItem.key,
          value: arrayItem.value,
          type,
        };

        values.push(value);
      }
    }
  }
  return {
    key: `${event.logIndex}${event.transactionHash}`,
    log: event.eventName,
    topics: event.topics,
    name: eventName,
    values,
  };
}

async function parseTxEvents(client: PublicClient, txHash: Hash) {
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (!receipt) throw new Error("Transaction not found");

  const parsed = parseEventLogs({
    abi: EventEmitter.abi as Abi,
    logs: receipt.logs,
  });

  return parsed.map(parseEvent);
}

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
        Transaction: <ExternalLink href={EXPLORER_URLS[chainId] + tx}>{tx}</ExternalLink>
      </h1>
      <Table className="mb-12">
        <tbody>
          {data.map((event) => {
            return (
              <Fragment key={event.key}>
                <TableTr>
                  <TableTd className="w-[25rem] font-bold">Name</TableTd>
                  <TableTd className="group !text-left" colSpan={2}>
                    <div className="flex flex-row items-center gap-8">
                      {event.log}: {event.name}
                      <BiCopy
                        size={16}
                        className="hidden cursor-pointer text-slate-100 hover:text-white  group-hover:block"
                        onClick={() => copyToClipboard(event.name)}
                      />
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
                            <BiCopy
                              size={16}
                              className="hidden cursor-pointer text-slate-100 hover:text-white  group-hover:block"
                              onClick={() => copyToClipboard(t)}
                            />
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
                  />
                ))}
                <TableTr>
                  <TableTd padding="compact" className="bg-slate-950" colSpan={3}></TableTd>
                </TableTr>
              </Fragment>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}

const fieldRelations = {
  minPrice: formatPriceByToken,
  maxPrice: formatPriceByToken,
  tokenPrice: formatPriceByToken,
  "collateralTokenPrice.min": formatPriceByCollateralToken,
  "collateralTokenPrice.max": formatPriceByCollateralToken,
  "indexTokenPrice.max": formatPriceByIndexToken,
  "indexTokenPrice.min": formatPriceByIndexToken,

  collateralAmount: formatAmountByCollateralToken,

  timestamp: formatDateField,
  increasedAtTime: formatDateField,
  decreasedAtTime: formatDateField,
  updatedAtTime: formatDateField,

  collateralDeltaAmount: formatAmountByCollateralToken,
  minGlvTokens: formatAmountByField("glv"),
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
  }),

  refundFeeAmount: formatAmountByNativeToken,
  executionFeeAmount: formatAmountByNativeToken,
};

function LogEntryComponent(props: LogEntryComponentProps) {
  let value;

  if (props.type === "address" && typeof props.value === "string") {
    const token = props.tokensData[props.value];
    const market = props.marketsInfoData[props.value];

    if (token) {
      value = (
        <>
          <TokenSymbolWithIcon symbol={token.symbol} /> ({props.value})
        </>
      );
    } else if (market) {
      value = (
        <>
          {getMarketFullName(market)} ({props.value})
        </>
      );
    } else {
      value = props.value;
    }
  }

  if (props.item === "trader" || props.item === "account" || props.item === "receiver") {
    const network = NETWORKS_BY_CHAIN_IDS[props.chainId];
    value = (
      <ExternalLink href={`/accounts/${props.value.toString()}?network=${network}&v=2`}>
        {props.value.toString()}
      </ExternalLink>
    );
  }

  if (props.item === "glv" && typeof props.value === "string") {
    const glv = props.glvData[props.value];

    if (glv) {
      value = (
        <>
          {getGlvDisplayName(glv)} ({props.value})
        </>
      );
    }
  }

  const field = fieldRelations[props.item];

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
    value = props.value;
  }

  if (props.error) {
    return (
      <TableTr>
        <TableTd className="font-bold">{props.item}</TableTd>
        <TableTd className="!text-center text-red-400" colSpan={3}>
          {props.error}
        </TableTd>
      </TableTr>
    );
  }

  return (
    <TableTr className="group">
      <TableTd className="font-bold">{props.item}</TableTd>
      <TableTd className="!text-left">
        <div className="flex flex-row items-center gap-8">
          {value}

          <BiCopy
            size={16}
            className="hidden cursor-pointer text-slate-100 hover:text-white  group-hover:block"
            onClick={() => props.copyToClipboard(props.value.toString())}
          />
        </div>
      </TableTd>
      <TableTd>{props.type}</TableTd>
    </TableTr>
  );
}
