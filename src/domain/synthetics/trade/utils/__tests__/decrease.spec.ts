// @vitest-shared-worker
import { describe, expect, it } from "vitest";

import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import type { PositionInfoLoaded } from "domain/synthetics/positions";
import { convertToTokenAmount } from "domain/synthetics/tokens";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockPositionInfo } from "domain/testUtils/mockPositionInfo";
import { MOCK_ACCOUNT } from "domain/testUtils/mockSyntheticsState";
import { ETH_TOKEN, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";

import {
  USDC_TOKEN_FIXTURE,
  ETH_TOKEN_FIXTURE,
  WETH_TOKEN_FIXTURE,
  MARKET_INFO_FIXTURE,
  POSITION_FIXTURE,
} from "./fixtures";
import { getDecreasePositionAmounts } from "../../../../../../sdk/src/utils/trade/decrease";

const closeSizeUsd = BigInt(99);
const keepLeverage = false;
const isLong = true;
const minCollateralUsd = BigInt(100000);
const minPositionSizeUsd = BigInt(100000);
const uiFeeFactor = BigInt(0);

describe("getDecreasePositionAmounts DecreasePositionSwapType", () => {
  it("usdc collateral", () => {
    const amounts = getDecreasePositionAmounts({
      closeSizeUsd,
      collateralToken: USDC_TOKEN_FIXTURE,
      position: POSITION_FIXTURE,
      keepLeverage,
      isLong,
      marketInfo: MARKET_INFO_FIXTURE,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
      isSetAcceptablePriceImpactEnabled: true,
    });
    expect(amounts.decreaseSwapType).toEqual(DecreasePositionSwapType.SwapPnlTokenToCollateralToken);
  });

  it("eth collateral", () => {
    const amounts = getDecreasePositionAmounts({
      closeSizeUsd,
      collateralToken: ETH_TOKEN_FIXTURE,
      position: POSITION_FIXTURE,
      keepLeverage,
      isLong,
      marketInfo: MARKET_INFO_FIXTURE,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
      isSetAcceptablePriceImpactEnabled: true,
    });
    expect(amounts.decreaseSwapType).toEqual(DecreasePositionSwapType.NoSwap);
  });

  it("usdc collateral but receive in eth", () => {
    const amounts = getDecreasePositionAmounts({
      closeSizeUsd,
      collateralToken: USDC_TOKEN_FIXTURE,
      receiveToken: ETH_TOKEN_FIXTURE,
      position: POSITION_FIXTURE,
      keepLeverage,
      isLong,
      marketInfo: MARKET_INFO_FIXTURE,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
      isSetAcceptablePriceImpactEnabled: true,
    });
    expect(amounts.decreaseSwapType).toEqual(DecreasePositionSwapType.SwapCollateralTokenToPnlToken);
  });

  it("exposes swapProfitUsdIn for SwapPnlTokenToCollateralToken", () => {
    const amounts = getDecreasePositionAmounts({
      closeSizeUsd: POSITION_FIXTURE.sizeInUsd,
      collateralToken: USDC_TOKEN_FIXTURE,
      position: POSITION_FIXTURE,
      keepLeverage,
      isLong,
      // the shorts reserve more than the fixture's USDC pool, which leaves no liquidity to swap the profit to
      marketInfo: { ...MARKET_INFO_FIXTURE, shortInterestUsd: 0n },
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
      isSetAcceptablePriceImpactEnabled: true,
    });

    expect(amounts.decreaseSwapType).toEqual(DecreasePositionSwapType.SwapPnlTokenToCollateralToken);
    expect(amounts.swapProfitUsdIn).toBeGreaterThan(0n);
    expect(amounts.swapProfitFeeUsd).toBeGreaterThan(0n);
  });

  it("estimates internal swap fee for SwapCollateralTokenToPnlToken", () => {
    const amounts = getDecreasePositionAmounts({
      closeSizeUsd: POSITION_FIXTURE.sizeInUsd,
      collateralToken: USDC_TOKEN_FIXTURE,
      receiveToken: ETH_TOKEN_FIXTURE,
      position: POSITION_FIXTURE,
      keepLeverage,
      isLong,
      marketInfo: MARKET_INFO_FIXTURE,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
      isSetAcceptablePriceImpactEnabled: true,
    });

    expect(amounts.decreaseSwapType).toEqual(DecreasePositionSwapType.SwapCollateralTokenToPnlToken);
    expect(amounts.swapProfitUsdIn).toBeGreaterThan(0n);
    expect(amounts.swapProfitFeeUsd).not.toEqual(0n);
  });
});

describe("getDecreasePositionAmounts primaryOutput/secondaryOutput", () => {
  it("primary in pnl token, secondary in collateral token for SwapPnlTokenToCollateralToken", () => {
    const amounts = getDecreasePositionAmounts({
      closeSizeUsd: POSITION_FIXTURE.sizeInUsd,
      collateralToken: USDC_TOKEN_FIXTURE,
      position: POSITION_FIXTURE,
      keepLeverage,
      isLong,
      marketInfo: MARKET_INFO_FIXTURE,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
      isSetAcceptablePriceImpactEnabled: true,
    });

    expect(amounts.decreaseSwapType).toEqual(DecreasePositionSwapType.SwapPnlTokenToCollateralToken);
    expect(amounts.primaryOutput.tokenAddress).toEqual(WETH_TOKEN_FIXTURE.address);
    expect(amounts.secondaryOutput.tokenAddress).toEqual(USDC_TOKEN_FIXTURE.address);
    expect(amounts.primaryOutput.usd + amounts.secondaryOutput.usd).toEqual(amounts.receiveUsd);
  });

  it("primary in pnl token, secondary in collateral token for SwapCollateralTokenToPnlToken", () => {
    const amounts = getDecreasePositionAmounts({
      closeSizeUsd: POSITION_FIXTURE.sizeInUsd,
      collateralToken: USDC_TOKEN_FIXTURE,
      receiveToken: ETH_TOKEN_FIXTURE,
      position: POSITION_FIXTURE,
      keepLeverage,
      isLong,
      marketInfo: MARKET_INFO_FIXTURE,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
      isSetAcceptablePriceImpactEnabled: true,
    });

    expect(amounts.decreaseSwapType).toEqual(DecreasePositionSwapType.SwapCollateralTokenToPnlToken);
    expect(amounts.primaryOutput.tokenAddress).toEqual(WETH_TOKEN_FIXTURE.address);
    expect(amounts.secondaryOutput.tokenAddress).toEqual(USDC_TOKEN_FIXTURE.address);
    expect(amounts.primaryOutput.amount).toBeGreaterThan(0n);
    expect(amounts.primaryOutput.usd + amounts.secondaryOutput.usd).toEqual(amounts.receiveUsd);
  });

  it("keeps pnl and collateral outputs separate for forced NoSwap", () => {
    const amounts = getDecreasePositionAmounts({
      closeSizeUsd: POSITION_FIXTURE.sizeInUsd,
      collateralToken: USDC_TOKEN_FIXTURE,
      receiveToken: ETH_TOKEN_FIXTURE,
      position: POSITION_FIXTURE,
      keepLeverage,
      isLong,
      marketInfo: MARKET_INFO_FIXTURE,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
      isSetAcceptablePriceImpactEnabled: true,
      forceDecreaseSwapType: DecreasePositionSwapType.NoSwap,
    });

    expect(amounts.decreaseSwapType).toEqual(DecreasePositionSwapType.NoSwap);
    expect(amounts.primaryOutput.tokenAddress).toEqual(WETH_TOKEN_FIXTURE.address);
    expect(amounts.primaryOutput.amount).toBeGreaterThan(0n);
    expect(amounts.primaryOutput.usd).toBeGreaterThan(0n);
    expect(amounts.secondaryOutput.tokenAddress).toEqual(USDC_TOKEN_FIXTURE.address);
    expect(amounts.secondaryOutput.amount).toBeGreaterThan(0n);
    expect(amounts.secondaryOutput.usd).toBeGreaterThan(0n);
    expect(amounts.primaryOutput.usd + amounts.secondaryOutput.usd).toEqual(amounts.receiveUsd);
    expect(amounts.swapProfitFeeUsd).toEqual(0n);
  });

  it.each([
    // 1 ETH position opened at $2000, take-profit → PnL token and the price its output is converted at
    ["long at $2400", true, USDC_TOKEN, 2400, ETH_TOKEN, expandDecimals(2400, 30)],
    ["short at $1800", false, ETH_TOKEN, 1800, USDC_TOKEN, USDC_TOKEN.prices.minPrice],
  ])(
    "converts the PnL token output of a %s take-profit PRO-4070",
    (_, isLong, collateralToken, trigger, pnlToken, price) => {
      const marketInfo = createMockMarketInfo();
      const position = createMockPositionInfo({ account: MOCK_ACCOUNT, marketInfo, collateralToken, isLong });
      const amounts = getDecreasePositionAmounts({
        closeSizeUsd: position.sizeInUsd,
        collateralToken,
        position: position as PositionInfoLoaded,
        keepLeverage,
        isLong,
        marketInfo,
        minCollateralUsd,
        minPositionSizeUsd,
        uiFeeFactor,
        userReferralInfo: undefined,
        isSetAcceptablePriceImpactEnabled: false,
        triggerPrice: expandDecimals(trigger, 30),
        triggerOrderType: OrderType.LimitDecrease,
        forceDecreaseSwapType: DecreasePositionSwapType.NoSwap,
      });

      expect(amounts.primaryOutput.tokenAddress).toBe(pnlToken.address);
      expect(amounts.primaryOutput.usd).toBeGreaterThan(0n);
      expect(amounts.primaryOutput.amount).toBe(
        convertToTokenAmount(amounts.primaryOutput.usd, pnlToken.decimals, price)
      );
    }
  );

  it("has zero secondary output for partial close without collateral delta", () => {
    const amounts = getDecreasePositionAmounts({
      closeSizeUsd,
      collateralToken: USDC_TOKEN_FIXTURE,
      position: POSITION_FIXTURE,
      keepLeverage: false,
      isLong,
      marketInfo: MARKET_INFO_FIXTURE,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
      isSetAcceptablePriceImpactEnabled: true,
    });

    expect(amounts.isFullClose).toBe(false);
    expect(amounts.secondaryOutput.amount).toEqual(0n);
    expect(amounts.secondaryOutput.usd).toEqual(0n);
  });
});
