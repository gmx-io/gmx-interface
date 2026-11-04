import { describe, expect, it } from "vitest";

import type { TokenData, TokensData } from "domain/tokens";
import { ARBITRUM } from "sdk/configs/chainIds";
import { getTokenBySymbol } from "sdk/configs/tokens";
import type { SwapPathStats, SwapStats } from "sdk/utils/trade/types";

import {
  getAvailableGasPaymentTokenAddress,
  getGasPaymentTokenUnavailableReason,
  type GasPaymentTokensOnchainState,
} from "../gasPaymentTokenAvailability";

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
  function tokensData(walletBalances: Record<string, bigint>): TokensData {
    return Object.fromEntries(
      [USDC, WETH, USDT, USDG].map((address) => [
        address,
        { address, walletBalance: walletBalances[address] ?? 0n } as TokenData,
      ])
    );
  }

  it.each([
    { name: "keeps an available saved token", saved: USDG, unavailable: {}, balances: {}, expected: USDG },
    {
      name: "moves to the first listed token with a balance",
      saved: USDG,
      unavailable: { [USDG]: "price" as const },
      balances: { [USDG]: 10n, [USDT]: 5n },
      expected: USDT,
    },
    {
      name: "skips listed tokens that can't pay either",
      saved: USDG,
      unavailable: { [USDG]: "price" as const, [USDC]: "price" as const },
      balances: { [USDC]: 5n, [USDT]: 5n },
      expected: USDT,
    },
    {
      name: "keeps the saved token when nothing else can pay",
      saved: USDG,
      unavailable: { [USDG]: "price" as const },
      balances: { [USDG]: 10n },
      expected: USDG,
    },
  ])("$name", ({ saved, unavailable, balances, expected }) => {
    expect(
      getAvailableGasPaymentTokenAddress({
        chainId: ARBITRUM,
        savedTokenAddress: saved,
        unavailableTokens: unavailable,
        tokensData: tokensData(balances),
        isGmxAccount: false,
      })
    ).toBe(expected);
  });
});
