import { describe, expect, it, vi } from "vitest";

import type { TokenData, TokensData } from "domain/tokens";
import { ARBITRUM } from "sdk/configs/chainIds";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { estimateWithApprovedGasPaymentToken, resolveGasPaymentTokenAddress } from "../gasPaymentTokenFallback";
import type { ExpressTxnParams, GlobalExpressParams } from "../types";

const USDC = getTokenBySymbol(ARBITRUM, "USDC");
const USDT = getTokenBySymbol(ARBITRUM, "USDT");
const WETH = getTokenBySymbol(ARBITRUM, "WETH");
const LINK = getTokenBySymbol(ARBITRUM, "LINK");

const STABLE_PRICE = 10n ** 30n;
const ETH_PRICE = 3000n * 10n ** 30n;
const ONE_USD = 10n ** 30n;
const ONE_USDC = 1_000_000n;
const ONE_WETH = 10n ** 18n;

function makeTokenData(base: { address: string; symbol: string; decimals: number }, price: bigint, balance: bigint) {
  return {
    address: base.address,
    symbol: base.symbol,
    name: base.symbol,
    decimals: base.decimals,
    prices: { minPrice: price, maxPrice: price },
    walletBalance: balance,
  } as TokenData;
}

function buildTokensData({
  usdc = 100n * ONE_USDC,
  usdt = 100n * ONE_USDC,
  weth = ONE_WETH,
}: { usdc?: bigint; usdt?: bigint; weth?: bigint } = {}): TokensData {
  return {
    [USDC.address]: makeTokenData(USDC, STABLE_PRICE, usdc),
    [USDT.address]: makeTokenData(USDT, STABLE_PRICE, usdt),
    [WETH.address]: makeTokenData(WETH, ETH_PRICE, weth),
    [LINK.address]: makeTokenData(LINK, 10n * STABLE_PRICE, ONE_WETH),
  };
}

const MAX_ALLOWANCE = 10n ** 40n;

function resolve(overrides: Partial<Parameters<typeof resolveGasPaymentTokenAddress>[0]> = {}) {
  const tokensData = overrides.tokensData ?? buildTokensData();

  return resolveGasPaymentTokenAddress({
    chainId: ARBITRUM,
    fallback: "payToken",
    gasPaymentToken: tokensData[USDC.address],
    payTokenAddress: WETH.address,
    payAmounts: {},
    feeUsdByToken: {},
    tokensData,
    tokensAllowanceData: { [USDC.address]: 0n, [USDT.address]: 0n, [WETH.address]: 0n },
    tokenPermits: [],
    ...overrides,
  });
}

describe("resolveGasPaymentTokenAddress", () => {
  describe("payToken", () => {
    it("pays the fee in the pay token when the saved gas payment token is not approved", () => {
      expect(resolve()).toBe(WETH.address);
    });

    it("keeps the saved token when it is approved", () => {
      expect(resolve({ tokensAllowanceData: { [USDC.address]: MAX_ALLOWANCE } })).toBe(USDC.address);
    });

    it("keeps the saved token when the pay token is not a gas payment token", () => {
      expect(resolve({ payTokenAddress: LINK.address })).toBe(USDC.address);
    });

    it("keeps the saved token while its allowance is loading", () => {
      expect(resolve({ tokensAllowanceData: undefined })).toBe(USDC.address);
      expect(resolve({ tokensAllowanceData: {} })).toBe(USDC.address);
    });

    it("compares a partial allowance with the buffered fee estimated with the saved token", () => {
      const feeUsdByToken = { [USDC.address]: ONE_USD };

      // 1.3 USDC is required
      expect(resolve({ feeUsdByToken, tokensAllowanceData: { [USDC.address]: 1_200_000n } })).toBe(WETH.address);
      expect(resolve({ feeUsdByToken, tokensAllowanceData: { [USDC.address]: 1_400_000n } })).toBe(USDC.address);
    });

    it("keeps the saved token when the pay token can't cover its own fee", () => {
      const tokensData = buildTokensData({ weth: ONE_WETH / 10_000n }); // $0.3

      expect(resolve({ tokensData, feeUsdByToken: { [WETH.address]: ONE_USD } })).toBe(USDC.address);
      expect(resolve({ tokensData: buildTokensData({ weth: 0n }) })).toBe(USDC.address);
    });
  });

  describe("approvedToken", () => {
    const allowances = { [USDC.address]: 0n, [USDT.address]: MAX_ALLOWANCE, [WETH.address]: 0n };

    it("uses another approved token with enough balance when the saved token is not approved", () => {
      expect(
        resolve({
          fallback: "approvedToken",
          tokensAllowanceData: allowances,
          feeUsdByToken: { [USDC.address]: ONE_USD },
        })
      ).toBe(USDT.address);
    });

    it("uses another approved token when the saved token is short", () => {
      const tokensData = buildTokensData({ usdc: ONE_USDC });

      expect(
        resolve({
          fallback: "approvedToken",
          tokensData,
          gasPaymentToken: tokensData[USDC.address],
          tokensAllowanceData: { ...allowances, [USDC.address]: MAX_ALLOWANCE },
          feeUsdByToken: { [USDC.address]: ONE_USD },
        })
      ).toBe(USDT.address);
    });

    it("keeps the saved token when no approved token has enough balance", () => {
      expect(
        resolve({
          fallback: "approvedToken",
          tokensData: buildTokensData({ usdt: ONE_USDC }),
          tokensAllowanceData: allowances,
          feeUsdByToken: { [USDC.address]: ONE_USD },
        })
      ).toBe(USDC.address);
    });

    it("keeps the saved token until its fee is estimated", () => {
      expect(resolve({ fallback: "approvedToken", tokensAllowanceData: allowances })).toBe(USDC.address);
    });

    it("keeps the saved token when it is approved and has enough balance", () => {
      expect(
        resolve({
          fallback: "approvedToken",
          tokensAllowanceData: { ...allowances, [USDC.address]: MAX_ALLOWANCE },
          feeUsdByToken: { [USDC.address]: ONE_USD },
        })
      ).toBe(USDC.address);
    });
  });
});

