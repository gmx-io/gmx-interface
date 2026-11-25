import {
  BaseError,
  concat,
  ContractFunctionRevertedError,
  createPublicClient,
  custom,
  http,
  keccak256,
  numberToHex,
  pad,
  PublicClient,
} from "viem";

import { buildMarketTokensDataRequest, parseMarketTokenData } from "domain/synthetics/markets/marketTokensDataRequest";
import { abis } from "sdk/abis";
import { getAbi } from "sdk/abis/getAbi";
import { GmxSdk } from "sdk/clients/v1";
import { MAX_TIMEOUT, Multicall } from "sdk/clients/v1/multicall";
import { arbitrumSdkConfig } from "sdk/clients/v1/testUtil";
import { ARBITRUM, getViemChain } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import type { MarketInfo, MarketsInfoData } from "sdk/utils/markets/types";
import { getContractMarketPrices } from "sdk/utils/markets/utils";
import { expandDecimals } from "sdk/utils/numbers";
import type { TokenData, TokensData } from "sdk/utils/tokens/types";

// eslint-disable-next-line no-restricted-globals -- test-only helper, never bundled into the client
const { PARITY_RPC_URL = "", PARITY_BLOCK } = process.env;

if (!PARITY_RPC_URL) {
  throw new Error("PARITY_RPC_URL is required: an Alchemy Arbitrum RPC URL");
}

export const chainId = ARBITRUM;
export const dataStoreAddress = getContract(chainId, "DataStore");
const readerAddress = getContract(chainId, "SyntheticsReader");
const readerAbi = [...getAbi(chainId, "SyntheticsReader"), ...abis.CustomErrors];

export type DataStoreOverrides = { uint: [key: string, value: bigint][] };

/** The overrides can load on demand, from the live state, when the context for the scenario is made */
export type Scenario = { name: string; overrides: DataStoreOverrides | (() => Promise<DataStoreOverrides>) };

export type ParityContext = {
  /** LIVE_STATE or the scenario name */
  state: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  client: PublicClient;
  sdk: GmxSdk;
  marketsInfoData: MarketsInfoData;
  tokensData: TokensData;
};

export const LIVE_STATE = "live state";

/** The storage slot of mapping[key] for a Solidity mapping at mappingSlot */
export const getMappingEntrySlot = (key: string, mappingSlot: bigint | string) =>
  keccak256(concat([pad(key), typeof mappingSlot === "bigint" ? numberToHex(mappingSlot, { size: 32 }) : mappingSlot]));

// DataStore keeps uintValues in the mapping at slot 0
function getDataStoreStateOverride({ uint }: DataStoreOverrides) {
  const stateDiff = Object.fromEntries(
    uint.map(([key, value]) => [getMappingEntrySlot(key, 0n), numberToHex(value, { size: 32 })])
  );

  return { [dataStoreAddress]: { stateDiff } };
}

const RPC_ERROR_RETRIES = 3;

// Public RPC nodes sometimes fail a call on a past block while they move its state ("layer stale"), or stop a call
// after 5 seconds when they are busy ("execution aborted"); a retry on another node passes
const isRetryableRpcError = (error: unknown) =>
  error instanceof BaseError && /layer stale|execution aborted/.test(error.details);

// Every eth_call goes to one block, so the SDK's market reads and the Reader quotes see the same state
function createPinnedClient(blockNumber: bigint, overrides: DataStoreOverrides | undefined): PublicClient {
  const upstream = createPublicClient({
    chain: getViemChain(chainId),
    transport: http(PARITY_RPC_URL, { retryCount: 5, retryDelay: 1000, timeout: 60_000 }),
  });
  const blockTag = numberToHex(blockNumber);
  const stateOverride = overrides && getDataStoreStateOverride(overrides);
  const toCallParams = (params: unknown[]) =>
    stateOverride ? [params[0], blockTag, stateOverride] : [params[0], blockTag, ...params.slice(2)];

  async function request(args: { method: string; params: unknown[] }, retries = RPC_ERROR_RETRIES) {
    try {
      return await upstream.request(args as never);
    } catch (error) {
      if (retries === 0 || !isRetryableRpcError(error)) {
        throw error;
      }

      return request(args, retries - 1);
    }
  }

  return createPublicClient({
    chain: getViemChain(chainId),
    batch: { multicall: { batchSize: 16 * 1024, wait: 16 } },
    transport: custom({
      request: ({ method, params }) => {
        const args = method === "eth_call" ? { method, params: toCallParams(params) } : { method, params };

        return request(args);
      },
    }),
  }) as PublicClient;
}

let blockNumberRequest: Promise<bigint> | undefined;

function loadBlockNumber() {
  if (!blockNumberRequest) {
    const client = createPublicClient({ chain: getViemChain(chainId), transport: http(PARITY_RPC_URL) });

    blockNumberRequest = PARITY_BLOCK ? Promise.resolve(BigInt(PARITY_BLOCK)) : client.getBlockNumber();
  }

  return blockNumberRequest;
}

const contextsByScenario = new Map<string, Promise<ParityContext>>();

