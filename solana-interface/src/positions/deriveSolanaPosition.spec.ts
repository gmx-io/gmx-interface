import { describe, expect, it, vi } from "vitest";

import { deriveSolanaPosition, isPendingMarketStateError } from "./deriveSolanaPosition";
import type { RawSolanaPosition } from "./types";
import type { GmsolSdk } from "../lib/gmsolRuntime";
import type { SolanaMarketAccount } from "../markets/decodeSolanaMarket";

const ONE_USD = 10n ** 20n;

const raw: RawSolanaPosition = {
  pubkey: "position",
  base64: "cG9zaXRpb24=",
  slot: 1,
  owner: "owner",
  marketToken: "market",
  collateralToken: "index",
  kind: 1,
  isLong: true,
  sizeInUsd: 1_000n * ONE_USD,
  sizeInTokens: 1_000n,
  collateralAmount: 10n,
  borrowingFactor: 0n,
  fundingFeeAmountPerSize: 0n,
  longTokenClaimableFundingAmountPerSize: 0n,
  shortTokenClaimableFundingAmountPerSize: 0n,
  increasedAt: 0n,
  decreasedAt: 0n,
  updatedAtSlot: 1n,
  tradeId: 1n,
};

const marketInfo = { marketToken: "market", indexToken: "index", longToken: "index", shortToken: "usdc", supply: "5" };
const marketAccount: SolanaMarketAccount = {
  address: "marketPda",
  marketToken: "market",
  indexToken: "index",
  longToken: "index",
  shortToken: "usdc",
  base64: "bWFya2V0",
  state: { minCollateralFactor: 10n ** 18n, minCollateralFactorForLiquidation: 10n ** 18n },
  slot: 1,
};
const ticker = { symbol: "X", minUnitPrice: 1n, maxUnitPrice: 2n };
const prices = { index: ticker, long: ticker, short: ticker };

function fakeSdk(status: () => Record<string, unknown>) {
  const free = vi.fn();
  const positionModel = { status, free };
  const marketModel = { free };
  const sdk = {
    Market: { decode_from_base64: vi.fn(() => ({ to_model: vi.fn(() => marketModel), free })) },
    Position: { decode_from_base64: vi.fn(() => ({ to_model: vi.fn(() => positionModel), free })) },
  } as unknown as GmsolSdk;
  return { sdk, free };
}

const sdkStatus = {
  entry_price: 5n,
  collateral_value: 100n * ONE_USD,
  pending_pnl: 1n,
  pending_borrowing_fee_value: 2n,
  pending_funding_fee_value: 3n,
  pending_claimable_funding_fee_value_in_long_token: 0n,
  pending_claimable_funding_fee_value_in_short_token: 0n,
  close_order_fee_value: 4n,
  net_value: 6n,
  leverage: 7n,
  liquidation_price: 8n,
};

describe("deriveSolanaPosition", () => {
  it("marks the position unavailable when market info is missing", () => {
    const { sdk } = fakeSdk(() => sdkStatus);
    expect(deriveSolanaPosition(sdk, { raw, marketAccount, prices })).toEqual({
      priceUnavailable: true,
      unavailableReason: "no-market-info",
    });
  });

  it("marks the position unavailable when the market account is missing", () => {
    const { sdk } = fakeSdk(() => sdkStatus);
    expect(deriveSolanaPosition(sdk, { raw, marketInfo, prices }).unavailableReason).toBe("no-market-account");
  });

  it("marks the position unavailable when any token price is missing", () => {
    const { sdk } = fakeSdk(() => sdkStatus);
    const result = deriveSolanaPosition(sdk, {
      raw,
      marketInfo,
      marketAccount,
      prices: { ...prices, short: undefined },
    });
    expect(result.unavailableReason).toBe("no-price");
  });

  it("maps the SDK status and frees wasm objects", () => {
    const { sdk, free } = fakeSdk(() => sdkStatus);
    const result = deriveSolanaPosition(sdk, { raw, marketInfo, marketAccount, prices });
    expect(result.priceUnavailable).toBe(false);
    expect(result.status).toMatchObject({
      entryPrice: 5n,
      collateralValue: 100n * ONE_USD,
      pendingPnl: 1n,
      closeOrderFeeValue: 4n,
      netValue: 6n,
      leverage: 7n,
      liquidationPrice: 8n,
    });
    expect(free).toHaveBeenCalledTimes(4);
  });

  it("treats a lagging market state as price unavailable", () => {
    const { sdk } = fakeSdk(() => {
      throw new Error("error calculating funding fee amount");
    });
    expect(deriveSolanaPosition(sdk, { raw, marketInfo, marketAccount, prices }).unavailableReason).toBe(
      "pending-market-state"
    );
  });

  it("rethrows unexpected SDK errors", () => {
    const { sdk } = fakeSdk(() => {
      throw new Error("boom");
    });
    expect(() => deriveSolanaPosition(sdk, { raw, marketInfo, marketAccount, prices })).toThrow("boom");
  });
});

describe("isPendingMarketStateError", () => {
  it("recognizes the two SDK messages", () => {
    expect(isPendingMarketStateError(new Error("invalid latest borrowing factor"))).toBe(true);
    expect(isPendingMarketStateError("calculating funding fee amount failed")).toBe(true);
    expect(isPendingMarketStateError(new Error("other"))).toBe(false);
  });
});
