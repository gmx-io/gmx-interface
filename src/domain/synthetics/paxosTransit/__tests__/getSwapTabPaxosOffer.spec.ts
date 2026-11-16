import { describe, expect, it } from "vitest";

import type { Token } from "domain/tokens";
import { expandDecimals } from "lib/numbers";

import type { PaxosRouteState, PaxosSwapRoute } from "../tradeboxRoutes";
import { getSwapTabPaxosOffer } from "../useIsSwapTabPaxosOffered";

const usdc = (value: number) => BigInt(Math.round(value * 1e6));
const usd = (value: number) => expandDecimals(value, 30);

const standardQuoted: Record<PaxosSwapRoute, PaxosRouteState> = {
  paxosZeroFee: { status: "hidden" },
  paxosStandard: { status: "quote" },
};

const base = {
  routeStates: standardQuoted,
  standardQuoteAmountOut: usdc(299),
  isStandardQuoteCompared: true,
  instantAmountOut: undefined,
  isPaidOutsideWallet: false,
  isWhitelisted: false,
  isStandardForced: false,
  amount: usdc(300),
  amountUsd: usd(300),
  thresholdUsd: usd(100),
  zeroFeeMinOrderSize: undefined,
  standardMinOrderSize: usdc(190),
  usdcToken: { symbol: "USDC", decimals: 6 } as Token,
};

describe("getSwapTabPaxosOffer", () => {
  it("offers the standard route when instant can't fill the amount", () => {
    expect(getSwapTabPaxosOffer(base).isOffered).toBe(true);
  });

  it("offers the standard route when its quote beats instant", () => {
    expect(getSwapTabPaxosOffer({ ...base, instantAmountOut: usdc(298) }).isOffered).toBe(true);
  });

  it("doesn't offer it when instant pays more, as the Swap tab hides it then", () => {
    expect(getSwapTabPaxosOffer({ ...base, instantAmountOut: usdc(299.5) })).toEqual({
      isOffered: false,
      minimumText: undefined,
      isWalletOnly: false,
    });
  });

  it("doesn't offer it when the quote failed", () => {
    expect(getSwapTabPaxosOffer({ ...base, standardQuoteAmountOut: undefined }).isOffered).toBe(false);
  });

  it("skips the quote comparison for whitelisted traders", () => {
    expect(
      getSwapTabPaxosOffer({
        ...base,
        isStandardQuoteCompared: false,
        isWhitelisted: true,
        standardQuoteAmountOut: undefined,
        instantAmountOut: usdc(300),
      }).isOffered
    ).toBe(true);
  });

  it("names the wallet instead of linking when the trader pays from outside it", () => {
    expect(getSwapTabPaxosOffer({ ...base, isPaidOutsideWallet: true })).toEqual({
      isOffered: false,
      minimumText: undefined,
      isWalletOnly: true,
    });
  });
});
