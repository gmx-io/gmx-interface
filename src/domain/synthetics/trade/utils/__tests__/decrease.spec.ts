import { describe, expect, it } from "vitest";

import { DecreasePositionSwapType } from "domain/synthetics/orders";

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
      marketInfo: MARKET_INFO_FIXTURE,
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
