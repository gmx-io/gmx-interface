import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  custom,
  http,
  numberToHex,
  PublicClient,
} from "viem";

import { abis } from "sdk/abis";
import { getAbi } from "sdk/abis/getAbi";
import { GmxSdk } from "sdk/clients/v1";
import { MAX_TIMEOUT, Multicall } from "sdk/clients/v1/multicall";
import { arbitrumSdkConfig } from "sdk/clients/v1/testUtil";
import { ARBITRUM, getViemChain } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { hashData } from "sdk/utils/hash";
import type { MarketInfo, MarketsInfoData } from "sdk/utils/markets/types";
import type { TokensData } from "sdk/utils/tokens/types";

// eslint-disable-next-line no-restricted-globals -- test-only helper, never bundled into the client
const { PARITY_RPC_URL = "https://arb1.arbitrum.io/rpc", PARITY_BLOCK } = process.env;

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

// DataStore keeps uintValues in the mapping at slot 0
function getDataStoreStateOverride({ uint }: DataStoreOverrides) {
  const stateDiff = Object.fromEntries(
    uint.map(([key, value]) => [hashData(["bytes32", "uint256"], [key, 0n]), numberToHex(value, { size: 32 })])
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

// Only a decoded revert: viem also wraps node errors without revert data (-32603) as ContractFunctionRevertedError
export function getRevertName(error: unknown): string | undefined {
  const revert = error instanceof BaseError ? error.walk((e) => e instanceof ContractFunctionRevertedError) : undefined;

  return revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined;
}
