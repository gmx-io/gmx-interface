import { describe, expect, it, vi } from "vitest";

import { DecreasePositionSwapType } from "domain/synthetics/orders";
import { PositionInfoLoaded } from "domain/synthetics/positions";
import { expandDecimals } from "lib/numbers";
import { FindSwapPath } from "sdk/utils/trade/types";

import {
  USDC_TOKEN_FIXTURE,
  ETH_TOKEN_FIXTURE,
  WETH_TOKEN_FIXTURE,
  ARB_TOKEN_FIXTURE,
  MARKET_INFO_FIXTURE,
  POSITION_FIXTURE,
} from "./fixtures";
import {
  getOptimalDecreaseAndSwapAmounts,
  isThirdTokenDecreaseSwap,
  selectBetterDecreaseSwapType,
  getDecreaseSwapType,
} from "../../../../../../sdk/src/utils/trade/decrease";

const keepLeverage = false;
const isLong = true;
const minCollateralUsd = BigInt(100000);
const minPositionSizeUsd = BigInt(100000);
const uiFeeFactor = BigInt(0);

export function makeMockSwapPathStats(usdOut: bigint, amountOut: bigint) {
  return {
    swapPath: ["0xmarket1"],
    swapSteps: [],
    totalSwapPriceImpactDeltaUsd: 0n,
    totalSwapFeeUsd: 0n,
    totalFeesDeltaUsd: 0n,
    tokenInAddress: "0x00",
    tokenOutAddress: "0x01",
    usdOut,
    amountOut,
  };
}

export function makeMockFindSwapPath(usdOut: bigint, amountOut: bigint): FindSwapPath {
  return (_usdIn) => makeMockSwapPathStats(usdOut, amountOut);
}

export function makeNoPathFindSwapPath(): FindSwapPath {
  return (_usdIn) => undefined;
}

describe("selectBetterDecreaseSwapType", () => {
  it("returns pathB when pathB has higher usdOut", () => {
    expect(selectBetterDecreaseSwapType({ pathAUsdOut: 100n, pathBUsdOut: 200n })).toBe("pathB");
  });

  it("returns pathA when pathA has higher usdOut", () => {
    expect(selectBetterDecreaseSwapType({ pathAUsdOut: 200n, pathBUsdOut: 100n })).toBe("pathA");
  });

  it("returns pathA when both are equal", () => {
    expect(selectBetterDecreaseSwapType({ pathAUsdOut: 100n, pathBUsdOut: 100n })).toBe("pathA");
  });

  it("returns pathA when both are zero", () => {
    expect(selectBetterDecreaseSwapType({ pathAUsdOut: 0n, pathBUsdOut: 0n })).toBe("pathA");
  });

  it("returns pathB when pathA is zero and pathB is positive", () => {
    expect(selectBetterDecreaseSwapType({ pathAUsdOut: 0n, pathBUsdOut: 1n })).toBe("pathB");
  });
});

describe("isThirdTokenDecreaseSwap", () => {
  it("returns true when all three tokens are different", () => {
    expect(isThirdTokenDecreaseSwap(WETH_TOKEN_FIXTURE, USDC_TOKEN_FIXTURE, ARB_TOKEN_FIXTURE)).toBe(true);
  });

  it("returns false when receiveToken equals pnlToken", () => {
    expect(isThirdTokenDecreaseSwap(WETH_TOKEN_FIXTURE, USDC_TOKEN_FIXTURE, ETH_TOKEN_FIXTURE)).toBe(false);
  });

  it("returns false when receiveToken equals collateralToken", () => {
    expect(isThirdTokenDecreaseSwap(WETH_TOKEN_FIXTURE, USDC_TOKEN_FIXTURE, USDC_TOKEN_FIXTURE)).toBe(false);
  });

  it("returns false when pnlToken equals collateralToken", () => {
    expect(isThirdTokenDecreaseSwap(WETH_TOKEN_FIXTURE, ETH_TOKEN_FIXTURE, ARB_TOKEN_FIXTURE)).toBe(false);
  });

  it("returns false when all tokens are the same", () => {
    expect(isThirdTokenDecreaseSwap(ETH_TOKEN_FIXTURE, ETH_TOKEN_FIXTURE, ETH_TOKEN_FIXTURE)).toBe(false);
  });
});

describe("getDecreaseSwapType", () => {
  it("returns NoSwap when pnl equals collateral", () => {
    expect(getDecreaseSwapType(WETH_TOKEN_FIXTURE, ETH_TOKEN_FIXTURE, USDC_TOKEN_FIXTURE)).toBe(
      DecreasePositionSwapType.NoSwap
    );
  });

  it("returns SwapCollateralTokenToPnlToken when pnl equals receive", () => {
    expect(getDecreaseSwapType(WETH_TOKEN_FIXTURE, USDC_TOKEN_FIXTURE, ETH_TOKEN_FIXTURE)).toBe(
      DecreasePositionSwapType.SwapCollateralTokenToPnlToken
    );
  });

  it("returns SwapPnlTokenToCollateralToken otherwise", () => {
    expect(getDecreaseSwapType(WETH_TOKEN_FIXTURE, USDC_TOKEN_FIXTURE, ARB_TOKEN_FIXTURE)).toBe(
      DecreasePositionSwapType.SwapPnlTokenToCollateralToken
    );
  });
});

