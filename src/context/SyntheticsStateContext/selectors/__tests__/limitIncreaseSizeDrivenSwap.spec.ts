import { describe, expect, it } from "vitest";

import { MOCK_POSITIONS_CONSTANTS } from "domain/testUtils/mockChainData";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, MockSyntheticsStateOverrides } from "domain/testUtils/mockSyntheticsState";
import { ETH_ADDRESS, USDC_ADDRESS } from "domain/testUtils/mockTokens";
import { expandDecimals, formatAmountFree } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { convertToTokenAmount } from "sdk/utils/tokens";
import { TradeMode } from "sdk/utils/trade/types";

import { selectTradeboxIncreasePositionAmounts } from "../tradeboxSelectors";

/**
 * The tradebox with the leverage slider on, a limit resting below the market, ETH paid into a USDC
 * collateral — the one sizing path where the deposit used to be converted at the current price.
 */
describe("tradebox — size-driven limit increase paid through a swap", () => {
  const marketInfo = createMockMarketInfo();
  const ETH_PRICE = expandDecimals(2000, 30);
  const TRIGGER_PRICE = expandDecimals(1800, 30);

  function amountsFor(overrides: MockSyntheticsStateOverrides) {
    return selectTradeboxIncreasePositionAmounts(
      createMockSyntheticsState({
        marketInfo,
        isLeverageSliderEnabled: true,
        leverageOption: 2,
        tradeMode: TradeMode.Limit,
        triggerPriceInputValue: "1800",
        fromTokenAddress: ETH_ADDRESS,
        collateralAddress: USDC_ADDRESS,
        positionsConstants: MOCK_POSITIONS_CONSTANTS,
        ...overrides,
      })
    );
  }

  it("fills the margin with the deposit that reaches the slider leverage at the trigger", () => {
    // ETH is mocked at 2 000, the slider at 2×, the size is 1 ETH at the 1 800 trigger
    const bySize = amountsFor({ focusedInput: "to", toTokenInputValue: "1", fromTokenInputValue: "0.1" })!;

    expect(bySize.sizeDeltaUsd).toBe(TRIGGER_PRICE);
    expect(bySize.swapStrategy.type).toBe("internalSwap");

    const targetCollateralUsd = bySize.sizeDeltaUsd / 2n;

    expect(bigMath.abs(bySize.collateralDeltaUsd - targetCollateralUsd)).toBeLessThanOrEqual(
      targetCollateralUsd / 10_000n
    );
    // more ETH than the current price would ask for: the swap happens at the trigger, not now
    expect(bySize.initialCollateralAmount).toBeGreaterThan(convertToTokenAmount(targetCollateralUsd, 18, ETH_PRICE)!);
  });

  it("sizes the same order back when that deposit is typed into the margin field", () => {
    const bySize = amountsFor({ focusedInput: "to", toTokenInputValue: "1", fromTokenInputValue: "0.1" })!;
    const byCollateral = amountsFor({
      focusedInput: "from",
      fromTokenInputValue: formatAmountFree(bySize.initialCollateralAmount, 18),
      toTokenInputValue: "",
    })!;

    expect(bigMath.abs(byCollateral.sizeDeltaUsd - bySize.sizeDeltaUsd)).toBeLessThanOrEqual(
      bySize.sizeDeltaUsd / 10_000n
    );
  });
});
