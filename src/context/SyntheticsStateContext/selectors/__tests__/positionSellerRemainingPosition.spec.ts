import { describe, expect, it } from "vitest";

import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import type { PositionInfo } from "domain/synthetics/positions";
import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { ValidationButtonTooltipName } from "domain/synthetics/trade/utils/validation";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, MOCK_ACCOUNT } from "domain/testUtils/mockSyntheticsState";
import { ETH_ADDRESS, ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import { DEFAULT_TWAP_NUMBER_OF_PARTS } from "sdk/configs/twap";
import { convertToTokenAmount, convertToUsd } from "sdk/utils/tokens";
import type { TokensData } from "sdk/utils/tokens/types";
import { PositionMarginFailureReason } from "sdk/utils/trade/increaseMarginCheck";

import type { SyntheticsState } from "../../SyntheticsStateContextProvider";
import {
  selectPositionSellerDecreaseAmounts,
  selectPositionSellerDecreaseAmountsWithKeepLeverage,
  selectPositionSellerDecreaseError,
  selectPositionSellerKeepLeverage,
  selectPositionSellerLeverageDisabledByCollateral,
  selectPositionSellerNextPositionValuesForDecrease,
  selectPositionSellerRemainingPositionMarginState,
} from "../positionSellerSelectors";

// no fees, no price impact: the remaining margin is collateral + pnl; 1 % regular factor, 0.5 % for liquidation
const marketInfo = createMockMarketInfo(ETH_TOKEN, {
  positionFeeFactorForBalanceWasImproved: 0n,
  positionFeeFactorForBalanceWasNotImproved: 0n,
  positionImpactFactorPositive: 0n,
  positionImpactFactorNegative: 0n,
});

// 0.2 % position fee, still no price impact
const marketInfoWithFee = createMockMarketInfo(ETH_TOKEN, {
  positionFeeFactorForBalanceWasImproved: expandDecimals(2, 27),
  positionFeeFactorForBalanceWasNotImproved: expandDecimals(2, 27),
  positionImpactFactorPositive: 0n,
  positionImpactFactorNegative: 0n,
});

const usd = (value: number) => expandDecimals(value, 30);
const SIZE_USD = usd(10_000);
const LOSS_USD = usd(2_000);

const MAX_LEVERAGE_EXCEEDED = {
  buttonErrorMessage: "Max leverage exceeded",
  buttonTooltipName: ValidationButtonTooltipName.remainingPositionMaxLeverage,
};

/** a 10 000 USD long, losing 2 000 unless told otherwise; ETH is mocked at 2 000 */
function makePosition(
  collateralUsd: bigint,
  pnlUsd: bigint,
  positionMarketInfo: typeof marketInfo,
  overrides: Partial<PositionInfo> = {}
) {
  return mockPositionInfo(
    {
      marketInfo: positionMarketInfo,
      collateralTokenAddress: USDC_ADDRESS,
      account: MOCK_ACCOUNT,
      isLong: true,
      sizeInUsd: SIZE_USD,
      collateralUsd,
    },
    {
      sizeInTokens: ((SIZE_USD + pnlUsd) * expandDecimals(1, 18)) / usd(2_000),
      pnl: pnlUsd,
      markPrice: usd(2_000),
      remainingCollateralUsd: collateralUsd,
      ...overrides,
    }
  );
}

function createState(p: {
  collateralUsd: bigint;
  closeUsd: string;
  keepLeverage: boolean;
  orderOption?: OrderOption;
  isPnlInLeverage?: boolean;
  pnlUsd?: bigint;
  marketInfo?: typeof marketInfo;
  receiveTokenAddress?: string;
  isReceiveSeparated?: boolean;
  tokensData?: TokensData;
  positionOverrides?: Partial<PositionInfo>;
  proDiscountFactor?: bigint;
}): SyntheticsState {
  const positionMarketInfo = p.marketInfo ?? marketInfo;
  const position = makePosition(p.collateralUsd, p.pnlUsd ?? -LOSS_USD, positionMarketInfo, p.positionOverrides);
  const state = createMockSyntheticsState({
    marketInfo: positionMarketInfo,
    account: MOCK_ACCOUNT,
    positionsInfoData: { [position.key]: position },
    isPnlInLeverage: p.isPnlInLeverage,
    tokensData: p.tokensData,
    proDiscountFactor: p.proDiscountFactor ?? 0n,
  });

  return {
    ...state,
    globals: { ...state.globals, closingPositionKey: position.key },
    positionSeller: {
      orderOption: p.orderOption ?? OrderOption.Market,
      closeUsdInputValue: p.closeUsd,
      keepLeverage: p.keepLeverage,
      receiveTokenAddress: p.receiveTokenAddress ?? USDC_ADDRESS,
      isReceiveTokenChanged: p.receiveTokenAddress !== undefined,
      defaultReceiveToken: undefined,
      isReceiveSeparated: p.isReceiveSeparated ?? false,
      numberOfParts: DEFAULT_TWAP_NUMBER_OF_PARTS,
      triggerPriceInputValue: "",
      selectedTriggerAcceptablePriceImpactBps: undefined,
    },
  } as unknown as SyntheticsState;
}

describe("position seller — remaining position after a market partial close", () => {
  // 2 060 of collateral and a 2 000 loss leave 60 of margin: under the 1 % regular minimum of the full
  // position (100), above its 0.5 % liquidation minimum (50)
  const OVER_LEVERAGED = usd(2_060);

  it("blocks a partial close whose remainder stays above max leverage", () => {
    const state = createState({ collateralUsd: OVER_LEVERAGED, closeUsd: "2500", keepLeverage: false });
    const marginState = selectPositionSellerRemainingPositionMarginState(state);

    expect(selectPositionSellerDecreaseAmounts(state)?.isFullClose).toBe(false);
    expect(marginState?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
    expect(marginState?.remainingCollateralUsd).toBe(usd(60));
    expect(marginState?.minCollateralUsdForLeverage).toBe(usd(75));
    expect(selectPositionSellerDecreaseError(state)).toMatchObject(MAX_LEVERAGE_EXCEEDED);
  });

  it("passes once the remainder is small enough, equality included", () => {
    const atThreshold = createState({ collateralUsd: OVER_LEVERAGED, closeUsd: "4000", keepLeverage: false });
    const above = createState({ collateralUsd: OVER_LEVERAGED, closeUsd: "5000", keepLeverage: false });

    expect(selectPositionSellerRemainingPositionMarginState(atThreshold)?.minCollateralUsdForLeverage).toBe(usd(60));
    expect(selectPositionSellerRemainingPositionMarginState(atThreshold)?.isLiquidatable).toBe(false);
    expect(selectPositionSellerRemainingPositionMarginState(above)?.isLiquidatable).toBe(false);
    expect(selectPositionSellerDecreaseError(atThreshold)).toEqual({});
    expect(selectPositionSellerDecreaseError(above)).toEqual({});
  });

  it("does not validate a full close", () => {
    const state = createState({ collateralUsd: OVER_LEVERAGED, closeUsd: "10000", keepLeverage: false });

    expect(selectPositionSellerDecreaseAmounts(state)?.isFullClose).toBe(true);
    expect(selectPositionSellerRemainingPositionMarginState(state)).toBeUndefined();
    expect(selectPositionSellerDecreaseError(state)).toEqual({});
  });

  it("switches keep leverage off when its collateral withdrawal is what the contract would reject", () => {
    const state = createState({ collateralUsd: OVER_LEVERAGED, closeUsd: "5000", keepLeverage: true });

    expect(selectPositionSellerLeverageDisabledByCollateral(state)).toBe(true);
    expect(selectPositionSellerKeepLeverage(state)).toBe(false);
    expect(selectPositionSellerDecreaseAmounts(state)?.collateralDeltaAmount).toBe(0n);
    expect(selectPositionSellerRemainingPositionMarginState(state)?.isLiquidatable).toBe(false);
    expect(selectPositionSellerDecreaseError(state)).toEqual({});
  });

  it("switches keep leverage off when the withdrawal would leave the remainder under the minimum collateral", () => {
    // closing 99.5 % of 200 / −50: the withdrawal leaves 1.00 of collateral and −0.25 of pnl, under 1 USD, so the
    // contract cancels it and keeps the collateral in the position
    const state = createState({ collateralUsd: usd(200), pnlUsd: -usd(50), closeUsd: "9950", keepLeverage: true });

    expect(selectPositionSellerLeverageDisabledByCollateral(state)).toBe(true);
    expect(selectPositionSellerKeepLeverage(state)).toBe(false);
    expect(selectPositionSellerDecreaseAmounts(state)?.collateralDeltaAmount).toBe(0n);
  });

  it("receives the keep-leverage withdrawal less the price impact past the cap", () => {
    // half of a flat 1 000 position with 200 of pending negative impact: 100 is realized, 25 within the 0.5 % cap
    // and 75 past it. The order still asks for 400; the contract pays out 400 - 75 and makes the 75 claimable
    const state = createState({
      collateralUsd: usd(1_000),
      pnlUsd: 0n,
      closeUsd: "5000",
      keepLeverage: true,
      marketInfo: createMockMarketInfo(ETH_TOKEN, {
        positionFeeFactorForBalanceWasImproved: 0n,
        positionFeeFactorForBalanceWasNotImproved: 0n,
        positionImpactFactorPositive: 0n,
        positionImpactFactorNegative: 0n,
        maxPositionImpactFactorNegative: expandDecimals(5, 27),
      }),
      positionOverrides: { pendingImpactAmount: -expandDecimals(1, 17) },
    });
    const amounts = selectPositionSellerDecreaseAmounts(state)!;
    const usdcAmount = (value: number) => expandDecimals(value, USDC_TOKEN.decimals);

    expect(amounts.priceImpactDiffUsd).toBe(usd(75));
    expect(amounts.collateralDeltaAmount).toBe(usdcAmount(400));
    expect(amounts.receiveTokenAmount).toBe(usdcAmount(325));
    expect(selectPositionSellerNextPositionValuesForDecrease(state)?.nextCollateralUsd).toBe(usd(575));
  });

  it("switches keep leverage off when the costs leave nothing to withdraw", () => {
    // closing 1 % of 100 / +200 with 95 of pending borrowing and a 0.2 % fee: the 95.2 of costs come out of the
    // collateral first, so keeping the leverage would need a negative withdrawal
    const state = createState({
      collateralUsd: usd(100),
      pnlUsd: usd(200),
      closeUsd: "100",
      keepLeverage: true,
      marketInfo: marketInfoWithFee,
      isReceiveSeparated: true,
      positionOverrides: { pendingBorrowingFeesUsd: usd(95) },
    });

    expect(selectPositionSellerDecreaseAmountsWithKeepLeverage(state)?.collateralDeltaAmount).toBe(0n);
    expect(selectPositionSellerKeepLeverage(state)).toBe(false);
    expect(selectPositionSellerDecreaseAmounts(state)?.collateralDeltaAmount).toBe(0n);
    expect(selectPositionSellerDecreaseError(state)).toEqual({});
  });

  it("keeps the 1 USD collateral floor of a market close only where the contract would close the whole position", () => {
    // 0.5 of collateral and 200 of profit: the remaining 40 has 0.5 + 0.8 of margin against 0.4, which the contract
    // executes; only the TWAP tab, at 80x, keeps the release collateral floor
    const params = { collateralUsd: usd(1) / 2n, pnlUsd: usd(200), closeUsd: "9960", keepLeverage: false };

    expect(selectPositionSellerDecreaseError(createState(params))).toEqual({});
    expect(
      selectPositionSellerDecreaseError(createState({ ...params, orderOption: OrderOption.Twap }))?.buttonErrorMessage
    ).toBe("Leftover margin below 1.00 USD");
    // the remaining 10 has 0.5 + 0.2, under 1 USD: the contract would close the whole position instead
    expect(selectPositionSellerDecreaseError(createState({ ...params, closeUsd: "9990" }))?.buttonErrorMessage).toBe(
      "Leftover margin below 1.00 USD"
    );
  });

  it.each([false, true])(
    "blocks a partial close whose costs exceed the collateral and the profit it realizes, receive split: %s",
    (isReceiveSeparated) => {
      // 50 of collateral, 500 of profit, 200 of pending borrowing: closing 1 000 realizes 50 of profit against 202 of
      // costs, which the contract rejects with InsufficientFundsToPayForCosts; closing half realizes 250 and pays them
      const params = {
        collateralUsd: usd(50),
        pnlUsd: usd(500),
        keepLeverage: false,
        marketInfo: marketInfoWithFee,
        isReceiveSeparated,
        positionOverrides: { pendingBorrowingFeesUsd: usd(200) },
      };

      expect(selectPositionSellerDecreaseError(createState({ ...params, closeUsd: "1000" }))).toEqual({
        buttonErrorMessage: "Insufficient collateral to cover order costs",
      });
      expect(selectPositionSellerDecreaseError(createState({ ...params, closeUsd: "5000" }))).toEqual({});
    }
  );

  it("still blocks when the remainder fails without the collateral withdrawal too", () => {
    const state = createState({ collateralUsd: OVER_LEVERAGED, closeUsd: "2500", keepLeverage: true });

    expect(selectPositionSellerKeepLeverage(state)).toBe(false);
    expect(selectPositionSellerRemainingPositionMarginState(state)?.isLiquidatable).toBe(true);
    expect(selectPositionSellerDecreaseError(state)).toMatchObject(MAX_LEVERAGE_EXCEEDED);
  });

  it("keeps the leverage of a position with enough margin", () => {
    const state = createState({ collateralUsd: usd(3_000), closeUsd: "5000", keepLeverage: true });

    expect(selectPositionSellerLeverageDisabledByCollateral(state)).toBe(false);
    expect(selectPositionSellerKeepLeverage(state)).toBe(true);
    expect(selectPositionSellerDecreaseAmounts(state)!.collateralDeltaAmount).toBeGreaterThan(0n);
    expect(selectPositionSellerRemainingPositionMarginState(state)?.isLiquidatable).toBe(false);
    expect(selectPositionSellerDecreaseError(state)).toEqual({});
  });

  it("leaves the TWAP tab untouched", () => {
    const state = createState({
      collateralUsd: OVER_LEVERAGED,
      closeUsd: "2500",
      keepLeverage: true,
      orderOption: OrderOption.Twap,
    });

    expect(selectPositionSellerRemainingPositionMarginState(state)).toBeUndefined();
    expect(selectPositionSellerLeverageDisabledByCollateral(state)).toBe(false);
    expect(selectPositionSellerDecreaseError(state)).toEqual({});
  });

  // 45 of collateral and 100 of profit: the remaining 5 000 is at 111x without its 50 of pnl, at 52.6x with it
  const PROFITABLE = { collateralUsd: usd(45), pnlUsd: usd(100), closeUsd: "5000", keepLeverage: false };

  it("allows a profitable partial close whose leverage without pnl is over the max allowed", () => {
    const state = createState(PROFITABLE);

    expect(selectPositionSellerNextPositionValuesForDecrease(state)?.nextLeverage).toBeGreaterThan(
      100n * BASIS_POINTS_DIVISOR_BIGINT
    );
    expect(selectPositionSellerRemainingPositionMarginState(state)?.isLiquidatable).toBe(false);
    expect(selectPositionSellerDecreaseError(state)).toEqual({});
  });

  it.each([false, true])("gives the same result with pnl in the displayed leverage: %s", (isPnlInLeverage) => {
    const profitable = createState({ ...PROFITABLE, isPnlInLeverage });
    const overLeveraged = createState({
      collateralUsd: OVER_LEVERAGED,
      closeUsd: "2500",
      keepLeverage: false,
      isPnlInLeverage,
    });

    expect(selectPositionSellerDecreaseError(profitable)).toEqual({});
    expect(selectPositionSellerDecreaseError(overLeveraged)).toMatchObject(MAX_LEVERAGE_EXCEEDED);
  });
});

describe("position seller — closing costs of a profitable market partial close", () => {
  // 0.2 % position fee: closing half of the 10 000 costs 10, and so will closing the remaining half.
  // 45 of collateral and 40 of profit: the remaining 5 000 needs 50 and gets 20 of pnl minus that 10
  const params = {
    collateralUsd: usd(45),
    pnlUsd: usd(40),
    closeUsd: "5000",
    keepLeverage: false,
    marketInfo: marketInfoWithFee,
  };

  it("pays them from the profit when it is swapped to the collateral token", () => {
    const state = createState(params);

    expect(selectPositionSellerRemainingPositionMarginState(state)?.isLiquidatable).toBe(false);
    expect(selectPositionSellerDecreaseError(state)).toEqual({});
  });

  it("values the profit that pays them at the contract's price sides", () => {
    // ETH at 1 990 / 2 010: the contract credits the profit in ETH at 2 010 and swaps it to USDC at 1 990
    const spreadEth = { ...ETH_TOKEN, prices: { minPrice: usd(1_990), maxPrice: usd(2_010) } };
    const state = createState({
      ...params,
      collateralUsd: usd(100),
      pnlUsd: usd(60),
      marketInfo: createMockMarketInfo(spreadEth, {
        positionFeeFactorForBalanceWasImproved: expandDecimals(2, 27),
        positionFeeFactorForBalanceWasNotImproved: expandDecimals(2, 27),
        positionImpactFactorPositive: 0n,
        positionImpactFactorNegative: 0n,
      }),
      tokensData: { [USDC_ADDRESS]: USDC_TOKEN, [ETH_ADDRESS]: spreadEth },
    });
    const amounts = selectPositionSellerDecreaseAmounts(state)!;
    const profitInEth = convertToTokenAmount(amounts.realizedPnl, ETH_TOKEN.decimals, usd(2_010));
    const profitInUsdc = convertToTokenAmount(
      convertToUsd(profitInEth, ETH_TOKEN.decimals, usd(1_990)),
      USDC_TOKEN.decimals,
      USDC_TOKEN.prices.maxPrice
    )!;

    // the 10 of costs are more than the 4.85 of realized profit, so all of it pays them
    expect(amounts.payedOutputUsd).toBe(convertToUsd(profitInUsdc, USDC_TOKEN.decimals, USDC_TOKEN.prices.minPrice));

    const twapAmounts = selectPositionSellerDecreaseAmounts({
      ...state,
      positionSeller: { ...state.positionSeller, orderOption: OrderOption.Twap },
    } as SyntheticsState)!;

    expect(twapAmounts.payedOutputUsd).toBe(twapAmounts.realizedPnl);
  });

  it("charges them to the collateral when the pnl token is received", () => {
    const state = createState({ ...params, receiveTokenAddress: ETH_ADDRESS });
    const marginState = selectPositionSellerRemainingPositionMarginState(state);
    const amounts = selectPositionSellerDecreaseAmounts(state)!;

    expect(marginState?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
    expect(marginState?.remainingCollateralUsd).toBe(usd(45));
    expect(marginState?.minCollateralUsdForLeverage).toBe(usd(50));
    expect(selectPositionSellerDecreaseError(state)).toMatchObject(MAX_LEVERAGE_EXCEEDED);
    // nothing is withdrawn, so the contract swaps nothing: all 20 of profit arrives in ETH without a swap fee
    expect(amounts.swapProfitFeeUsd).toBe(0n);
    expect(amounts.primaryOutput.usd).toBe(usd(20));
  });

  it.each([
    {
      pool: "the shorts reserve the whole USDC pool",
      overrides: { shortInterestUsd: usd(4_000_000) },
      isReverted: true,
    },
    {
      pool: "the ETH pool is over its cap",
      overrides: { maxLongPoolAmount: expandDecimals(999, 18) },
      isReverted: true,
    },
    {
      pool: "the ETH pool is just under its cap",
      overrides: { maxLongPoolAmount: expandDecimals(1000, 18) + 1n },
      isReverted: false,
    },
  ])(
    "follows the contract's swap of the profit to the collateral token when $pool PRO-4354",
    ({ overrides, isReverted }) => {
      // a reverted swap keeps the ETH profit in ETH and takes the 10 of costs from the collateral, as when the pnl token is
      // received; the swap only returns to the ETH pool the profit the decrease took out of it, so it cannot pass the cap
      const state = createState({
        ...params,
        marketInfo: createMockMarketInfo(ETH_TOKEN, {
          positionFeeFactorForBalanceWasImproved: expandDecimals(2, 27),
          positionFeeFactorForBalanceWasNotImproved: expandDecimals(2, 27),
          positionImpactFactorPositive: 0n,
          positionImpactFactorNegative: 0n,
          ...overrides,
        }),
      });

      expect(selectPositionSellerRemainingPositionMarginState(state)?.remainingCollateralUsd).toBe(
        usd(isReverted ? 45 : 55)
      );
      expect(selectPositionSellerDecreaseAmounts(state)?.primaryOutput.usd).toBe(isReverted ? usd(20) : 0n);
      expect(selectPositionSellerDecreaseError(state)?.buttonErrorMessage).toBe(
        isReverted ? MAX_LEVERAGE_EXCEEDED.buttonErrorMessage : undefined
      );
    }
  );

  it("takes the pro discount off the fee of the close itself PRO-4354", () => {
    // a 50 % pro discount halves both fees to 5: 42 - 5 of collateral and 20 - 5 of pnl leave 52 against 50
    const state = createState({
      ...params,
      collateralUsd: usd(42),
      receiveTokenAddress: ETH_ADDRESS,
      proDiscountFactor: expandDecimals(5, 29),
    });

    expect(selectPositionSellerRemainingPositionMarginState(state)?.remainingCollateralUsd).toBe(usd(52));
    expect(selectPositionSellerDecreaseError(state)).toEqual({});
  });

  it("charges them to the collateral when the receive is split", () => {
    const state = createState({ ...params, isReceiveSeparated: true });
    const marginState = selectPositionSellerRemainingPositionMarginState(state);

    expect(marginState?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
    expect(marginState?.remainingCollateralUsd).toBe(usd(45));
    expect(selectPositionSellerDecreaseError(state)).toMatchObject(MAX_LEVERAGE_EXCEEDED);
    // the preview and the payout follow the contract: 45 - 10 of collateral stays, all 20 of profit is paid out
    expect(selectPositionSellerNextPositionValuesForDecrease(state)?.nextCollateralUsd).toBe(usd(35));
    expect(selectPositionSellerDecreaseAmounts(state)?.primaryOutput.usd).toBe(usd(20));
  });

  it("sizes the keep-leverage withdrawal after the costs the order will charge", () => {
    // half of 100.5 / +30: swapping the profit pays the 10 of costs out of it, a split receive out of the collateral,
    // so the split withdrawal is 10 smaller and both leave 50.25 of collateral and 15 of pnl (55.25 against 50)
    const keepLeverageParams = { ...params, collateralUsd: usd(201) / 2n, pnlUsd: usd(30), keepLeverage: true };
    const swapped = createState(keepLeverageParams);
    const split = createState({ ...keepLeverageParams, isReceiveSeparated: true });

    expect(selectPositionSellerKeepLeverage(swapped)).toBe(true);
    expect(selectPositionSellerKeepLeverage(split)).toBe(true);
    expect(
      selectPositionSellerDecreaseAmounts(swapped)!.collateralDeltaAmount -
        selectPositionSellerDecreaseAmounts(split)!.collateralDeltaAmount
    ).toBe(expandDecimals(10, USDC_TOKEN.decimals));
    expect(selectPositionSellerRemainingPositionMarginState(split)?.isLiquidatable).toBe(false);
    expect(selectPositionSellerDecreaseError(split)).toEqual({});
    expect(
      selectPositionSellerLeverageDisabledByCollateral(
        createState({ ...keepLeverageParams, isReceiveSeparated: true, orderOption: OrderOption.Twap })
      )
    ).toBe(false);
  });
});

describe("position seller — leverage verdict of a market partial close", () => {
  it("blocks on leverage exactly when the remaining-position check fails", () => {
    // seeded sweep over margin, pnl, close size, fees, keep leverage and receive mode
    let seed = 7;
    const next = (max: number) => (seed = (seed * 16807) % 2147483647) % max;

    for (let i = 0; i < 300; i++) {
      const state = createState({
        collateralUsd: usd(20 + next(3000)),
        pnlUsd: usd(next(4500) - 1500),
        closeUsd: String(100 + next(9800)),
        keepLeverage: next(2) === 0,
        marketInfo: next(2) === 0 ? marketInfo : marketInfoWithFee,
        receiveTokenAddress: next(3) === 0 ? ETH_ADDRESS : undefined,
        isReceiveSeparated: next(4) === 0,
      });
      const isLiquidatable = Boolean(selectPositionSellerRemainingPositionMarginState(state)?.isLiquidatable);
      const buttonErrorMessage = selectPositionSellerDecreaseError(state)?.buttonErrorMessage;

      if (isLiquidatable) {
        expect(buttonErrorMessage).toBeDefined();
      } else {
        expect(buttonErrorMessage ?? "").not.toMatch(/^Max leverage/);
      }
    }
  });
});