describe("getOptimalDecreaseAndSwapAmounts", () => {
  const baseDecreaseParams = {
    marketInfo: MARKET_INFO_FIXTURE,
    collateralToken: USDC_TOKEN_FIXTURE,
    isLong,
    position: POSITION_FIXTURE,
    closeSizeUsd: POSITION_FIXTURE.sizeInUsd,
    keepLeverage,
    userReferralInfo: undefined,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
    acceptablePriceImpactBuffer: 30,
    isSetAcceptablePriceImpactEnabled: true,
    marketsInfoData: undefined,
    chainId: 42161,
  };

  // Short ETH-collateral position: pnl token = USDC, position value = 0.25 ETH × $4000 = $1000
  const makeShortPositionEthCollateral = (sizeInUsd: bigint): PositionInfoLoaded => ({
    ...POSITION_FIXTURE,
    isLong: false,
    collateralToken: WETH_TOKEN_FIXTURE,
    collateralTokenAddress: WETH_TOKEN_FIXTURE.address,
    pnlToken: USDC_TOKEN_FIXTURE,
    sizeInUsd,
    sizeInTokens: expandDecimals(25, 16),
    collateralAmount: expandDecimals(1, 17),
    collateralUsd: expandDecimals(400, 30),
    pendingBorrowingFeesUsd: 0n,
    pendingFundingFeesUsd: 0n,
    fundingFeeAmount: 0n,
    pendingImpactAmount: 0n,
    pendingImpactUsd: 0n,
    markPrice: expandDecimals(4000, 30),
  });

  it("returns no swap when receiveToken equals collateralToken", () => {
    const result = getOptimalDecreaseAndSwapAmounts({
      ...baseDecreaseParams,
      receiveToken: USDC_TOKEN_FIXTURE,
      findSwapPath: makeNoPathFindSwapPath(),
      findSwapPathFromPnl: makeNoPathFindSwapPath(),
    });

    expect(result.swapAmounts).toBeUndefined();
    expect(result.decreaseAmounts.decreaseSwapType).toBe(DecreasePositionSwapType.SwapPnlTokenToCollateralToken);
  });

  it("returns pathA when not a third-token case (receive=pnl)", () => {
    const result = getOptimalDecreaseAndSwapAmounts({
      ...baseDecreaseParams,
      receiveToken: ETH_TOKEN_FIXTURE,
      findSwapPath: makeNoPathFindSwapPath(),
      findSwapPathFromPnl: makeNoPathFindSwapPath(),
    });

    expect(result.decreaseAmounts.decreaseSwapType).toBe(DecreasePositionSwapType.SwapCollateralTokenToPnlToken);
    expect(result.swapAmounts).toBeDefined();
    expect(result.swapAmounts!.usdOut).toBe(0n);
    expect(result.swapAmounts!.swapStrategy.swapPathStats).toBeUndefined();
  });

  it("picks pathA for third-token when pathA swap gives higher usdOut", () => {
    const pathAUsdOut = expandDecimals(500, 30);
    const pathBUsdOut = expandDecimals(400, 30);

    const findSwapPath = makeMockFindSwapPath(pathAUsdOut, expandDecimals(500, 18));
    const findSwapPathFromPnl = makeMockFindSwapPath(pathBUsdOut, expandDecimals(400, 18));

    const result = getOptimalDecreaseAndSwapAmounts({
      ...baseDecreaseParams,
      receiveToken: ARB_TOKEN_FIXTURE,
      findSwapPath,
      findSwapPathFromPnl,
    });

    expect(result.decreaseAmounts.decreaseSwapType).toBe(DecreasePositionSwapType.SwapPnlTokenToCollateralToken);
    expect(result.swapAmounts).toBeDefined();
    expect(result.swapAmounts!.usdOut).toBe(pathAUsdOut);
  });

  it("picks pathB for third-token when pathB swap gives higher usdOut", () => {
    const pathAUsdOut = expandDecimals(400, 30);
    const pathBUsdOut = expandDecimals(600, 30);

    const findSwapPath = makeMockFindSwapPath(pathAUsdOut, expandDecimals(400, 18));
    const findSwapPathFromPnl = makeMockFindSwapPath(pathBUsdOut, expandDecimals(600, 18));

    const result = getOptimalDecreaseAndSwapAmounts({
      ...baseDecreaseParams,
      receiveToken: ARB_TOKEN_FIXTURE,
      findSwapPath,
      findSwapPathFromPnl,
    });

    expect(result.decreaseAmounts.decreaseSwapType).toBe(DecreasePositionSwapType.SwapCollateralTokenToPnlToken);
    expect(result.swapAmounts).toBeDefined();
    expect(result.swapAmounts!.usdOut).toBe(pathBUsdOut);
  });

  it("falls back to pathA when pathB findSwapPath returns no path", () => {
    const pathAUsdOut = expandDecimals(500, 30);

    const result = getOptimalDecreaseAndSwapAmounts({
      ...baseDecreaseParams,
      receiveToken: ARB_TOKEN_FIXTURE,
      findSwapPath: makeMockFindSwapPath(pathAUsdOut, expandDecimals(500, 18)),
      findSwapPathFromPnl: makeNoPathFindSwapPath(),
    });

    expect(result.decreaseAmounts.decreaseSwapType).toBe(DecreasePositionSwapType.SwapPnlTokenToCollateralToken);
    expect(result.swapAmounts!.usdOut).toBe(pathAUsdOut);
  });

  it("falls back to pathA when both findSwapPaths return no path", () => {
    const result = getOptimalDecreaseAndSwapAmounts({
      ...baseDecreaseParams,
      receiveToken: ARB_TOKEN_FIXTURE,
      findSwapPath: makeNoPathFindSwapPath(),
      findSwapPathFromPnl: makeNoPathFindSwapPath(),
    });

    expect(result.decreaseAmounts.decreaseSwapType).toBe(DecreasePositionSwapType.SwapPnlTokenToCollateralToken);
  });

  it("uses forceDecreaseSwapType for pathB calculation", () => {
    const pathAUsdOut = expandDecimals(100, 30);
    const pathBUsdOut = expandDecimals(200, 30);

    const findSwapPathFromPnl = vi.fn().mockImplementation(makeMockFindSwapPath(pathBUsdOut, expandDecimals(200, 18)));

    const result = getOptimalDecreaseAndSwapAmounts({
      ...baseDecreaseParams,
      receiveToken: ARB_TOKEN_FIXTURE,
      findSwapPath: makeMockFindSwapPath(pathAUsdOut, expandDecimals(100, 18)),
      findSwapPathFromPnl,
    });

    expect(result.decreaseAmounts.decreaseSwapType).toBe(DecreasePositionSwapType.SwapCollateralTokenToPnlToken);
    expect(findSwapPathFromPnl).toHaveBeenCalled();
  });

  // Regression: negative PnL means no internal swap, so UI must add external swap (ETH→USDC)
  describe("short ETH-collateral position receiving pnl token (USDC)", () => {
    const shortBaseParams = {
      ...baseDecreaseParams,
      collateralToken: WETH_TOKEN_FIXTURE,
      isLong: false,
      keepLeverage: false,
    };

    it("negative PnL: primaryOutput has full amount and swap amounts are defined", () => {
      const position = makeShortPositionEthCollateral(expandDecimals(950, 30));

      const result = getOptimalDecreaseAndSwapAmounts({
        ...shortBaseParams,
        position,
        closeSizeUsd: position.sizeInUsd,
        receiveToken: USDC_TOKEN_FIXTURE,
        findSwapPath: makeMockFindSwapPath(expandDecimals(300, 30), expandDecimals(300, 8)),
        findSwapPathFromPnl: makeNoPathFindSwapPath(),
      });

      expect(result.decreaseAmounts.decreaseSwapType).toBe(DecreasePositionSwapType.SwapCollateralTokenToPnlToken);
      expect(result.decreaseAmounts.primaryOutput.amount).toBeGreaterThan(0n);
      expect(result.decreaseAmounts.primaryOutput.usd).toBeGreaterThan(0n);
      expect(result.decreaseAmounts.secondaryOutput.amount).toBe(0n);
      expect(result.decreaseAmounts.receiveTokenAmount).toBeGreaterThan(0n);
      expect(result.swapAmounts).toBeDefined();
      expect(result.swapAmounts!.usdOut).toBeGreaterThan(0n);
    });

    it("positive PnL: primaryOutput has full amount when receive=pnl", () => {
      const position = makeShortPositionEthCollateral(expandDecimals(1100, 30));

      const result = getOptimalDecreaseAndSwapAmounts({
        ...shortBaseParams,
        position,
        closeSizeUsd: position.sizeInUsd,
        receiveToken: USDC_TOKEN_FIXTURE,
        findSwapPath: makeMockFindSwapPath(expandDecimals(400, 30), expandDecimals(400, 8)),
        findSwapPathFromPnl: makeNoPathFindSwapPath(),
      });

      expect(result.decreaseAmounts.decreaseSwapType).toBe(DecreasePositionSwapType.SwapCollateralTokenToPnlToken);
      expect(result.decreaseAmounts.primaryOutput.amount).toBeGreaterThan(0n);
      expect(result.decreaseAmounts.primaryOutput.usd).toBeGreaterThan(0n);
      expect(result.decreaseAmounts.secondaryOutput.amount).toBe(0n);
      expect(result.swapAmounts).toBeDefined();
    });
  });
});