// One block for all contexts and one market load per scenario: vitest.parity.config.ts runs every file in one unisolated worker
export function loadParityContext(scenario?: Scenario): Promise<ParityContext> {
  const name = scenario?.name ?? LIVE_STATE;

  if (!contextsByScenario.has(name)) {
    contextsByScenario.set(name, createParityContext(scenario));
  }

  return contextsByScenario.get(name)!;
}

async function createParityContext(scenario: Scenario | undefined): Promise<ParityContext> {
  const blockNumber = await loadBlockNumber();
  const overrides = typeof scenario?.overrides === "function" ? await scenario.overrides() : scenario?.overrides;
  const client = createPinnedClient(blockNumber, overrides);
  const { timestamp: blockTimestamp } = await client.getBlock({ blockNumber });
  const sdk = new GmxSdk({ ...arbitrumSdkConfig, account: undefined, rpcUrl: PARITY_RPC_URL, publicClient: client });

  // The SDK keeps one Multicall per chain, made with the first GmxSdk, so its client would skip the scenario overrides
  sdk.executeMulticall = (request): Promise<any> => new Multicall(sdk).call(request, MAX_TIMEOUT);

  const { marketsInfoData, tokensData } = await sdk.markets.getMarketsInfo();

  if (!marketsInfoData || !tokensData) {
    throw new Error("Failed to load markets info");
  }

  return {
    state: scenario?.name ?? LIVE_STATE,
    blockNumber,
    blockTimestamp,
    client,
    sdk,
    marketsInfoData,
    tokensData,
  };
}

export function getMarketProps(market: MarketInfo) {
  return {
    marketToken: market.marketTokenAddress,
    indexToken: market.indexTokenAddress,
    longToken: market.longTokenAddress,
    shortToken: market.shortTokenAddress,
  };
}

export function readDataStoreUint(ctx: ParityContext, key: string) {
  return ctx.client.readContract({
    address: dataStoreAddress,
    abi: abis.DataStore,
    functionName: "getUint",
    args: [key],
  });
}

export function readReader<T>(ctx: ParityContext, functionName: string, args: readonly unknown[]): Promise<T> {
  return ctx.client.readContract({ address: readerAddress, abi: readerAbi, functionName, args } as never) as Promise<T>;
}

async function readMarketTokensData(ctx: ParityContext, isDeposit: boolean) {
  const marketsAddresses = Object.keys(ctx.marketsInfoData);
  const request = buildMarketTokensDataRequest(chainId, {
    marketsAddresses,
    marketsData: ctx.marketsInfoData,
    tokensData: ctx.tokensData,
    isDeposit,
    account: undefined,
  });
  const res = await ctx.sdk.executeMulticall(request);
  const entries = marketsAddresses.map((marketAddress): [string, TokenData | undefined] => [
    marketAddress,
    parseMarketTokenData(res, { chainId, srcChainId: undefined, account: undefined, marketAddress }),
  ]);

  return Object.fromEntries(entries);
}

const marketTokensRequests = new Map<string, ReturnType<typeof readMarketTokensData>>();

/** The GM token as useMarketTokensData({ isDeposit }) loads it, undefined where the app drops the market */
export async function loadMarketToken(ctx: ParityContext, market: MarketInfo, isDeposit: boolean) {
  const requestKey = `${ctx.state} ${isDeposit}`;

  if (!marketTokensRequests.has(requestKey)) {
    marketTokensRequests.set(requestKey, readMarketTokensData(ctx, isDeposit));
  }

  const marketTokens = await marketTokensRequests.get(requestKey)!;

  return marketTokens[market.marketTokenAddress];
}

export async function readExecutionPrice(
  ctx: ParityContext,
  market: MarketInfo,
  p: {
    positionSizeInUsd: bigint;
    positionSizeInTokens: bigint;
    sizeDeltaUsd: bigint;
    pendingImpactAmount: bigint;
    isLong: boolean;
  }
) {
  const prices = getContractMarketPrices(ctx.tokensData, market)!;
  const result = await readReader<{
    priceImpactUsd: bigint;
    executionPrice: bigint;
    balanceWasImproved: boolean;
    totalImpactUsd: bigint;
    priceImpactDiffUsd: bigint;
  }>(ctx, "getExecutionPrice", [
    dataStoreAddress,
    market.marketTokenAddress,
    prices,
    p.positionSizeInUsd,
    p.positionSizeInTokens,
    p.sizeDeltaUsd,
    p.pendingImpactAmount,
    p.isLong,
  ]);
  const pricePerTokenUnit = expandDecimals(1, market.indexToken.decimals);

  // the Reader gives the price per index token unit, the app per whole token
  return { ...result, executionPrice: result.executionPrice * pricePerTokenUnit };
}

/**
 * The contract caps a negative total impact and moves the rest to priceImpactDiffUsd, the app keeps the whole impact
 * in the total and shows the diff apart: the amount the trader gets is the same
 */
export const getUncappedTotalImpactUsd = (result: { totalImpactUsd: bigint; priceImpactDiffUsd: bigint }) =>
  result.totalImpactUsd - result.priceImpactDiffUsd;

// Only a decoded revert: viem also wraps node errors without revert data (-32603) as ContractFunctionRevertedError
export function getRevertName(error: unknown): string | undefined {
  const revert = error instanceof BaseError ? error.walk((e) => e instanceof ContractFunctionRevertedError) : undefined;

  return revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined;
}
