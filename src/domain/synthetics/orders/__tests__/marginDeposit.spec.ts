import { maxUint256 } from "viem";
import { describe, expect, it } from "vitest";

import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { expandDecimals } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";

import { getMarginDepositProjections, getMarginDepositRiskLevel, isMarginDepositOrder } from "../marginDeposit";
import { OrderType } from "../types";

const tokensData = mockTokensData();
const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"]);
const marketInfo = marketsInfoData["ETH-ETH-USDC"];

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const MIN_COLLATERAL_USD = expandDecimals(10, 30);

const usd = (value: number) => expandDecimals(value, 30);

describe("isMarginDepositOrder", () => {
  it("detects a zero-size Limit Increase with a positive collateral delta", () => {
    expect(
      isMarginDepositOrder({
        orderType: OrderType.LimitIncrease,
        sizeDeltaUsd: 0n,
        initialCollateralDeltaAmount: expandDecimals(100, 6),
      })
    ).toBe(true);
  });

  it("rejects a zero-size Market Increase", () => {
    expect(
      isMarginDepositOrder({
        orderType: OrderType.MarketIncrease,
        sizeDeltaUsd: 0n,
        initialCollateralDeltaAmount: expandDecimals(100, 6),
      })
    ).toBe(false);
  });

  it("rejects a Limit Increase that also changes size", () => {
    expect(
      isMarginDepositOrder({
        orderType: OrderType.LimitIncrease,
        sizeDeltaUsd: usd(1000),
        initialCollateralDeltaAmount: expandDecimals(100, 6),
      })
    ).toBe(false);
  });

  it("rejects a Limit Increase without collateral", () => {
    expect(
      isMarginDepositOrder({
        orderType: OrderType.LimitIncrease,
        sizeDeltaUsd: 0n,
        initialCollateralDeltaAmount: 0n,
      })
    ).toBe(false);
  });

  it("rejects TWAP orders when the flag is provided", () => {
    expect(
      isMarginDepositOrder({
        orderType: OrderType.LimitIncrease,
        sizeDeltaUsd: 0n,
        initialCollateralDeltaAmount: expandDecimals(100, 6),
        isTwap: true,
      })
    ).toBe(false);
  });
});

function makePosition(collateralTokenAddress: string, overrides = {}) {
  return mockPositionInfo(
    {
      marketInfo,
      collateralTokenAddress,
      account: ACCOUNT,
      isLong: true,
      sizeInUsd: usd(10_000),
      collateralUsd: usd(2_000),
    },
    overrides
  );
}

const baseProjectionParams = {
  minCollateralUsd: MIN_COLLATERAL_USD,
  userReferralInfo: undefined,
  pendingFeesUsd: 0n,
};

describe("getMarginDepositProjections", () => {
  it("values index-token collateral at the trigger price", () => {
    // ETH collateral in an ETH market, current price $1200, trigger $1000
    const projections = getMarginDepositProjections({
      ...baseProjectionParams,
      position: makePosition(marketInfo.longToken.address),
      depositAmount: expandDecimals(1, 18),
      triggerPrice: usd(1000),
    });

    expect(projections?.depositUsdAtTrigger).toBe(usd(1000));
  });

  it("values stable collateral at its current price, ignoring the trigger", () => {
    const projections = getMarginDepositProjections({
      ...baseProjectionParams,
      position: makePosition(marketInfo.shortToken.address),
      depositAmount: expandDecimals(1000, 6),
      triggerPrice: usd(1000),
    });

    expect(projections?.depositUsdAtTrigger).toBe(usd(1000));
  });

  it("adds the deposit to the collateral", () => {
    const projections = getMarginDepositProjections({
      ...baseProjectionParams,
      position: makePosition(marketInfo.shortToken.address),
      depositAmount: expandDecimals(1000, 6),
      triggerPrice: usd(1000),
    });

    expect(projections?.nextCollateralUsd).toBe(usd(3_000));
  });

  it("subtracts pending fees from the projected collateral", () => {
    const projections = getMarginDepositProjections({
      ...baseProjectionParams,
      pendingFeesUsd: usd(50),
      position: makePosition(marketInfo.shortToken.address),
      depositAmount: expandDecimals(1000, 6),
      triggerPrice: usd(1000),
    });

    expect(projections?.nextCollateralUsd).toBe(usd(2_950));
  });

  it("lowers leverage and the liquidation price of a long as the deposit grows", () => {
    const position = makePosition(marketInfo.shortToken.address);

    const small = getMarginDepositProjections({
      ...baseProjectionParams,
      position,
      depositAmount: expandDecimals(100, 6),
      triggerPrice: usd(1000),
    });

    const large = getMarginDepositProjections({
      ...baseProjectionParams,
      position,
      depositAmount: expandDecimals(1000, 6),
      triggerPrice: usd(1000),
    });

    expect(large!.nextLeverage!).toBeLessThan(small!.nextLeverage!);
    expect(large!.nextLiqPrice!).toBeLessThan(small!.nextLiqPrice!);
  });

  it("supports pnl in leverage", () => {
    const position = makePosition(marketInfo.shortToken.address);

    const withPnl = getMarginDepositProjections({
      ...baseProjectionParams,
      position,
      depositAmount: expandDecimals(1000, 6),
      triggerPrice: usd(1000),
      isPnlInLeverage: true,
    });

    const withoutPnl = getMarginDepositProjections({
      ...baseProjectionParams,
      position,
      depositAmount: expandDecimals(1000, 6),
      triggerPrice: usd(1000),
    });

    // the trigger is below the entry price, so the long is at a loss and leverage is higher
    expect(withPnl!.nextLeverage!).toBeGreaterThan(withoutPnl!.nextLeverage!);
  });

  it("returns undefined without positions constants", () => {
    const projections = getMarginDepositProjections({
      ...baseProjectionParams,
      minCollateralUsd: undefined,
      position: makePosition(marketInfo.shortToken.address),
      depositAmount: expandDecimals(1000, 6),
      triggerPrice: usd(1000),
    });

    expect(projections).toBeUndefined();
  });
});

