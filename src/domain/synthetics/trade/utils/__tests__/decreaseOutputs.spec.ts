import { describe, expect, it } from "vitest";

import { DecreasePositionSwapType } from "domain/synthetics/orders";
import { getDecreasePositionAmounts } from "domain/synthetics/trade";
import {
  getCanSplitReceive,
  getDecreaseReceiveOutputs,
  getHasSplitReceiveOutputs,
  getIsSplitReceiveAvailable,
} from "sdk/utils/trade/decreaseOutputs";

import {
  ETH_TOKEN_FIXTURE,
  MARKET_INFO_FIXTURE,
  POSITION_FIXTURE,
  USDC_TOKEN_FIXTURE,
  WETH_TOKEN_FIXTURE,
} from "./fixtures";

const minCollateralUsd = 100000n;
const minPositionSizeUsd = 100000n;
const uiFeeFactor = 0n;

const tokensData = {
  [USDC_TOKEN_FIXTURE.address]: USDC_TOKEN_FIXTURE,
  [WETH_TOKEN_FIXTURE.address]: WETH_TOKEN_FIXTURE,
  [ETH_TOKEN_FIXTURE.address]: ETH_TOKEN_FIXTURE,
};

describe("decrease receive outputs", () => {
  it("returns primary and secondary outputs for split no-swap decrease amounts", () => {
    const decreaseAmounts = getDecreasePositionAmounts({
      closeSizeUsd: POSITION_FIXTURE.sizeInUsd,
      collateralToken: USDC_TOKEN_FIXTURE,
      receiveToken: ETH_TOKEN_FIXTURE,
      position: POSITION_FIXTURE,
      keepLeverage: false,
      isLong: true,
      marketInfo: MARKET_INFO_FIXTURE,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
      isSetAcceptablePriceImpactEnabled: true,
      forceDecreaseSwapType: DecreasePositionSwapType.NoSwap,
    });

    const outputs = getDecreaseReceiveOutputs({ decreaseAmounts, tokensData });

    expect(outputs).toHaveLength(2);
    expect(outputs[0]).toMatchObject({ type: "primary", token: WETH_TOKEN_FIXTURE });
    expect(outputs[0].amount).toBeGreaterThan(0n);
    expect(outputs[1]).toMatchObject({ type: "secondary", token: USDC_TOKEN_FIXTURE });
    expect(outputs[1].amount).toBeGreaterThan(0n);
    expect(getHasSplitReceiveOutputs(outputs)).toEqual(true);
  });

  it("filters zero outputs", () => {
    const decreaseAmounts = getDecreasePositionAmounts({
      closeSizeUsd: 0n,
      collateralToken: USDC_TOKEN_FIXTURE,
      position: POSITION_FIXTURE,
      keepLeverage: false,
      isLong: true,
      marketInfo: MARKET_INFO_FIXTURE,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
      isSetAcceptablePriceImpactEnabled: true,
    });

    expect(getDecreaseReceiveOutputs({ decreaseAmounts, tokensData })).toHaveLength(0);
  });

  it("allows split receive when pnl and collateral tokens differ", () => {
    expect(getCanSplitReceive(POSITION_FIXTURE)).toEqual(true);
  });

  it("does not make split receive available unless separate outputs exist", () => {
    const outputs = [
      {
        type: "primary" as const,
        token: WETH_TOKEN_FIXTURE,
        amount: 1000000000000000000n,
        usd: 100000n,
      },
    ];

    expect(getCanSplitReceive(POSITION_FIXTURE)).toEqual(true);
    expect(getIsSplitReceiveAvailable(POSITION_FIXTURE, outputs)).toEqual(false);
  });
});
