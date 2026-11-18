import { parseUnits } from "viem";
import { describe, expect, it } from "vitest";

import type { GlvInfo, MarketInfo } from "domain/synthetics/markets";
import type { TokenData } from "domain/synthetics/tokens";
import { bigMath } from "sdk/utils/bigmath";

import { getDepositAmounts } from "../deposit";
import { MARKET_INFO_FIXTURE } from "./fixtures";

const GM_SUPPLY = parseUnits("60000000", 18);
const GM_PRICE = bigMath.mulDiv(MARKET_INFO_FIXTURE.poolValueMax, parseUnits("1", 18), GM_SUPPLY);

const GM_TOKEN = {
  symbol: "GM",
  decimals: 18,
  address: MARKET_INFO_FIXTURE.marketTokenAddress,
  totalSupply: GM_SUPPLY,
  prices: { minPrice: GM_PRICE, maxPrice: GM_PRICE },
} as TokenData;

const GLV_TOKEN = {
  symbol: "GLV",
  decimals: 18,
  address: "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9",
  prices: { minPrice: parseUnits("1.4", 30), maxPrice: parseUnits("1.4", 30) },
} as TokenData;

const { longToken, shortToken } = MARKET_INFO_FIXTURE;

describe("getDepositAmounts byMarketToken", () => {
  it.each([
    { name: "single-token GM with negative impact", impactSign: -1, receive: "600000", long: true, short: false },
    {
      name: "single-token GM with positive impact",
      impactSign: 1,
      receive: "60000",
      long: false,
      short: true,
      marketInfo: { swapImpactPoolAmountLong: parseUnits("10", 18) },
    },
    {
      name: "single-token GM without impact",
      impactSign: 0,
      receive: "600000",
      long: true,
      short: false,
      marketInfo: { swapImpactFactorPositive: 0n, swapImpactFactorNegative: 0n },
    },
    {
      name: "paired GM",
      impactSign: -1,
      receive: "600000",
      long: true,
      short: true,
      prevLongTokenAmount: parseUnits("1", longToken.decimals),
      prevShortTokenAmount: parseUnits("1000", shortToken.decimals),
    },
    { name: "single-token GLV", impactSign: -1, receive: "600000", long: true, short: false, isGlv: true },
  ])("quotes $name from Receive that the submitted collateral mints TRD-21", (c) => {
    const marketInfo: MarketInfo = { ...MARKET_INFO_FIXTURE, ...c.marketInfo };
    const receiveAmount = parseUnits(c.receive, 18);
    const params = {
      marketInfo,
      marketToken: GM_TOKEN,
      longToken,
      shortToken,
      includeLongToken: c.long,
      includeShortToken: c.short,
      uiFeeFactor: parseUnits("0.0005", 30),
      isMarketTokenDeposit: false,
      glvInfo: c.isGlv ? ({ glvToken: GLV_TOKEN } as GlvInfo) : undefined,
      glvToken: c.isGlv ? GLV_TOKEN : undefined,
    };

    const quote = getDepositAmounts({
      ...params,
      strategy: "byMarketToken",
      longTokenAmount: c.prevLongTokenAmount ?? 0n,
      shortTokenAmount: c.prevShortTokenAmount ?? 0n,
      marketTokenAmount: c.isGlv ? 0n : receiveAmount,
      glvTokenAmount: c.isGlv ? receiveAmount : 0n,
    });
    const forwardQuote = getDepositAmounts({
      ...params,
      strategy: "byCollaterals",
      longTokenAmount: quote.longTokenAmount,
      shortTokenAmount: quote.shortTokenAmount,
      marketTokenAmount: 0n,
    });

    const displayedReceive = c.isGlv ? quote.glvTokenAmount : quote.marketTokenAmount;
    const forwardReceive = c.isGlv ? forwardQuote.glvTokenAmount : forwardQuote.marketTokenAmount;

    expect(displayedReceive).toBe(receiveAmount);
    expect(forwardReceive).toBeGreaterThanOrEqual(displayedReceive);
    expect(Math.sign(Number(quote.swapPriceImpactDeltaUsd))).toBe(c.impactSign);
    expect({
      swapPriceImpactDeltaUsd: quote.swapPriceImpactDeltaUsd,
      swapFeeUsd: quote.swapFeeUsd,
      uiFeeUsd: quote.uiFeeUsd,
      basisUsd: quote.longTokenUsd + quote.shortTokenUsd,
    }).toEqual({
      swapPriceImpactDeltaUsd: forwardQuote.swapPriceImpactDeltaUsd,
      swapFeeUsd: forwardQuote.swapFeeUsd,
      uiFeeUsd: forwardQuote.uiFeeUsd,
      basisUsd: forwardQuote.longTokenUsd + forwardQuote.shortTokenUsd,
    });
  });
});
