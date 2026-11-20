import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "configs/factors";
import { mockMarginCheckMarketInfo, mockTokensData } from "test/mock";
import { expandDecimals } from "utils/numbers";
import { DecreasePositionSwapType } from "utils/orders/types";
import { PositionInfoLoaded } from "utils/positions/types";
import { convertToTokenAmount } from "utils/tokens";
import { getDecreasePositionAmounts } from "utils/trade/decrease";
import { getDecreaseReceiveOutputs, getIsSplitReceiveAvailable } from "utils/trade/decreaseOutputs";

const tokensData = mockTokensData();
const usdc = tokensData.USDC;
const btc = tokensData.BTC;

// 0.05% position fee and no price impact: closing 50 000 pays 25 of position fees
const marketInfo = mockMarginCheckMarketInfo(tokensData, {
  positionFeeFactorForBalanceWasImproved: expandDecimals(5, 26),
  positionFeeFactorForBalanceWasNotImproved: expandDecimals(5, 26),
});

function usd(value: number) {
  return (BigInt(Math.round(value * 100)) * expandDecimals(1, USD_DECIMALS)) / 100n;
}

// a 100 000 short with 6 666.67 USDC of collateral (15x)
function shortPosition({ pnl, borrowing, funding }: { pnl: number; borrowing: number; funding: number }) {
  return {
    marketInfo,
    isLong: false,
    sizeInUsd: usd(100_000),
    sizeInTokens: convertToTokenAmount(usd(100_000 - pnl), btc.decimals, btc.prices.maxPrice)!,
    collateralAmount: convertToTokenAmount(usd(6_666.67), usdc.decimals, usdc.prices.minPrice)!,
    pendingBorrowingFeesUsd: usd(borrowing),
    pendingFundingFeesUsd: usd(funding),
    pendingImpactAmount: 0n,
  } as PositionInfoLoaded;
}

describe("getDecreasePositionAmounts, TWAP close", () => {
  // closing 50 000 realizes half of the PnL, an equal share per part; the contract charges every pending
  // fee to the first part and pays a part's costs from its profit first, then from the collateral
  it.each([
    { pnl: 3_000, borrowing: 1_320, funding: 0, keep: true, parts: 5, receive: 1_180, fromCollateral: 1_025 },
    { pnl: 3_000, borrowing: 1_320, funding: 0, keep: false, parts: 5, receive: 1_180, fromCollateral: 1_025 },
    { pnl: 3_000, borrowing: 1_000, funding: 320, keep: true, parts: 5, receive: 1_180, fromCollateral: 1_025 },
    { pnl: 3_000, borrowing: 1_320, funding: 0, keep: true, parts: 2, receive: 737.5, fromCollateral: 582.5 },
    { pnl: 3_000, borrowing: 100, funding: 0, keep: true, parts: 5, receive: 1_375, fromCollateral: 0 },
    { pnl: 3_000, borrowing: 2_000, funding: 0, keep: true, parts: 5, receive: 1_180, fromCollateral: 1_705 },
    { pnl: -1_000, borrowing: 1_320, funding: 0, keep: true, parts: 5, receive: 0, fromCollateral: 1_845 },
    // the parts field is empty while the user types: the estimate falls back to one order
    { pnl: 3_000, borrowing: 1_320, funding: 0, keep: true, parts: 0, receive: 155, fromCollateral: 0 },
  ])(
    "withdraws no collateral on a partial close and charges the pending fees to part 1 TRD-42: pnl $pnl, borrowing $borrowing, funding $funding, $parts parts, keep leverage $keep",
    ({ pnl, borrowing, funding, keep, parts, receive, fromCollateral }) => {
      const amounts = getDecreasePositionAmounts({
        marketInfo,
        collateralToken: usdc,
        isLong: false,
        position: shortPosition({ pnl, borrowing, funding }),
        closeSizeUsd: usd(50_000),
        keepLeverage: keep,
        userReferralInfo: undefined,
        minCollateralUsd: usd(1),
        minPositionSizeUsd: usd(1),
        uiFeeFactor: 0n,
        isSetAcceptablePriceImpactEnabled: true,
        isTwap: true,
        numberOfParts: parts,
      });

      expect(amounts.collateralDeltaAmount).toBe(0n);
      expect(amounts.receiveUsd).toBe(usd(receive));
      expect(amounts.payedRemainingCollateralUsd).toBe(usd(fromCollateral));
    }
  );

  // with split receive the profit leaves in BTC unswapped, so the contract pays every cost from the collateral
  it("offers split receive on a partial close and pays its costs from the collateral TRD-42", () => {
    const position = {
      marketInfo,
      isLong: true,
      sizeInUsd: usd(100_000),
      sizeInTokens: convertToTokenAmount(usd(103_000), btc.decimals, btc.prices.minPrice)!,
      collateralToken: usdc,
      collateralAmount: convertToTokenAmount(usd(6_666.67), usdc.decimals, usdc.prices.minPrice)!,
      pnlToken: btc,
      pendingBorrowingFeesUsd: usd(1_320),
      pendingFundingFeesUsd: 0n,
      pendingImpactAmount: 0n,
    } as PositionInfoLoaded;

    const amounts = getDecreasePositionAmounts({
      marketInfo,
      collateralToken: usdc,
      isLong: true,
      position,
      closeSizeUsd: usd(50_000),
      keepLeverage: true,
      userReferralInfo: undefined,
      minCollateralUsd: usd(1),
      minPositionSizeUsd: usd(1),
      uiFeeFactor: 0n,
      isSetAcceptablePriceImpactEnabled: true,
      isTwap: true,
      numberOfParts: 5,
      forceDecreaseSwapType: DecreasePositionSwapType.NoSwap,
    });
    const outputs = getDecreaseReceiveOutputs({ decreaseAmounts: amounts, tokensData });

    expect(amounts.collateralDeltaAmount).toBe(0n);
    expect(amounts.payedRemainingCollateralUsd).toBe(usd(1_345));
    expect(outputs).toEqual([
      {
        type: "primary",
        token: btc,
        amount: convertToTokenAmount(usd(1_500), btc.decimals, btc.prices.minPrice),
        usd: usd(1_500),
      },
    ]);
    expect(getIsSplitReceiveAvailable(position, outputs, { isTwap: true })).toBe(true);
  });
});
