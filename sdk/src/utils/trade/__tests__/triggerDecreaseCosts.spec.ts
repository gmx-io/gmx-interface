import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "configs/factors";
import { mockMarginCheckMarketInfo, mockTokensData, usdToToken } from "test/mock";
import { MarketInfo } from "utils/markets/types";
import { bigintToNumber, expandDecimals, numberToBigint } from "utils/numbers";
import { DecreasePositionSwapType, OrderType } from "utils/orders/types";
import { PositionInfoLoaded } from "utils/positions/types";
import { getDecreasePositionAmounts, getNextPositionValuesForDecreaseTrade } from "utils/trade/decrease";

const tokensData = mockTokensData();
const usdc = tokensData.USDC;
const btc = tokensData.BTC;

// 0.04% position fee and 0.05% swap fee, no price impact, deep pools: closing 50 000 pays 20 of position fees
const marketInfo = mockMarginCheckMarketInfo(tokensData, {
  positionFeeFactorForBalanceWasImproved: expandDecimals(4, 26),
  positionFeeFactorForBalanceWasNotImproved: expandDecimals(4, 26),
  swapFeeFactorForBalanceWasImproved: expandDecimals(5, 26),
  swapFeeFactorForBalanceWasNotImproved: expandDecimals(5, 26),
  swapImpactFactorPositive: 0n,
  swapImpactFactorNegative: 0n,
  longPoolAmount: usdToToken(1_000_000_000, btc),
  shortPoolAmount: usdToToken(1_000_000_000, usdc),
  maxLongPoolAmount: usdToToken(10_000_000_000, btc),
  maxShortPoolAmount: usdToToken(10_000_000_000, usdc),
});
// the contract can't swap the BTC profit into a pool over its cap
const overCapMarketInfo = { ...marketInfo, maxLongPoolAmount: marketInfo.longPoolAmount - 1n };

// a 100 000 BTC long opened at 20 000 with 6 667 USDC of collateral (15x)
function longPosition(pendingFees: number, pendingImpactUsd = 0) {
  return {
    marketInfo,
    isLong: true,
    sizeInUsd: expandDecimals(100_000, USD_DECIMALS),
    sizeInTokens: usdToToken(100_000, btc),
    collateralAmount: usdToToken(6_667, usdc),
    collateralUsd: expandDecimals(6_667, USD_DECIMALS),
    pendingBorrowingFeesUsd: numberToBigint(pendingFees, USD_DECIMALS),
    pendingFundingFeesUsd: 0n,
    pendingImpactAmount: -usdToToken(pendingImpactUsd, btc),
    pendingImpactUsd: -numberToBigint(pendingImpactUsd, USD_DECIMALS),
  } as PositionInfoLoaded;
}

// closes half the position with a trigger order at the price that realizes `pnl` on it
function closeHalf(p: {
  type: "TP" | "SL";
  pendingFees: number;
  pnl: number;
  keepLeverage: boolean;
  receive: "split" | "pnl" | "collateral";
  storedCollateralDeltaAmount?: bigint;
  marketInfo?: MarketInfo;
  pendingImpactUsd?: number;
}) {
  const position = longPosition(p.pendingFees, p.pendingImpactUsd);
  const amounts = getDecreasePositionAmounts({
    marketInfo: p.marketInfo ?? marketInfo,
    collateralToken: usdc,
    isLong: true,
    position,
    closeSizeUsd: expandDecimals(50_000, USD_DECIMALS),
    keepLeverage: p.keepLeverage,
    storedCollateralDeltaAmount: p.storedCollateralDeltaAmount,
    triggerPrice: expandDecimals(100_000 + 2 * p.pnl, USD_DECIMALS) / 5n,
    triggerOrderType: p.type === "TP" ? OrderType.LimitDecrease : OrderType.StopLossDecrease,
    userReferralInfo: undefined,
    minCollateralUsd: expandDecimals(1, USD_DECIMALS),
    minPositionSizeUsd: expandDecimals(1, USD_DECIMALS),
    uiFeeFactor: 0n,
    isSetAcceptablePriceImpactEnabled: false,
    receiveToken: p.receive === "pnl" ? btc : undefined,
    forceDecreaseSwapType: p.receive === "split" ? DecreasePositionSwapType.NoSwap : undefined,
  });
  const next = getNextPositionValuesForDecreaseTrade({
    existingPosition: position,
    marketInfo,
    collateralToken: usdc,
    sizeDeltaUsd: amounts.sizeDeltaUsd,
    sizeDeltaInTokens: amounts.sizeDeltaInTokens,
    realizedPnl: amounts.realizedPnl,
    estimatedPnl: amounts.estimatedPnl,
    collateralDeltaUsd: amounts.collateralDeltaUsd,
    collateralDeltaAmount: amounts.collateralDeltaAmount,
    payedRemainingCollateralUsd: amounts.payedRemainingCollateralUsd,
    payedRemainingCollateralAmount: amounts.payedRemainingCollateralAmount,
    proportionalPendingImpactDeltaUsd: amounts.proportionalPendingImpactDeltaUsd,
    showPnlInLeverage: false,
    isLong: true,
    minCollateralUsd: expandDecimals(1, USD_DECIMALS),
    userReferralInfo: undefined,
    priceImpactDiffUsd: amounts.priceImpactDiffUsd,
    collateralPrice: amounts.collateralPrice,
  });

  return { amounts, next };
}

const tp = { type: "TP", pendingFees: 1_319.94, pnl: 2_500, keepLeverage: true } as const;