describe("getMarginDepositRiskLevel", () => {
  const longBase = { isLong: true, currentLiqPrice: usd(1100), nextLiqPrice: usd(900) };

  it("returns undefined when the trigger clears both liquidation prices (long)", () => {
    expect(getMarginDepositRiskLevel({ ...longBase, triggerPrice: usd(1200) })).toBeUndefined();
  });

  it("flags beyondCurrentLiq at the current liquidation price (long, inclusive)", () => {
    expect(getMarginDepositRiskLevel({ ...longBase, triggerPrice: usd(1100) })).toBe("beyondCurrentLiq");
  });

  it("flags beyondCurrentLiq below the current liquidation price (long)", () => {
    expect(getMarginDepositRiskLevel({ ...longBase, triggerPrice: usd(1000) })).toBe("beyondCurrentLiq");
  });

  it("flags insufficient at the next liquidation price (long, inclusive)", () => {
    expect(getMarginDepositRiskLevel({ ...longBase, triggerPrice: usd(900) })).toBe("insufficient");
  });

  it("prefers insufficient over beyondCurrentLiq (long)", () => {
    expect(getMarginDepositRiskLevel({ ...longBase, triggerPrice: usd(800) })).toBe("insufficient");
  });

  const shortBase = { isLong: false, currentLiqPrice: usd(900), nextLiqPrice: usd(1100) };

  it("returns undefined when the trigger clears both liquidation prices (short)", () => {
    expect(getMarginDepositRiskLevel({ ...shortBase, triggerPrice: usd(800) })).toBeUndefined();
  });

  it("flags beyondCurrentLiq at the current liquidation price (short, inclusive)", () => {
    expect(getMarginDepositRiskLevel({ ...shortBase, triggerPrice: usd(900) })).toBe("beyondCurrentLiq");
  });

  it("flags insufficient at the next liquidation price (short, inclusive)", () => {
    expect(getMarginDepositRiskLevel({ ...shortBase, triggerPrice: usd(1100) })).toBe("insufficient");
  });

  it("prefers insufficient over beyondCurrentLiq (short)", () => {
    expect(getMarginDepositRiskLevel({ ...shortBase, triggerPrice: usd(1200) })).toBe("insufficient");
  });

  it("returns undefined without a trigger price", () => {
    expect(getMarginDepositRiskLevel({ ...longBase, triggerPrice: undefined })).toBeUndefined();
    expect(getMarginDepositRiskLevel({ ...longBase, triggerPrice: 0n })).toBeUndefined();
  });

  it("ignores missing and sentinel liquidation prices", () => {
    expect(
      getMarginDepositRiskLevel({
        isLong: true,
        triggerPrice: usd(1000),
        currentLiqPrice: undefined,
        nextLiqPrice: undefined,
      })
    ).toBeUndefined();

    expect(
      getMarginDepositRiskLevel({
        isLong: true,
        triggerPrice: usd(1000),
        currentLiqPrice: maxUint256,
        nextLiqPrice: maxUint256,
      })
    ).toBeUndefined();

    expect(
      getMarginDepositRiskLevel({ isLong: true, triggerPrice: usd(1000), currentLiqPrice: 0n, nextLiqPrice: 0n })
    ).toBeUndefined();
  });
});
