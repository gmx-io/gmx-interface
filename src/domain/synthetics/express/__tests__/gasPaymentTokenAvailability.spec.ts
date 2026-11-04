import { createPublicClient, custom, encodeFunctionResult, multicall3Abi } from "viem";
import { arbitrum } from "viem/chains";
import { describe, expect, it, vi } from "vitest";

import { convertToTokenAmount, type TokenData, type TokensData } from "domain/tokens";
import { abis } from "sdk/abis";
import { ARBITRUM } from "sdk/configs/chainIds";
import { getGasPaymentTokens } from "sdk/configs/express";
import { getTokenBySymbol } from "sdk/configs/tokens";
import type { SwapPathStats, SwapStats } from "sdk/utils/trade/types";

import {
  fetchGasPaymentTokensOnchainState,
  getAvailableGasPaymentTokenAddress,
  getGasPaymentTokenUnavailableReason,
  type GasPaymentTokensOnchainState,
} from "../gasPaymentTokenAvailability";

const rpc = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("lib/wallets/walletConfig", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPublicClientWithRpc: () =>
    createPublicClient({ chain: arbitrum, transport: custom({ request: rpc.request }, { retryCount: 0 }) }),
}));

const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;
const USDT = getTokenBySymbol(ARBITRUM, "USDT").address;
const USDG = getTokenBySymbol(ARBITRUM, "USDG").address;
const WETH = getTokenBySymbol(ARBITRUM, "WETH").address;

const SWAP_ONLY_USDC_USDG = "0x408E8e83d4b8Ac4BDefFDF896B49268A5FE5Ef44";
const ETH_USD_WETH_USDC = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";

const USDG_FEE_ROUTE = [SWAP_ONLY_USDC_USDG, ETH_USD_WETH_USDC];

function feeRoute(swapPath: string[], step: Partial<SwapStats> = {}) {
  return () =>
    ({
      swapPath,
      swapSteps: swapPath.map((marketAddress) => ({ marketAddress, ...step })),
    }) as SwapPathStats;
}

function onchain(state: Partial<GasPaymentTokensOnchainState>): GasPaymentTokensOnchainState {
  return { unpricedTokenAddresses: [], pausedTokenAddresses: [], ...state };
}

describe("getGasPaymentTokenUnavailableReason", () => {
  it.each([
    { name: "USDG with a fillable route", token: USDG, route: feeRoute(USDG_FEE_ROUTE), expected: undefined },
    { name: "USDG with no route", token: USDG, route: () => undefined, expected: "feeSwap" },
    {
      name: "USDG when the USDC/USDG pool is at its USDG cap",
      token: USDG,
      route: feeRoute(USDG_FEE_ROUTE, { isOutCapacity: true }),
      expected: "feeSwap",
    },
    {
      name: "USDG with a stale USDG feed",
      token: USDG,
      route: feeRoute(USDG_FEE_ROUTE),
      state: onchain({ unpricedTokenAddresses: [USDG] }),
      expected: "price",
    },
    {
      // the fee swap prices USDC on the way to WETH
      name: "USDG with a stale USDC feed",
      token: USDG,
      route: feeRoute(USDG_FEE_ROUTE),
      state: onchain({ unpricedTokenAddresses: [USDC] }),
      expected: "price",
    },
    {
      name: "USDC is not blocked by a stale USDG feed",
      token: USDC,
      route: feeRoute([ETH_USD_WETH_USDC]),
      state: onchain({ unpricedTokenAddresses: [USDG] }),
      expected: undefined,
    },
    {
      // the fee swap moves USDC between pools
      name: "USDG with paused USDC on its route",
      token: USDG,
      route: feeRoute(USDG_FEE_ROUTE),
      state: onchain({ pausedTokenAddresses: [USDC] }),
      expected: "paused",
    },
    {
      name: "paused USDG",
      token: USDG,
      route: feeRoute(USDG_FEE_ROUTE),
      state: onchain({ pausedTokenAddresses: [USDG] }),
      expected: "paused",
    },
    { name: "WETH needs no fee swap", token: WETH, route: () => undefined, expected: undefined },
  ])("$name", ({ token, route, state, expected }) => {
    expect(
      getGasPaymentTokenUnavailableReason({
        chainId: ARBITRUM,
        tokenAddress: token,
        findFeeSwapPath: route,
        onchainState: state,
      })
    ).toBe(expected);
  });
});