describe("trigger decrease with the profit kept in the pnl token", () => {
  it("pays a partial TP's costs from the collateral before the signed withdrawal TRD-18", () => {
    // 1 319.94 of pending fees plus the 20 position fee: the contract takes all 1 339.94 out of the USDC collateral
    // and leaves the BTC profit whole, so withdrawing 3 993.46 would leave 1 333.60 at 37.49x
    const { amounts, next } = closeHalf({ ...tp, receive: "split" });

    expect(bigintToNumber(amounts.collateralDeltaAmount, usdc.decimals)).toBeCloseTo(2_653.52, 2);
    expect(bigintToNumber(amounts.payedRemainingCollateralAmount, usdc.decimals)).toBeCloseTo(1_339.94, 2);
    expect(bigintToNumber(next.nextCollateralUsd ?? 0n, USD_DECIMALS)).toBeCloseTo(2_673.54, 2);
    expect(bigintToNumber(next.nextLeverage ?? 0n, 4)).toBeCloseTo(18.7, 2);
    expect(amounts.primaryOutput).toMatchObject({
      tokenAddress: btc.address,
      usd: expandDecimals(2_500, USD_DECIMALS),
    });
    expect(amounts.secondaryOutput.amount).toBe(amounts.collateralDeltaAmount);

    // the default receive swaps the profit to USDC first and the contract pays the costs from it
    const defaultReceive = closeHalf({ ...tp, receive: "collateral" }).amounts;
    expect(bigintToNumber(defaultReceive.collateralDeltaAmount, usdc.decimals)).toBeCloseTo(3_993.46, 2);

    // unless the BTC pool is over its cap: the swap reverts and the order settles like the split receive
    const overCap = closeHalf({ ...tp, receive: "collateral", marketInfo: overCapMarketInfo });
    expect(bigintToNumber(overCap.amounts.collateralDeltaAmount, usdc.decimals)).toBeCloseTo(2_653.52, 2);
    expect(bigintToNumber(overCap.next.nextCollateralUsd ?? 0n, USD_DECIMALS)).toBeCloseTo(2_673.54, 2);
    expect(overCap.amounts.primaryOutput.usd).toBe(expandDecimals(2_500, USD_DECIMALS));
  });

  // the expected values settle each close the contract's way: costs come out of the USDC collateral before the BTC
  // profit, then Keep leverage withdraws down to the leverage without pnl (18.7x, or 15x without pending fees)
  // columns: type, pending fees, pnl, keep leverage, receive, USDC withdrawal, collateral left, received in BTC
  it.each([
    ["TP", 1_319.94, 1_000, true, "split", 2_653.52, 2_673.54, 1_000],
    ["SL", 0, 20, true, "split", 3_313.49, 3_333.51, 20],
    ["TP", 1_319.94, 2_500, false, "split", 0, 5_327.06, 2_500],
    // the costs eat the whole collateral and 353 of the profit: nothing is left to withdraw
    ["TP", 7_000, 2_500, true, "split", 0, 0, 2_147],
    // a losing stop-loss pays its loss from the collateral too, and its withdrawal never goes below zero
    ["SL", 1_319.94, -3_000, true, "split", 0, 2_327.06, 0],
    // receiving in BTC swaps the withdrawn USDC after the costs: 2 500 profit + 2 653.52 less the 0.05% swap fee
    ["TP", 1_319.94, 2_500, true, "pnl", 2_653.52, 2_673.54, 5_152.19],
  ] as const)(
    "settles a %s the contract's way TRD-18: pending fees %s, pnl %s, keep leverage %s, receive %s",
    (type, pendingFees, pnl, keepLeverage, receive, withdrawal, left, receivedInBtc) => {
      const { amounts, next } = closeHalf({ type, pendingFees, pnl, keepLeverage, receive });

      expect(bigintToNumber(amounts.collateralDeltaAmount, usdc.decimals)).toBeCloseTo(withdrawal, 2);
      expect(bigintToNumber(next.nextCollateralUsd ?? 0n, USD_DECIMALS)).toBeCloseTo(left, 2);
      expect(bigintToNumber(amounts.primaryOutput.usd, USD_DECIMALS)).toBeCloseTo(receivedInBtc, 2);
    }
  );

  it("receives and previews what a withdrawal executes: less the impact past the cap, capped by the costs TRD-18", () => {
    // half of 420 of pending impact is realized, all past the 0 cap: Keep leverage signs 2 443.52, Receive shows
    // 2 233.52 and the 210 becomes claimable, so 2 883.54 stays in the position
    const withImpact = closeHalf({ ...tp, receive: "split", pendingImpactUsd: 420 });
    expect(bigintToNumber(withImpact.amounts.collateralDeltaAmount, usdc.decimals)).toBeCloseTo(2_443.52, 2);
    expect(bigintToNumber(withImpact.amounts.secondaryOutput.amount, usdc.decimals)).toBeCloseTo(2_233.52, 2);
    expect(bigintToNumber(withImpact.next.nextCollateralUsd ?? 0n, USD_DECIMALS)).toBeCloseTo(2_883.54, 2);

    // the 3 993.46 a split-receive TP signed before the fix, and one larger than the 5 327.06 left after costs
    const getReceived = (stored: number) =>
      closeHalf({
        ...tp,
        keepLeverage: false,
        receive: "split",
        storedCollateralDeltaAmount: numberToBigint(stored, usdc.decimals),
      }).amounts;

    expect(bigintToNumber(getReceived(3_993.46).secondaryOutput.amount, usdc.decimals)).toBeCloseTo(3_993.46, 2);
    expect(bigintToNumber(getReceived(6_000).secondaryOutput.amount, usdc.decimals)).toBeCloseTo(5_327.06, 2);
    expect(getReceived(6_000).primaryOutput.usd).toBe(expandDecimals(2_500, USD_DECIMALS));
  });
});
