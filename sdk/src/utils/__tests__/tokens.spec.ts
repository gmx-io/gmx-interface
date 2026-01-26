import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chains";
import { TOKENS } from "configs/tokens";
import { Token, TokensData } from "types/tokens";

import { expandDecimals, PRECISION } from "../numbers";
import {
  parseContractPrice,
  convertToContractPrice,
  convertToContractTokenPrices,
  convertToTokenAmount,
  convertToUsd,
  getMidPrice,
  getIsEquivalentTokens,
  getTokenData,
  getTokensRatioByAmounts,
  getTokensRatioByMinOutputAmountAndTriggerPrice,
  getTokensRatioByPrice,
} from "../tokens";

function getToken(symbol: string) {
  return TOKENS[ARBITRUM].find((token) => token.symbol === symbol) as Token;
}

describe("parseContractPrice", () => {
  it("multiplies price by 10^decimals", () => {
    expect(parseContractPrice(100n, 2)).toBe(100n * expandDecimals(1, 2));
  });
});

describe("convertToContractPrice", () => {
  it("divides price by 10^decimals", () => {
    expect(convertToContractPrice(10000n, 2)).toBe(10000n / expandDecimals(1, 2));
  });
});

describe("convertToContractTokenPrices", () => {
  it("returns min and max contract prices", () => {
    const result = convertToContractTokenPrices({ minPrice: 1000n, maxPrice: 2000n }, 2);
    expect(result.min).toBe(1000n / expandDecimals(1, 2));
    expect(result.max).toBe(2000n / expandDecimals(1, 2));
  });
});

describe("convertToTokenAmount", () => {
  it("returns undefined if inputs are invalid", () => {
    expect(convertToTokenAmount(undefined, 18, 100n)).toBeUndefined();
    expect(convertToTokenAmount(1000n, undefined, 100n)).toBeUndefined();
    expect(convertToTokenAmount(1000n, 18, 0n)).toBeUndefined();
  });
  it("converts usd to token amount", () => {
    expect(convertToTokenAmount(1000n, 2, 100n)).toBe((1000n * expandDecimals(1, 2)) / 100n);
  });
});

describe("convertToUsd", () => {
  it("returns undefined if inputs are invalid", () => {
    expect(convertToUsd(undefined, 18, 100n)).toBeUndefined();
    expect(convertToUsd(1000n, undefined, 100n)).toBeUndefined();
  });
  it("converts token amount to usd", () => {
    expect(convertToUsd(1000n, 2, 100n)).toBe((1000n * 100n) / expandDecimals(1, 2));
  });
});

describe("getMidPrice", () => {
  it("returns the average of min and max price", () => {
    expect(getMidPrice({ minPrice: 10n, maxPrice: 20n })).toBe(15n);
  });
});

describe("getIsEquivalentTokens", () => {
  it("checks address, wrappedAddress, synthetic, and symbol", () => {
    expect(getIsEquivalentTokens(getToken("ETH"), getToken("WETH"))).toBe(true);
    expect(getIsEquivalentTokens(getToken("ETH"), getToken("ETH"))).toBe(true);
    expect(
      getIsEquivalentTokens(
        { address: "0xA", isSynthetic: true, symbol: "SYN" } as Token,
        { address: "0xB", isSynthetic: true, symbol: "SYN" } as Token
      )
    ).toBe(true);
    expect(getIsEquivalentTokens(getToken("ETH"), getToken("BTC"))).toBe(false);
  });
});

describe("getTokenData", () => {
  it("returns undefined if no token data", () => {
    expect(getTokenData()).toBeUndefined();
  });
  it("returns wrapped if convertTo=wrapped and token isNative", () => {
    const tokensData = {
      "0xnative": { address: "0xnative", isNative: true, wrappedAddress: "0xwrap" },
      "0xwrap": { address: "0xwrap", isWrapped: true },
    } as unknown as TokensData;
    expect(getTokenData(tokensData, "0xnative", "wrapped")).toEqual(tokensData["0xwrap"]);
  });
});

