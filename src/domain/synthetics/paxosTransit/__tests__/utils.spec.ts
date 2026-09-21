import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import type { WithdrawalStatuses } from "context/SyntheticsEvents/types";
import { expandDecimals } from "lib/numbers";
import type { TransitFeeTierResponse } from "sdk/utils/paxos/types";

import { findTransitWithdrawal, getIsTransitQuoteNeeded, getTransitFeeTier } from "../utils";

const usd = (value: number) => expandDecimals(value, USD_DECIMALS);
const ZERO_FEE: TransitFeeTierResponse = { feeTier: "zeroFee", zeroFeeCapacity: 1_000_000n };
const STANDARD_FEE: TransitFeeTierResponse = { feeTier: "standardFee", zeroFeeCapacity: 0n };

describe("getTransitFeeTier", () => {
  const params = {
    feeTierData: ZERO_FEE,
    isWhitelistIgnored: false,
    isUsdcOffered: true,
    amount: 500_000n,
    isStandardFeeForced: false,
  };

  it("uses zero fee for a whitelisted address with enough capacity", () => {
    expect(getTransitFeeTier(params)).toEqual({
      isWhitelisted: true,
      isZeroFeeCapacityShort: false,
      feeTier: "zeroFee",
    });
  });

  it("falls back to standard fee when USDC to USDG capacity is short", () => {
    expect(getTransitFeeTier({ ...params, amount: 2_000_000n })).toEqual({
      isWhitelisted: true,
      isZeroFeeCapacityShort: true,
      feeTier: "standardFee",
    });
  });

  it("ignores capacity when USDG is offered", () => {
    expect(getTransitFeeTier({ ...params, isUsdcOffered: false, amount: 2_000_000n }).feeTier).toBe("zeroFee");
  });

  it("uses standard fee when forced, ignored or not whitelisted", () => {
    expect(getTransitFeeTier({ ...params, isStandardFeeForced: true }).feeTier).toBe("standardFee");
    expect(getTransitFeeTier({ ...params, isWhitelistIgnored: true }).isWhitelisted).toBe(false);
    expect(getTransitFeeTier({ ...params, feeTierData: STANDARD_FEE }).feeTier).toBe("standardFee");
    expect(getTransitFeeTier({ ...params, feeTierData: undefined }).feeTier).toBe("standardFee");
  });
});

describe("getIsTransitQuoteNeeded", () => {
  const params = {
    isTransitRequired: false,
    isWhitelisted: false,
    swapFeesUsd: usd(1),
    amountUsd: usd(100),
    minAmountUsd: usd(250),
  };

  it("skips the quote for a small amount our pool can fill", () => {
    expect(getIsTransitQuoteNeeded(params)).toBe(false);
  });

  it("needs a quote when required, whitelisted, above the threshold or when our pool can't fill it", () => {
    expect(getIsTransitQuoteNeeded({ ...params, isTransitRequired: true })).toBe(true);
    expect(getIsTransitQuoteNeeded({ ...params, isWhitelisted: true })).toBe(true);
    expect(getIsTransitQuoteNeeded({ ...params, amountUsd: usd(300) })).toBe(true);
    expect(getIsTransitQuoteNeeded({ ...params, swapFeesUsd: undefined })).toBe(true);
  });
});

describe("findTransitWithdrawal", () => {
  const ACCOUNT = "0x1111111111111111111111111111111111111111";
  const POOL = "0x2222222222222222222222222222222222222222";
  const OTHER = "0x3333333333333333333333333333333333333333";

  const status = (
    key: string,
    createdAt: number,
    overrides: { receiver?: string; marketAddress?: string; cancelledTxnHash?: string } = {}
  ) => ({
    key,
    createdAt,
    cancelledTxnHash: overrides.cancelledTxnHash,
    data: {
      key,
      account: ACCOUNT,
      receiver: overrides.receiver ?? ACCOUNT,
      callbackContract: OTHER,
      marketAddress: overrides.marketAddress ?? POOL,
      marketTokenAmount: 10n,
      minLongTokenAmount: 4n,
      minShortTokenAmount: 6n,
      updatedAtBlock: 1n,
      executionFee: 0n,
      callbackGasLimit: 0n,
      shouldUnwrapNativeToken: false,
    },
  });

  const statuses = (...list: ReturnType<typeof status>[]): WithdrawalStatuses =>
    Object.fromEntries(list.map((item) => [item.key, item]));

  const params = { account: ACCOUNT, poolAddress: POOL, convertedWithdrawalKeys: [] };

  it("takes the newest withdrawal of this pool", () => {
    expect(findTransitWithdrawal(statuses(status("old", 1), status("new", 2)), params)?.key).toBe("new");
  });

  it("skips cancelled, already converted and foreign withdrawals", () => {
    expect(
      findTransitWithdrawal(statuses(status("cancelled", 3, { cancelledTxnHash: "0xabc" })), params)
    ).toBeUndefined();
    expect(
      findTransitWithdrawal(statuses(status("done", 3)), { ...params, convertedWithdrawalKeys: ["done"] })
    ).toBeUndefined();
    expect(findTransitWithdrawal(statuses(status("other pool", 3, { marketAddress: OTHER })), params)).toBeUndefined();
    expect(findTransitWithdrawal(statuses(status("other receiver", 3, { receiver: OTHER })), params)).toBeUndefined();
  });

  it("needs an account and a pool", () => {
    expect(findTransitWithdrawal(statuses(status("withdrawal", 1)), { ...params, account: undefined })).toBeUndefined();
    expect(
      findTransitWithdrawal(statuses(status("withdrawal", 1)), { ...params, poolAddress: undefined })
    ).toBeUndefined();
  });
});
