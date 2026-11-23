import { parseUnits } from "viem";
import { describe, expect, it } from "vitest";

import type { GlvInfo, MarketInfo } from "domain/synthetics/markets";
import { convertToTokenAmount, convertToUsd, type TokenData } from "domain/synthetics/tokens";
import { applyFactor } from "lib/numbers";
import { ARBITRUM } from "sdk/configs/chains";
import { bigMath } from "sdk/utils/bigmath";
import type { FindSwapPath, SwapPathStats } from "sdk/utils/trade/types";

import { getDepositAmounts } from "../deposit";
import { getGmSwapError } from "../validation";
import { MARKET_INFO_FIXTURE } from "./fixtures";

const USD = parseUnits("1", 30);
const UI_FEE_FACTOR = parseUnits("0.0005", 30);
const DEPOSIT_FEE_FACTOR = parseUnits("0.001", 30);
const SWAP_FEE_RECEIVER_FACTOR = parseUnits("0.37", 30);

const USDC_TOKEN = {
  symbol: "USDC",
  decimals: 6,
  address: MARKET_INFO_FIXTURE.shortTokenAddress,
  isStable: true,
  prices: { minPrice: USD, maxPrice: USD },
} as TokenData;

const USDT_TOKEN = {
  symbol: "USDT",
  decimals: 6,
  address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  isStable: true,
  prices: { minPrice: USD, maxPrice: USD },
} as TokenData;

// deposits pay the deposit fee factor, not the fixture's 5/7 bps swap factor
const ETH_USD_MARKET: MarketInfo = {
  ...MARKET_INFO_FIXTURE,
  shortToken: USDC_TOKEN,
  depositFeeFactorBalanceWasImproved: DEPOSIT_FEE_FACTOR,
  depositFeeFactorBalanceWasNotImproved: DEPOSIT_FEE_FACTOR,
};
const { longToken } = ETH_USD_MARKET;

const GM_SUPPLY = parseUnits("60000000", 18);
const GM_PRICE = bigMath.mulDiv(ETH_USD_MARKET.poolValueMax, parseUnits("1", 18), GM_SUPPLY);

const GM_TOKEN = {
  symbol: "GM",
  decimals: 18,
  address: ETH_USD_MARKET.marketTokenAddress,
  totalSupply: GM_SUPPLY,
  prices: { minPrice: GM_PRICE, maxPrice: GM_PRICE },
} as TokenData;

const GLV_TOKEN = {
  symbol: "GLV",
  decimals: 18,
  address: "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9",
  prices: { minPrice: parseUnits("1.4", 30), maxPrice: parseUnits("1.40014", 30) },
} as TokenData;

// USDT -> USDC with a 10 bps fee
const findSwapPath: FindSwapPath = (usdIn) => {
  const usdOut = usdIn - (usdIn * 10n) / 10_000n;

  return {
    swapPath: ["0x47c031236e19d024b42f8AE6780E44A573170703"],
    swapSteps: [],
    usdOut,
    amountOut: usdOut / 10n ** BigInt(30 - USDC_TOKEN.decimals),
    totalSwapFeeUsd: usdIn - usdOut,
    totalSwapPriceImpactDeltaUsd: 0n,
    totalFeesDeltaUsd: usdOut - usdIn,
    tokenInAddress: USDT_TOKEN.address,
    tokenOutAddress: USDC_TOKEN.address,
  } as unknown as SwapPathStats;
};

function getParams(p: { marketInfo: MarketInfo; long: boolean; short: boolean; isGlv?: boolean; isSwap?: boolean }) {
  return {
    marketInfo: p.marketInfo,
    marketToken: GM_TOKEN,
    longToken: p.marketInfo.longToken,
    shortToken: p.marketInfo.shortToken,
    includeLongToken: p.long,
    includeShortToken: p.short,
    uiFeeFactor: UI_FEE_FACTOR,
    swapFeeReceiverFactor: SWAP_FEE_RECEIVER_FACTOR,
    isMarketTokenDeposit: false,
    glvInfo: p.isGlv ? ({ glvToken: GLV_TOKEN } as GlvInfo) : undefined,
    glvToken: p.isGlv ? GLV_TOKEN : undefined,
    initialShortToken: p.isSwap ? USDT_TOKEN : undefined,
    findSwapPath: p.isSwap ? findSwapPath : undefined,
  };
}