describe("getTokensRatioByAmounts", () => {
  it("for non-stablecoin pairs: returns ratio of two token amounts", () => {
    const fromToken = { decimals: 2, isStable: false } as Token;
    const toToken = { decimals: 2, isStable: false } as Token;
    const result = getTokensRatioByAmounts({
      fromToken,
      toToken,
      fromTokenAmount: 1000n,
      toTokenAmount: 500n,
    });
    expect(result.largestToken).toEqual(toToken);
    expect(result.ratio).toBe(
      (((1000n * PRECISION) / expandDecimals(1, 2)) * PRECISION) / ((500n * PRECISION) / expandDecimals(1, 2))
    );
  });

  it("for non-stablecoin pairs: largestToken flips when amounts flip", () => {
    const tokenA = { symbol: "A", decimals: 6, isStable: false } as Token;
    const tokenB = { symbol: "B", decimals: 6, isStable: false } as Token;

    const result1 = getTokensRatioByAmounts({
      fromToken: tokenA,
      toToken: tokenB,
      fromTokenAmount: 1000n,
      toTokenAmount: 500n,
    });
    expect(result1.largestToken).toBe(tokenB);

    const result2 = getTokensRatioByAmounts({
      fromToken: tokenA,
      toToken: tokenB,
      fromTokenAmount: 500n,
      toTokenAmount: 1000n,
    });
    expect(result2.largestToken).toBe(tokenA);
  });

  it("for stablecoin pairs: largestToken is always toToken (fixed order)", () => {
    const usdcToken = { symbol: "USDC", decimals: 6, isStable: true } as Token;
    const usdtToken = { symbol: "USDT", decimals: 6, isStable: true } as Token;

    const result1 = getTokensRatioByAmounts({
      fromToken: usdcToken,
      toToken: usdtToken,
      fromTokenAmount: expandDecimals(100n, 6),
      toTokenAmount: expandDecimals(99n, 6),
    });

    expect(result1.largestToken).toBe(usdtToken);
    expect(result1.smallestToken).toBe(usdcToken);

    const result2 = getTokensRatioByAmounts({
      fromToken: usdcToken,
      toToken: usdtToken,
      fromTokenAmount: expandDecimals(99n, 6),
      toTokenAmount: expandDecimals(100n, 6),
    });

    expect(result2.largestToken).toBe(usdtToken);
    expect(result2.smallestToken).toBe(usdcToken);
  });

  it("for stablecoin pairs: ratio = fromAmount / toAmount", () => {
    const usdcToken = { symbol: "USDC", decimals: 6, isStable: true } as Token;
    const usdtToken = { symbol: "USDT", decimals: 6, isStable: true } as Token;

    const fromAmount = expandDecimals(100n, 6);
    const toAmount = expandDecimals(99n, 6);

    const result = getTokensRatioByAmounts({
      fromToken: usdcToken,
      toToken: usdtToken,
      fromTokenAmount: fromAmount,
      toTokenAmount: toAmount,
    });

    const adjustedFromAmount = (fromAmount * PRECISION) / expandDecimals(1, 6);
    const adjustedToAmount = (toAmount * PRECISION) / expandDecimals(1, 6);
    const expectedRatio = (adjustedFromAmount * PRECISION) / adjustedToAmount;
    expect(result.ratio).toBe(expectedRatio);
  });

  it("for stablecoin pairs: swapping from/to order changes the result", () => {
    const usdcToken = { symbol: "USDC", decimals: 6, isStable: true } as Token;
    const usdtToken = { symbol: "USDT", decimals: 6, isStable: true } as Token;

    const usdcAmount = expandDecimals(100n, 6);
    const usdtAmount = expandDecimals(99n, 6);

    const result1 = getTokensRatioByAmounts({
      fromToken: usdcToken,
      toToken: usdtToken,
      fromTokenAmount: usdcAmount,
      toTokenAmount: usdtAmount,
    });

    const result2 = getTokensRatioByAmounts({
      fromToken: usdtToken,
      toToken: usdcToken,
      fromTokenAmount: usdtAmount,
      toTokenAmount: usdcAmount,
    });

    expect(result1.largestToken).toBe(usdtToken);
    expect(result2.largestToken).toBe(usdcToken);
  });
});

describe("getTokensRatioByMinOutputAmountAndTriggerPrice", () => {
  it("returns ratio of two token amounts in case if triggerPrice is 0n", () => {
    const fromToken = { decimals: 2 } as Token;
    const toToken = { decimals: 2 } as Token;
    const result = getTokensRatioByMinOutputAmountAndTriggerPrice({
      fromToken,
      toToken,
      fromTokenAmount: 1000n,
      toTokenAmount: 500n,
      triggerPrice: 0n,
      minOutputAmount: 100n,
    });
    expect(result.ratio).toBe(10000000000000000000000000000000n);
    expect(result.allowedSwapSlippageBps).toBe(100n);
  });
  it("returns ratio of two token amounts in case if triggerPrice is not 0n", () => {
    const fromToken = { decimals: 2 } as Token;
    const toToken = { decimals: 2 } as Token;
    const result = getTokensRatioByMinOutputAmountAndTriggerPrice({
      fromToken,
      toToken,
      fromTokenAmount: 1000n,
      toTokenAmount: 500n,
      triggerPrice: 100n,
      minOutputAmount: 100n,
    });
    expect(result.ratio).toBe(100n);
    expect(result.allowedSwapSlippageBps).toBe(9999n);
  });
});

