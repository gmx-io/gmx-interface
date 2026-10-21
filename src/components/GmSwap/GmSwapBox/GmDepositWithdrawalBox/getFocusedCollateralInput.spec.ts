import { describe, expect, it } from "vitest";

import { ARBITRUM } from "sdk/configs/chainIds";
import { getTokenBySymbol, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { getFocusedCollateralInput } from "./getFocusedCollateralInput";

const weth = getTokenBySymbol(ARBITRUM, "WETH");
const usdc = getTokenBySymbol(ARBITRUM, "USDC");
const glvWethUsdc = { isSameCollaterals: false, longToken: weth, shortToken: usdc };

describe("getFocusedCollateralInput", () => {
  it("focuses the side of the pay token's pool token", () => {
    expect(getFocusedCollateralInput(glvWethUsdc, weth.address)).toBe("first");
    expect(getFocusedCollateralInput(glvWethUsdc, NATIVE_TOKEN_ADDRESS)).toBe("first");
    expect(getFocusedCollateralInput(glvWethUsdc, usdc.address)).toBe("second");
  });

  it("focuses the first input of a same-collateral pool", () => {
    expect(
      getFocusedCollateralInput({ isSameCollaterals: true, longToken: weth, shortToken: weth }, weth.address)
    ).toBe("first");
  });

  it("leaves the focus alone without a market or GLV", () => {
    expect(getFocusedCollateralInput(undefined, weth.address)).toBeUndefined();
  });
});
