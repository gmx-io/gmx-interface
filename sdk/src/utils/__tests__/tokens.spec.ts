import { describe, expect, it } from "vitest";

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
} from "../tokens";
import { expandDecimals, PRECISION } from "../numbers";
import { TOKENS } from "configs/tokens";
import { ARBITRUM } from "configs/chains";
import { Token, TokensData } from "types/tokens";

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
  it("returns ratio of two token amounts", () => {
    const fromToken = { decimals: 2 } as Token;
    const toToken = { decimals: 2 } as Token;
    const result = getTokensRatioByAmounts({
      fromToken,
      toToken,
      fromTokenAmount: 1000n,
      toTokenAmount: 500n,
    });
    expect(result.largestToken).toEqual(fromToken);
    expect(result.ratio).toBe(
      (((1000n * PRECISION) / expandDecimals(1, 2)) * PRECISION) / ((500n * PRECISION) / expandDecimals(1, 2))
    );
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