// ExecuteDepositUtils without price impact: each leg mints against the pool value and supply the previous leg left
function getExecutedMintWithoutImpact(marketInfo: MarketInfo, legs: [TokenData, bigint][]) {
  let poolValue = marketInfo.poolValueMax;
  let supply = GM_SUPPLY;
  let mintAmount = 0n;

  for (const [token, amount] of legs) {
    const feeAmount = applyFactor(amount, DEPOSIT_FEE_FACTOR);
    const amountAfterFees = amount - feeAmount - applyFactor(amount, UI_FEE_FACTOR);
    const poolFeeAmount = feeAmount - applyFactor(feeAmount, SWAP_FEE_RECEIVER_FACTOR);
    const legMintAmount = bigMath.mulDiv(
      supply,
      convertToUsd(amountAfterFees, token.decimals, token.prices.minPrice)!,
      poolValue
    );

    mintAmount += legMintAmount;
    supply += legMintAmount;
    poolValue += convertToUsd(amountAfterFees + poolFeeAmount, token.decimals, token.prices.maxPrice)!;
  }

  return mintAmount;
}

describe("getDepositAmounts byMarketToken", () => {
  it.each([
    { name: "single-token GM with negative impact", impactSign: -1, receive: "600000", long: true, short: false },
    {
      name: "single-token GM with positive impact",
      impactSign: 1,
      receive: "600000",
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
      name: "GM paid through a collateral swap",
      impactSign: 1,
      receive: "60000",
      long: false,
      short: true,
      isSwap: true,
    },
    {
      name: "paired GM without impact",
      impactSign: 0,
      receive: "6000000",
      long: true,
      short: true,
      marketInfo: { swapImpactFactorPositive: 0n, swapImpactFactorNegative: 0n },
      prevLongTokenAmount: parseUnits("1150", longToken.decimals),
      prevShortTokenAmount: parseUnits("4600000", USDC_TOKEN.decimals),
    },
    {
      name: "skewed paired GM",
      impactSign: 1,
      receive: "3000",
      long: true,
      short: true,
      prevLongTokenAmount: parseUnits("0.01", longToken.decimals),
      prevShortTokenAmount: parseUnits("50000", USDC_TOKEN.decimals),
    },
    { name: "single-token GLV", impactSign: -1, receive: "600000", long: true, short: false, isGlv: true },
  ])("quotes $name from Receive that the submitted collateral mints TRD-21", (c) => {
    const marketInfo: MarketInfo = { ...ETH_USD_MARKET, ...c.marketInfo };
    const receiveAmount = parseUnits(c.receive, 18);
    const params = getParams({ marketInfo, long: c.long, short: c.short, isGlv: c.isGlv, isSwap: c.isSwap });
    const getQuote = (longTokenAmount: bigint, shortTokenAmount: bigint) =>
      getDepositAmounts({
        ...params,
        strategy: "byMarketToken",
        longTokenAmount,
        shortTokenAmount,
        marketTokenAmount: c.isGlv ? 0n : receiveAmount,
        glvTokenAmount: c.isGlv ? receiveAmount : 0n,
      });

    const quote = getQuote(c.prevLongTokenAmount ?? 0n, c.prevShortTokenAmount ?? 0n);
    const forwardQuote = getDepositAmounts({
      ...params,
      strategy: "byCollaterals",
      longTokenAmount: quote.longTokenAmount,
      shortTokenAmount: c.isSwap ? 0n : quote.shortTokenAmount,
      initialShortTokenAmount: quote.initialShortTokenAmount,
      marketTokenAmount: 0n,
    });

    const displayedReceive = c.isGlv ? quote.glvTokenAmount : quote.marketTokenAmount;
    let forwardReceive = forwardQuote.marketTokenAmount;

    if (c.isGlv) {
      // the GLV deposit mints the GM value over the maximized GLV value
      forwardReceive = convertToTokenAmount(
        forwardQuote.marketTokenUsd,
        GLV_TOKEN.decimals,
        GLV_TOKEN.prices.maxPrice
      )!;
    } else if (c.impactSign === 0) {
      forwardReceive = getExecutedMintWithoutImpact(marketInfo, [
        [longToken, quote.longTokenAmount],
        [USDC_TOKEN, quote.shortTokenAmount],
      ]);
    }
    const impactPoolUsd =
      convertToUsd(marketInfo.swapImpactPoolAmountLong, longToken.decimals, longToken.prices.maxPrice)! +
      convertToUsd(marketInfo.swapImpactPoolAmountShort, USDC_TOKEN.decimals, USDC_TOKEN.prices.maxPrice)!;

    expect(displayedReceive).toBe(receiveAmount);
    expect(forwardReceive).toBeGreaterThanOrEqual(displayedReceive);
    expect(forwardReceive).toBeLessThanOrEqual(displayedReceive + displayedReceive / 1_000_000n);
    expect(Math.sign(Number(quote.swapPriceImpactDeltaUsd))).toBe(c.impactSign);
    expect(quote.swapPriceImpactDeltaUsd).toBeLessThanOrEqual(impactPoolUsd);
    expect(quote.initialShortTokenAmount !== undefined).toBe(Boolean(c.isSwap));
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

    // the pay inputs filled from a paired quote set the split of the next one
    if (c.prevLongTokenAmount !== undefined) {
      const nextQuote = getQuote(quote.longTokenAmount, quote.shortTokenAmount);

      expect([nextQuote.longTokenAmount, nextQuote.shortTokenAmount]).toEqual([
        quote.longTokenAmount,
        quote.shortTokenAmount,
      ]);
    }
  });

  it.each(["1000", "1234.567", "0.000001", "31337.000000000000000001"])(
    "quotes GM to GLV from Receive %s with the GM that mints it back TRD-21",
    (receive) => {
      const params = getParams({ marketInfo: ETH_USD_MARKET, long: false, short: false, isGlv: true });
      const receiveAmount = parseUnits(receive, 18);
      const quote = getDepositAmounts({
        ...params,
        isMarketTokenDeposit: true,
        strategy: "byMarketToken",
        longTokenAmount: 0n,
        shortTokenAmount: 0n,
        marketTokenAmount: 0n,
        glvTokenAmount: receiveAmount,
      });
      const forwardQuote = getDepositAmounts({
        ...params,
        isMarketTokenDeposit: true,
        strategy: "byCollaterals",
        longTokenAmount: 0n,
        shortTokenAmount: 0n,
        marketTokenAmount: quote.marketTokenAmount,
        glvTokenAmount: 0n,
      });

      expect(quote.glvTokenAmount).toBe(receiveAmount);
      expect(forwardQuote.glvTokenAmount).toBeGreaterThanOrEqual(receiveAmount);
      expect(forwardQuote.glvTokenAmount - receiveAmount).toBeLessThanOrEqual(2n);
    }
  );

  it.each([
    { name: "just below the peak", receive: "1235000", isReachable: true },
    { name: "past the peak", receive: "5000000", isReachable: false },
    { name: "far past the peak", receive: "100000000000", isReachable: false },
  ])("quotes a Receive amount $name of what the pool can mint TRD-21", (c) => {
    // $1M balanced pool with 1000x the impact: mint peaks around 1.248M GM for about 624.6 ETH
    const marketInfo: MarketInfo = {
      ...ETH_USD_MARKET,
      longPoolAmount: parseUnits("125", 18),
      shortPoolAmount: parseUnits("500000", 6),
      virtualPoolAmountForLongToken: 0n,
      virtualPoolAmountForShortToken: 0n,
      poolValueMax: parseUnits("1000000", 30),
      poolValueMin: parseUnits("1000000", 30),
      maxLongPoolUsdForDeposit: parseUnits("100000000", 30),
      maxShortPoolUsdForDeposit: parseUnits("100000000", 30),
      swapImpactFactorNegative: ETH_USD_MARKET.swapImpactFactorNegative * 1000n,
    };
    const marketToken = {
      ...GM_TOKEN,
      totalSupply: parseUnits("1000000", 18),
      prices: { minPrice: USD, maxPrice: USD },
    };
    const params = { ...getParams({ marketInfo, long: true, short: false }), marketToken };
    const receiveAmount = parseUnits(c.receive, 18);
    const peakPay = parseUnits("624.6", 18);

    const quote = getDepositAmounts({
      ...params,
      strategy: "byMarketToken",
      longTokenAmount: 0n,
      shortTokenAmount: 0n,
      marketTokenAmount: receiveAmount,
    });
    const getMint = (longTokenAmount: bigint) =>
      getDepositAmounts({
        ...params,
        strategy: "byCollaterals",
        longTokenAmount,
        shortTokenAmount: 0n,
        marketTokenAmount: 0n,
      }).marketTokenAmount;
    const peakMint = getMint(peakPay);
    const validationError = getGmSwapError({
      ...quote,
      isDeposit: true,
      marketInfo,
      marketToken,
      payLongToken: longToken,
      payShortToken: USDC_TOKEN,
      glvToken: undefined,
      initialShortTokenAmount: undefined,
      longTokenLiquidityUsd: undefined,
      shortTokenLiquidityUsd: undefined,
      fees: undefined,
      priceImpactUsd: quote.swapPriceImpactDeltaUsd,
      paySource: "settlementChain",
      isPair: false,
      chainId: ARBITRUM,
      typedReceiveAmount: receiveAmount,
    }).buttonErrorMessage;

    if (c.isReachable) {
      // past the peak a larger pay mints the same, the quote must stay on the cheaper side
      expect(quote.marketTokenAmount).toBe(receiveAmount);
      expect(getMint(quote.longTokenAmount)).toBeGreaterThanOrEqual(receiveAmount);
      expect(quote.longTokenAmount).toBeLessThan(peakPay);
      expect(validationError).not.toMatch(/^Max receivable/);
    } else {
      expect(quote.marketTokenAmount).toBe(getMint(quote.longTokenAmount));
      expect(bigMath.abs(quote.marketTokenAmount - peakMint)).toBeLessThan(peakMint / 1000n);
      expect(validationError).toMatch(/^Max receivable ≈ 1,24\d,\d{3}\.\d+\s*GM$/);
    }
  });
});