describe("getAvailableGasPaymentTokenAddress", () => {
  const ONE_USD = 10n ** 30n;
  const ETH_USD = 3000n * ONE_USD;
  const usd = (amount: bigint) => amount * 1_000_000n;
  const MAX_ALLOWANCE = 10n ** 40n;

  function tokensData(walletBalances: Record<string, bigint>): TokensData {
    return Object.fromEntries(
      [
        [USDC, 6, ONE_USD],
        [WETH, 18, ETH_USD],
        [USDT, 6, ONE_USD],
        [USDG, 6, ONE_USD],
      ].map(([address, decimals, price]) => [
        address,
        {
          address,
          decimals,
          prices: { minPrice: price, maxPrice: price },
          walletBalance: walletBalances[address as string] ?? 0n,
        } as TokenData,
      ])
    );
  }

  const usdgUnavailable = { [USDG]: "price" as const };
  const minFeeAmount = (token: TokenData) => convertToTokenAmount(ONE_USD, token.decimals, token.prices.minPrice);
  const allApproved = { [USDC]: MAX_ALLOWANCE, [WETH]: MAX_ALLOWANCE, [USDT]: MAX_ALLOWANCE, [USDG]: MAX_ALLOWANCE };

  it.each([
    { name: "keeps an available saved token", unavailable: {}, balances: {}, allowances: {}, expected: USDG },
    {
      name: "picks the largest balance over leftover dust",
      unavailable: usdgUnavailable,
      balances: { [USDG]: usd(10n), [USDC]: 1n, [USDT]: usd(50n) },
      allowances: allApproved,
      expected: USDT,
    },
    {
      name: "picks an approved token over a larger unapproved one",
      unavailable: usdgUnavailable,
      balances: { [USDC]: usd(5n), [USDT]: usd(50n) },
      allowances: { [USDC]: MAX_ALLOWANCE },
      expected: USDC,
    },
    {
      name: "picks a larger unapproved balance over an approved one too small for the fee",
      unavailable: usdgUnavailable,
      balances: { [USDC]: usd(1n) / 2n, [USDT]: usd(50n) },
      allowances: { [USDC]: MAX_ALLOWANCE },
      expected: USDT,
    },
    {
      name: "counts an allowance that covers the fee as approved",
      unavailable: usdgUnavailable,
      balances: { [USDC]: usd(100n), [USDT]: usd(500n) },
      allowances: { [USDC]: usd(5n) },
      expected: USDC,
    },
    {
      name: "skips listed tokens that can't pay either",
      unavailable: { ...usdgUnavailable, [USDT]: "price" as const },
      balances: { [USDC]: usd(5n), [USDT]: usd(50n) },
      allowances: allApproved,
      expected: USDC,
    },
    {
      name: "keeps the saved token when nothing else can pay",
      unavailable: usdgUnavailable,
      balances: { [USDG]: usd(10n) },
      allowances: allApproved,
      expected: USDG,
    },
  ])("$name", ({ unavailable, balances, allowances, expected }) => {
    expect(
      getAvailableGasPaymentTokenAddress({
        chainId: ARBITRUM,
        savedTokenAddress: USDG,
        unavailableTokens: unavailable,
        tokensData: tokensData(balances),
        tokensAllowanceData: allowances,
        tokenPermits: [],
        isGmxAccount: false,
        getMinFeeAmount: minFeeAmount,
      })
    ).toBe(expected);
  });
});

describe("fetchGasPaymentTokensOnchainState", () => {
  type HexData = `0x${string}`;

  const priceResult = (token: string) =>
    encodeFunctionResult({
      abi: abis.ChainlinkPriceFeedProvider,
      functionName: "getOraclePrice",
      result: { token: token as HexData, min: 1n, max: 1n, timestamp: 1n, provider: token as HexData },
    }) as HexData;
  const notPaused = encodeFunctionResult({ abi: abis.Pausable, functionName: "paused", result: false }) as HexData;

  it("marks a token unpriced only when its price read reverts", async () => {
    const aggregate3Result = encodeFunctionResult({
      abi: multicall3Abi,
      functionName: "aggregate3",
      result: getGasPaymentTokens(ARBITRUM).flatMap((token): { success: boolean; returnData: HexData }[] => [
        token === USDG ? { success: false, returnData: "0x" } : { success: true, returnData: priceResult(token) },
        { success: true, returnData: notPaused },
      ]),
    });
    rpc.request.mockResolvedValue(aggregate3Result);

    await expect(fetchGasPaymentTokensOnchainState(ARBITRUM)).resolves.toEqual({
      unpricedTokenAddresses: [USDG],
      pausedTokenAddresses: [],
    });
  });

  it("throws on a failed request instead of marking every token unpriced", async () => {
    rpc.request.mockRejectedValue(new Error("network error"));

    await expect(fetchGasPaymentTokensOnchainState(ARBITRUM)).rejects.toThrow();
  });
});
