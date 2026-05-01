import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { expandDecimals } from "lib/numbers";
import type { TokenData } from "sdk/utils/tokens/types";

import { useSizeConversion } from "../useSizeConversion";

type HookResult = ReturnType<typeof useSizeConversion>;

function Harness({
  toToken,
  markPrice,
  onResult,
}: {
  toToken: TokenData | undefined;
  markPrice: bigint | undefined;
  onResult: (r: HookResult) => void;
}) {
  const result = useSizeConversion({ toToken, markPrice });
  onResult(result);
  return null;
}

function setup(toToken: TokenData | undefined, markPrice: bigint | undefined): HookResult {
  let captured!: HookResult;
  render(<Harness toToken={toToken} markPrice={markPrice} onResult={(r) => (captured = r)} />);
  return captured;
}

const ETH_TOKEN = { decimals: 18, visualMultiplier: 1 } as TokenData;
const USDC_TOKEN = { decimals: 6, visualMultiplier: 1 } as TokenData;
const TOKEN_10X = { decimals: 18, visualMultiplier: 10 } as TokenData;

describe("useSizeConversion", () => {
  afterEach(cleanup);

  describe("canConvert", () => {
    it("is false when toToken is undefined", () => {
      expect(setup(undefined, expandDecimals(2000, 30)).canConvert).toBe(false);
    });

    it("is false when markPrice is undefined", () => {
      expect(setup(ETH_TOKEN, undefined).canConvert).toBe(false);
    });

    it("is false when markPrice is 0n", () => {
      expect(setup(ETH_TOKEN, 0n).canConvert).toBe(false);
    });

    it("is true when both are present", () => {
      expect(setup(ETH_TOKEN, expandDecimals(2000, 30)).canConvert).toBe(true);
    });
  });

  describe("tokensToUsd", () => {
    it("converts 1.5 ETH at $2000 to $3000.00", () => {
      const { tokensToUsd } = setup(ETH_TOKEN, expandDecimals(2000, 30));
      expect(tokensToUsd("1.5").replace(/,/g, "")).toBe("3000.00");
    });

    it('returns "" when canConvert is false', () => {
      const { tokensToUsd } = setup(undefined, expandDecimals(2000, 30));
      expect(tokensToUsd("1.5")).toBe("");
    });

    it('returns "" when input cannot be parsed', () => {
      const { tokensToUsd } = setup(ETH_TOKEN, expandDecimals(2000, 30));
      expect(tokensToUsd("abc")).toBe("");
    });

    it("handles visualMultiplier > 1", () => {
      const { tokensToUsd } = setup(TOKEN_10X, expandDecimals(2000, 30));
      expect(tokensToUsd("1.5").replace(/,/g, "")).toBe("30000.00");
    });

    it("handles 6-decimal tokens (USDC-like)", () => {
      const { tokensToUsd } = setup(USDC_TOKEN, expandDecimals(1, 30));
      expect(tokensToUsd("1000").replace(/,/g, "")).toBe("1000.00");
    });

    it("handles very large token amounts", () => {
      const { tokensToUsd } = setup(ETH_TOKEN, expandDecimals(2000, 30));
      expect(tokensToUsd("999999")).toBeTruthy();
    });
  });

  describe("usdToTokens", () => {
    it("converts $3000 at $2000/ETH to 1.5", () => {
      const { usdToTokens } = setup(ETH_TOKEN, expandDecimals(2000, 30));
      expect(usdToTokens("3000")).toBe("1.5");
    });

    it('returns "" when canConvert is false', () => {
      const { usdToTokens } = setup(undefined, expandDecimals(2000, 30));
      expect(usdToTokens("3000")).toBe("");
    });

    it('returns "" for empty string input', () => {
      const { usdToTokens } = setup(ETH_TOKEN, expandDecimals(2000, 30));
      expect(usdToTokens("")).toBe("");
    });

    it("respects TOKEN_INPUT_DISPLAY_DECIMALS (8) precision", () => {
      const { usdToTokens } = setup(ETH_TOKEN, expandDecimals(3, 30));
      const tokens = usdToTokens("1");
      const parts = tokens.split(".");
      if (parts.length === 2) {
        expect(parts[1].length).toBeLessThanOrEqual(8);
      }
    });

    it("handles visualMultiplier in formatting", () => {
      const { usdToTokens } = setup(TOKEN_10X, expandDecimals(2000, 30));
      expect(usdToTokens("3000")).toBeTruthy();
    });
  });
});
