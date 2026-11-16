import { describe, expect, it } from "vitest";

import type { TokenData } from "utils/tokens/types";

import { getGasPaymentValidations } from "./estimateExpressParams";

const TOKEN_ADDRESS = "0x0000000000000000000000000000000000000001";

function makeGasPaymentToken(balances: { walletBalance?: bigint; gmxAccountBalance?: bigint }): TokenData {
  return {
    address: TOKEN_ADDRESS,
    symbol: "USDC",
    decimals: 6,
    ...balances,
  } as TokenData;
}

const GAS_AMOUNT = 1_000_000n;
const BUFFERED_GAS_AMOUNT = 1_300_000n;
const ALLOWANCE = { [TOKEN_ADDRESS]: 10_000_000_000n };

describe("getGasPaymentValidations", () => {
  it("flags an unloaded wallet balance as out-of-balance but not loaded, so submit stays blocked without confirming insufficiency", () => {
    const validations = getGasPaymentValidations({
      gasPaymentToken: makeGasPaymentToken({ walletBalance: undefined }),
      gasPaymentTokenAmount: GAS_AMOUNT,
      gasPaymentTokenAsCollateralAmount: 0n,
      gasPaymentAllowanceData: ALLOWANCE,
      tokenPermits: [],
      isGmxAccount: false,
    });

    expect(validations.isGasPaymentTokenBalanceLoaded).toBe(false);
    expect(validations.isOutGasTokenBalance).toBe(true);
    expect(validations.isValid).toBe(false);
  });

  it("confirms insufficiency when the loaded balance can't cover buffered gas", () => {
    const validations = getGasPaymentValidations({
      gasPaymentToken: makeGasPaymentToken({ walletBalance: BUFFERED_GAS_AMOUNT - 1n }),
      gasPaymentTokenAmount: GAS_AMOUNT,
      gasPaymentTokenAsCollateralAmount: 0n,
      gasPaymentAllowanceData: ALLOWANCE,
      tokenPermits: [],
      isGmxAccount: false,
    });

    expect(validations.isGasPaymentTokenBalanceLoaded).toBe(true);
    expect(validations.isOutGasTokenBalance).toBe(true);
    expect(validations.isValid).toBe(false);
  });

  it("passes when the loaded balance covers buffered gas plus the collateral overlap", () => {
    const collateralAmount = 5_000_000n;
    const validations = getGasPaymentValidations({
      gasPaymentToken: makeGasPaymentToken({ walletBalance: BUFFERED_GAS_AMOUNT + collateralAmount }),
      gasPaymentTokenAmount: GAS_AMOUNT,
      gasPaymentTokenAsCollateralAmount: collateralAmount,
      gasPaymentAllowanceData: ALLOWANCE,
      tokenPermits: [],
      isGmxAccount: false,
    });

    expect(validations.isGasPaymentTokenBalanceLoaded).toBe(true);
    expect(validations.isOutGasTokenBalance).toBe(false);
    expect(validations.isValid).toBe(true);
  });

  it("checks gmxAccountBalance and ignores walletBalance when isGmxAccount is true", () => {
    const unloaded = getGasPaymentValidations({
      gasPaymentToken: makeGasPaymentToken({ walletBalance: 10_000_000n, gmxAccountBalance: undefined }),
      gasPaymentTokenAmount: GAS_AMOUNT,
      gasPaymentTokenAsCollateralAmount: 0n,
      gasPaymentAllowanceData: undefined,
      tokenPermits: [],
      isGmxAccount: true,
    });

    expect(unloaded.isGasPaymentTokenBalanceLoaded).toBe(false);
    expect(unloaded.isOutGasTokenBalance).toBe(true);

    const loaded = getGasPaymentValidations({
      gasPaymentToken: makeGasPaymentToken({ walletBalance: 0n, gmxAccountBalance: BUFFERED_GAS_AMOUNT }),
      gasPaymentTokenAmount: GAS_AMOUNT,
      gasPaymentTokenAsCollateralAmount: 0n,
      gasPaymentAllowanceData: undefined,
      tokenPermits: [],
      isGmxAccount: true,
    });

    expect(loaded.isGasPaymentTokenBalanceLoaded).toBe(true);
    expect(loaded.isOutGasTokenBalance).toBe(false);
    expect(loaded.isValid).toBe(true);
  });
});