describe("estimateWithApprovedGasPaymentToken", () => {
  const tokensData = buildTokensData();

  function makeGlobalExpressParams(gasPaymentToken: TokenData, allowances: Record<string, bigint>) {
    return {
      tokensData,
      gasPaymentToken,
      gasPaymentTokenAddress: gasPaymentToken.address,
      gasPaymentAllowanceData: allowances,
    } as unknown as GlobalExpressParams;
  }

  function makeExpressParams(globalExpressParams: GlobalExpressParams | undefined, isValid: boolean) {
    const gasPaymentToken = globalExpressParams!.gasPaymentToken;

    return {
      gasPaymentParams: {
        gasPaymentToken,
        gasPaymentTokenAddress: gasPaymentToken.address,
        gasPaymentTokenAmount: gasPaymentToken.address === WETH.address ? ONE_WETH / 3000n : ONE_USDC,
      },
      gasPaymentValidations: {
        isValid,
        isOutGasTokenBalance: false,
        needGasPaymentTokenApproval: !isValid,
        isGasPaymentTokenBalanceLoaded: true,
      },
    } as unknown as ExpressTxnParams;
  }

  const allowances = { [USDC.address]: 0n, [USDT.address]: MAX_ALLOWANCE, [WETH.address]: 0n };
  const savedGlobalExpressParams = makeGlobalExpressParams(tokensData[USDC.address], allowances);
  const usdtGlobalExpressParams = makeGlobalExpressParams(tokensData[USDT.address], allowances);

  it("doesn't estimate again when the saved token can pay", async () => {
    const estimate = vi.fn(async (p: GlobalExpressParams | undefined) => makeExpressParams(p, true));

    const result = await estimateWithApprovedGasPaymentToken({
      chainId: ARBITRUM,
      isGmxAccount: false,
      globalExpressParams: savedGlobalExpressParams,
      payAmounts: {},
      estimate,
      getGlobalExpressParamsForGasPaymentToken: () => usdtGlobalExpressParams,
    });

    expect(estimate).toHaveBeenCalledTimes(1);
    expect(result?.gasPaymentParams.gasPaymentTokenAddress).toBe(USDC.address);
  });

  it("estimates with an approved token when the saved token is not approved", async () => {
    const estimate = vi.fn(async (p: GlobalExpressParams | undefined) =>
      makeExpressParams(p, p?.gasPaymentTokenAddress === USDT.address)
    );
    const getGlobalExpressParamsForGasPaymentToken = vi.fn(() => usdtGlobalExpressParams);

    const result = await estimateWithApprovedGasPaymentToken({
      chainId: ARBITRUM,
      isGmxAccount: false,
      globalExpressParams: savedGlobalExpressParams,
      payAmounts: {},
      estimate,
      getGlobalExpressParamsForGasPaymentToken,
    });

    expect(getGlobalExpressParamsForGasPaymentToken).toHaveBeenCalledWith(USDT.address);
    expect(result?.gasPaymentParams.gasPaymentTokenAddress).toBe(USDT.address);
    expect(result?.gasPaymentValidations.isValid).toBe(true);
  });

  it("returns the invalid estimate for a Classic fallback when no approved token can pay", async () => {
    const estimate = vi.fn(async (p: GlobalExpressParams | undefined) => makeExpressParams(p, false));

    const result = await estimateWithApprovedGasPaymentToken({
      chainId: ARBITRUM,
      isGmxAccount: false,
      globalExpressParams: makeGlobalExpressParams(tokensData[USDC.address], { ...allowances, [USDT.address]: 0n }),
      payAmounts: {},
      estimate,
      getGlobalExpressParamsForGasPaymentToken: () => usdtGlobalExpressParams,
    });

    expect(estimate).toHaveBeenCalledTimes(1);
    expect(result?.gasPaymentParams.gasPaymentTokenAddress).toBe(USDC.address);
    expect(result?.gasPaymentValidations.isValid).toBe(false);
  });

  it("leaves the GMX Account path unchanged", async () => {
    const estimate = vi.fn(async (p: GlobalExpressParams | undefined) => makeExpressParams(p, false));

    await estimateWithApprovedGasPaymentToken({
      chainId: ARBITRUM,
      isGmxAccount: true,
      globalExpressParams: savedGlobalExpressParams,
      payAmounts: {},
      estimate,
      getGlobalExpressParamsForGasPaymentToken: () => usdtGlobalExpressParams,
    });

    expect(estimate).toHaveBeenCalledTimes(1);
  });
});
