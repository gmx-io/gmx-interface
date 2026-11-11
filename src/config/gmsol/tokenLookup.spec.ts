import { describe, expect, it } from "vitest";

import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { getIsEquivalentTokens } from "sdk/utils/tokens";

import { applyTopLevelFilter, applySubCategoryFilter } from "components/ChartTokenSelector/marketFilters";

import {
  convertGmsolTokenAddress,
  getGmsolNativeToken,
  getGmsolToken,
  getGmsolTokenBySymbol,
  getGmsolWrappedToken,
} from "./tokenLookup";

const WSOL_MINT = "So11111111111111111111111111111111111111112";
const INDEX_SOL_MINT = "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH";
const BTC_MINT = "BtcTQYRj7HRRk7MwnWiTFj8rWqN2ALt2QYig4cSWqTbv";
const WBTC_MINT = "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("gmsol token lookup", () => {
  it("includes Solana ETH in Crypto and Layer 1 using native ETH metadata", () => {
    const eth = getGmsolTokenBySymbol("ETH")!;
    const crypto = applyTopLevelFilter([eth], { topLevelTab: "crypto", favoriteAddresses: [] });
    expect(crypto).toEqual([eth]);
    expect(applySubCategoryFilter(crypto, { topLevelTab: "crypto", subCategoryTab: "layer1" })).toEqual([eth]);
  });

  it("keeps base58 case, native SOL and collateral twins", () => {
    expect(getGmsolToken(USDC_MINT)?.symbol).toBe("USDC");
    expect(getGmsolToken(USDC_MINT.replace(/^E/, "e"))).toBeUndefined();

    const native = getGmsolNativeToken();
    const wrapped = getGmsolWrappedToken();
    const indexSol = getGmsolTokenBySymbol("SOL");

    expect(getGmsolToken(NATIVE_TOKEN_ADDRESS)).toBe(native);
    expect(wrapped.address).toBe(WSOL_MINT);
    expect(indexSol?.address).toBe(INDEX_SOL_MINT);
    expect(indexSol?.isNative).toBeUndefined();

    const equivalentPairs: [string, string][] = [
      [NATIVE_TOKEN_ADDRESS, WSOL_MINT],
      [INDEX_SOL_MINT, WSOL_MINT],
      [BTC_MINT, WBTC_MINT],
    ];
    for (const [a, b] of equivalentPairs) {
      expect(getIsEquivalentTokens(getGmsolToken(a)!, getGmsolToken(b)!)).toBe(true);
    }

    const conversions: [string, "wrapped" | "native", string][] = [
      [NATIVE_TOKEN_ADDRESS, "wrapped", WSOL_MINT],
      [WSOL_MINT, "native", NATIVE_TOKEN_ADDRESS],
      [INDEX_SOL_MINT, "wrapped", INDEX_SOL_MINT],
      [WSOL_MINT.replace(/^S/, "s"), "native", WSOL_MINT.replace(/^S/, "s")],
    ];
    for (const [address, convertTo, expected] of conversions) {
      expect(convertGmsolTokenAddress(address, convertTo)).toBe(expected);
    }
  });
});