describe("getTokensRatioByPrice", () => {
  it("for non-stablecoin pairs: largestToken is determined by price", () => {
    const ethToken = { symbol: "ETH", isStable: false } as Token;
    const usdcToken = { symbol: "USDC", isStable: true } as Token;

    const result = getTokensRatioByPrice({
      fromToken: ethToken,
      toToken: usdcToken,
      fromPrice: 2000n * PRECISION,
      toPrice: 1n * PRECISION,
    });

    expect(result.largestToken).toBe(ethToken);
    expect(result.smallestToken).toBe(usdcToken);
    expect(result.ratio).toBe((2000n * PRECISION * PRECISION) / (1n * PRECISION));
  });

  it("for non-stablecoin pairs: largestToken flips when prices flip", () => {
    const tokenA = { symbol: "A", isStable: false } as Token;
    const tokenB = { symbol: "B", isStable: false } as Token;

    const result1 = getTokensRatioByPrice({
      fromToken: tokenA,
      toToken: tokenB,
      fromPrice: 100n * PRECISION,
      toPrice: 50n * PRECISION,
    });
    expect(result1.largestToken).toBe(tokenA);

    const result2 = getTokensRatioByPrice({
      fromToken: tokenA,
      toToken: tokenB,
      fromPrice: 50n * PRECISION,
      toPrice: 100n * PRECISION,
    });
    expect(result2.largestToken).toBe(tokenB);
  });

  it("for stablecoin pairs: largestToken is always toToken (fixed order)", () => {
    const usdcToken = { symbol: "USDC", isStable: true } as Token;
    const usdtToken = { symbol: "USDT", isStable: true } as Token;

    const result1 = getTokensRatioByPrice({
      fromToken: usdcToken,
      toToken: usdtToken,
      fromPrice: expandDecimals(1001n, 27),
      toPrice: expandDecimals(999n, 27),
    });

    expect(result1.largestToken).toBe(usdtToken);
    expect(result1.smallestToken).toBe(usdcToken);

    const result2 = getTokensRatioByPrice({
      fromToken: usdcToken,
      toToken: usdtToken,
      fromPrice: expandDecimals(999n, 27),
      toPrice: expandDecimals(1001n, 27),
    });

    expect(result2.largestToken).toBe(usdtToken);
    expect(result2.smallestToken).toBe(usdcToken);
  });

  it("for stablecoin pairs: ratio = toPrice / fromPrice", () => {
    const usdcToken = { symbol: "USDC", isStable: true } as Token;
    const usdtToken = { symbol: "USDT", isStable: true } as Token;

    const fromPrice = expandDecimals(1001n, 27);
    const toPrice = expandDecimals(999n, 27);

    const result = getTokensRatioByPrice({
      fromToken: usdcToken,
      toToken: usdtToken,
      fromPrice,
      toPrice,
    });

    const expectedRatio = (toPrice * PRECISION) / fromPrice;
    expect(result.ratio).toBe(expectedRatio);
  });

  it("for stablecoin pairs: swapping from/to order changes the result", () => {
    const usdcToken = { symbol: "USDC", isStable: true } as Token;
    const usdtToken = { symbol: "USDT", isStable: true } as Token;

    const usdcPrice = expandDecimals(1001n, 27);
    const usdtPrice = expandDecimals(999n, 27);

    const result1 = getTokensRatioByPrice({
      fromToken: usdcToken,
      toToken: usdtToken,
      fromPrice: usdcPrice,
      toPrice: usdtPrice,
    });

    const result2 = getTokensRatioByPrice({
      fromToken: usdtToken,
      toToken: usdcToken,
      fromPrice: usdtPrice,
      toPrice: usdcPrice,
    });

    expect(result1.largestToken).toBe(usdtToken);
    expect(result2.largestToken).toBe(usdcToken);
    expect(result1.ratio).toBe((usdtPrice * PRECISION) / usdcPrice);
    expect(result2.ratio).toBe((usdcPrice * PRECISION) / usdtPrice);
  });
});
