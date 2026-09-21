import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { createMockMarketInfo, MOCK_MARKET_ADDRESS } from "domain/testUtils/mockMarketInfo";
import { ETH_TOKEN, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { createFindSwapPath } from "sdk/utils/swap/swapPath";
import { convertToTokenAmount, convertToUsd } from "sdk/utils/tokens";
import {
  getIsMaxLeverageMarginReason,
  PositionMarginFailureReason,
  PositionMarginState,
} from "sdk/utils/trade/increaseMarginCheck";

import {
  DepositMarginNowAction,
  LiquidatableIncreaseMessage,
  ReplaceMarginDepositAction,
} from "components/MarginRemediation/MarginRemediationActions";

import { NextPositionValues } from "../../trade";
import { OrderType, PositionOrderInfo } from "../types";
import {
  getOrderErrors,
  getOrderIncreaseNextPositionValues,
  getOrderIncreaseProjection,
  getOrderIncreaseResultingPositionMarginState,
} from "../utils";

type RemediationActionElement = ReactElement<{ positionKey?: string; orderKey?: string }>;

// Trans compiles an embedded action into props.components["0"]
function getTransProps(msg: unknown) {
  const element = msg as ReactElement<{
    message?: string;
    components?: Record<string, RemediationActionElement>;
  }>;

  return { message: element.props.message, action: element.props.components?.["0"] };
}

function getMessageElement(msg: unknown) {
  return msg as ReactElement<{ positionKey?: string }>;
}

const tokensData = mockTokensData();
const marketsInfoData = mockMarketsInfoData(tokensData, ["BTC-BTC-USDC"], {
  "BTC-BTC-USDC": { minCollateralFactor: expandDecimals(1, 28) },
});
const marketInfo = marketsInfoData["BTC-BTC-USDC"];

function makeIncreaseOrder(orderType: OrderType, overrides: Partial<PositionOrderInfo> = {}): PositionOrderInfo {
  return {
    key: "order-key",
    account: "0x1111111111111111111111111111111111111111",
    marketAddress: marketInfo.marketTokenAddress,
    marketInfo,
    indexToken: marketInfo.indexToken,
    initialCollateralToken: tokensData.USDC,
    targetCollateralToken: tokensData.USDC,
    initialCollateralTokenAddress: tokensData.USDC.address,
    initialCollateralDeltaAmount: expandDecimals(1000, 6),
    sizeDeltaUsd: expandDecimals(10_000, 30),
    triggerPrice: expandDecimals(50_000, 30),
    acceptablePrice: expandDecimals(50_500, 30),
    minOutputAmount: 0n,
    swapPath: [],
    swapPathStats: undefined,
    isLong: true,
    isTwap: false,
    isSwap: false,
    orderType,
    validFromTime: 0n,
    updatedAtTime: 0n,
    ...overrides,
  } as unknown as PositionOrderInfo;
}

const baseParams = {
  marketsInfoData,
  positionsInfoData: {},
  isSetAcceptablePriceImpactEnabled: false,
};

const nextValues = (nextLiqPrice: bigint) => ({ nextLiqPrice }) as NextPositionValues;

type ProjectionArgs = Parameters<typeof getOrderIncreaseProjection>[0];

function marginStateFor(args: ProjectionArgs & { minCollateralUsd: bigint }) {
  return getOrderIncreaseResultingPositionMarginState({
    projection: getOrderIncreaseProjection(args),
    minCollateralUsd: args.minCollateralUsd,
    userReferralInfo: args.userReferralInfo,
    proDiscountFactor: args.proDiscountFactor,
  });
}

const hasLiquidatableError = (result: ReturnType<typeof getOrderErrors>) =>
  result.errors.some((e) => e.key === "resultingLiquidatable" && e.level === "error");

describe("getOrderErrors — resulting position liquidatable at trigger price", () => {
  it("flags a long Limit Increase when nextLiqPrice is above the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      order: makeIncreaseOrder(OrderType.LimitIncrease),
      nextPositionValues: nextValues(expandDecimals(55_000, 30)),
    });

    expect(hasLiquidatableError(result)).toBe(true);

    const message = getMessageElement(result.errors.find((error) => error.key === "resultingLiquidatable")?.msg);
    expect(message.type).toBe(LiquidatableIncreaseMessage);
    expect(message.props.positionKey).toBeUndefined();
    expect(result.level).toBe("error");
  });

  it("does not flag a long Limit Increase when nextLiqPrice is below the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      order: makeIncreaseOrder(OrderType.LimitIncrease),
      nextPositionValues: nextValues(expandDecimals(45_000, 30)),
    });

    expect(hasLiquidatableError(result)).toBe(false);
  });

  it("flags a short Stop Increase when nextLiqPrice is below the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      order: makeIncreaseOrder(OrderType.StopIncrease, { isLong: false }),
      nextPositionValues: nextValues(expandDecimals(45_000, 30)),
    });

    expect(hasLiquidatableError(result)).toBe(true);
  });

  it("does not flag a Market Increase order even if nextPositionValues are provided", () => {
    const result = getOrderErrors({
      ...baseParams,
      order: makeIncreaseOrder(OrderType.MarketIncrease, { triggerPrice: 0n }),
      nextPositionValues: nextValues(expandDecimals(55_000, 30)),
    });

    expect(hasLiquidatableError(result)).toBe(false);
  });

  it("does not flag when nextPositionValues are missing", () => {
    const result = getOrderErrors({
      ...baseParams,
      order: makeIncreaseOrder(OrderType.LimitIncrease),
    });

    expect(hasLiquidatableError(result)).toBe(false);
  });

  const positionKey = `0x1111111111111111111111111111111111111111:${marketInfo.marketTokenAddress}:USDC:true`;

  function makePosition(liquidationPrice: bigint) {
    return {
      key: positionKey,
      isLong: true,
      sizeInUsd: expandDecimals(20_000, 30),
      collateralUsd: expandDecimals(2_000, 30),
      liquidationPrice,
    } as any;
  }

  it("does not flag when the trigger is beyond the current position's liq price", () => {
    const result = getOrderErrors({
      ...baseParams,
      positionsInfoData: { [positionKey]: makePosition(expandDecimals(55_000, 30)) },
      order: makeIncreaseOrder(OrderType.LimitIncrease),
      nextPositionValues: nextValues(expandDecimals(56_000, 30)),
    });

    expect(hasLiquidatableError(result)).toBe(false);
  });

  it("flags when the position is alive at the trigger and the resulting position is liquidatable", () => {
    const result = getOrderErrors({
      ...baseParams,
      positionsInfoData: { [positionKey]: makePosition(expandDecimals(45_000, 30)) },
      order: makeIncreaseOrder(OrderType.LimitIncrease),
      nextPositionValues: nextValues(expandDecimals(52_000, 30)),
    });

    expect(hasLiquidatableError(result)).toBe(true);

    const message = getMessageElement(result.errors.find((error) => error.key === "resultingLiquidatable")?.msg);
    expect(message.props.positionKey).toBe(positionKey);
  });
});

describe("getOrderErrors — margin deposit orders", () => {
  const ACCOUNT = "0x1111111111111111111111111111111111111111";

  function makeDepositOrder(overrides: Partial<PositionOrderInfo> = {}) {
    return makeIncreaseOrder(OrderType.LimitIncrease, {
      account: ACCOUNT,
      sizeDeltaUsd: 0n,
      initialCollateralDeltaAmount: expandDecimals(5_000, 6),
      triggerPrice: expandDecimals(18_500, 30),
      ...overrides,
    });
  }

  function makeDepositPosition(liquidationPrice: bigint) {
    return mockPositionInfo(
      {
        marketInfo,
        collateralTokenAddress: tokensData.USDC.address,
        account: ACCOUNT,
        isLong: true,
        sizeInUsd: expandDecimals(10_000, 30),
        collateralUsd: expandDecimals(1_000, 30),
      },
      { liquidationPrice }
    );
  }

  /** 10k BTC position at $20k with $3k USDC margin: liq ≈ $14.2k long, $25.8k short. */
  function makeFundedPosition(p: {
    liquidationPrice: bigint;
    isLong?: boolean;
    pendingBorrowingFeesUsd?: bigint;
    pendingFundingFeesUsd?: bigint;
  }) {
    const isLong = p.isLong ?? true;

    return mockPositionInfo(
      {
        marketInfo,
        collateralTokenAddress: tokensData.USDC.address,
        account: ACCOUNT,
        isLong,
        sizeInUsd: expandDecimals(10_000, 30),
        collateralUsd: expandDecimals(3_000, 30),
      },
      {
        isLong,
        liquidationPrice: p.liquidationPrice,
        pendingBorrowingFeesUsd: p.pendingBorrowingFeesUsd ?? 0n,
        pendingFundingFeesUsd: p.pendingFundingFeesUsd ?? 0n,
      }
    );
  }

  const depositParams = {
    ...baseParams,
    minCollateralUsd: expandDecimals(10, 30),
    userReferralInfo: undefined,
  };

  const errorKeys = (result: ReturnType<typeof getOrderErrors>) => result.errors.map((e) => e.key);

  it("returns the red state when the deposit still leaves the position liquidatable at the trigger", () => {
    const position = makeDepositPosition(expandDecimals(19_000, 30));

    const result = getOrderErrors({
      ...depositParams,
      positionsInfoData: { [position.key]: position },
      order: makeDepositOrder({
        initialCollateralDeltaAmount: expandDecimals(1, 6),
        triggerPrice: expandDecimals(15_000, 30),
      }),
    });

    expect(errorKeys(result)).toEqual(["marginDepositInsufficient"]);
    expect(result.level).toBe("error");

    const { message, action } = getTransProps(result.errors[0].msg);
    expect(message).toBe(
      "This margin deposit may not execute: it would not leave the position above the liquidation requirement at the trigger price. <0>Increase the deposit amount</0> or move the trigger farther from liquidation."
    );
    expect(action?.type).toBe(ReplaceMarginDepositAction);
    expect(action?.props.positionKey).toBe(position.key);
    expect(action?.props.orderKey).toBe("order-key");
  });

  it("returns the yellow state when the trigger is at or beyond the current liquidation price", () => {
    const position = makeDepositPosition(expandDecimals(19_000, 30));

    const result = getOrderErrors({
      ...depositParams,
      positionsInfoData: { [position.key]: position },
      order: makeDepositOrder(),
    });

    expect(errorKeys(result)).toEqual(["marginDepositBeyondLiqPrice"]);
    expect(result.level).toBe("warning");
  });

  it("returns no state when the trigger is a safe distance from liquidation", () => {
    const position = makeDepositPosition(expandDecimals(15_000, 30));

    const result = getOrderErrors({
      ...depositParams,
      positionsInfoData: { [position.key]: position },
      order: makeDepositOrder(),
    });

    expect(result.errors).toEqual([]);
    expect(result.level).toBeUndefined();
  });

  it("reports an orphaned deposit and skips the standard increase checks when no position matches", () => {
    const otherCollateralPosition = mockPositionInfo({
      marketInfo,
      collateralTokenAddress: tokensData.BTC.address,
      account: ACCOUNT,
      isLong: true,
      sizeInUsd: expandDecimals(10_000, 30),
      collateralUsd: expandDecimals(1_000, 30),
    });

    const result = getOrderErrors({
      ...depositParams,
      isSetAcceptablePriceImpactEnabled: true,
      positionsInfoData: { [otherCollateralPosition.key]: otherCollateralPosition },
      order: makeDepositOrder(),
    });

    // the standard path would add the "collateralToken" mismatch warning here
    expect(errorKeys(result)).toEqual(["marginDepositNoPosition"]);
    expect(result.level).toBe("error");
  });

  it("reports an orphaned deposit when the account has no positions at all", () => {
    const result = getOrderErrors({
      ...depositParams,
      positionsInfoData: {},
      order: makeDepositOrder(),
    });

    expect(errorKeys(result)).toEqual(["marginDepositNoPosition"]);
    expect(result.level).toBe("error");
  });

  it("stays silent while positions are still loading", () => {
    const result = getOrderErrors({
      ...depositParams,
      positionsInfoData: undefined,
      order: makeDepositOrder(),
    });

    expect(result.errors).toEqual([]);
  });

  it("leaves a regular Limit Increase with a positive size on the standard path", () => {
    const otherCollateralPosition = mockPositionInfo({
      marketInfo,
      collateralTokenAddress: tokensData.BTC.address,
      account: ACCOUNT,
      isLong: true,
      sizeInUsd: expandDecimals(10_000, 30),
      collateralUsd: expandDecimals(1_000, 30),
    });

    const result = getOrderErrors({
      ...depositParams,
      positionsInfoData: { [otherCollateralPosition.key]: otherCollateralPosition },
      order: makeIncreaseOrder(OrderType.LimitIncrease, { account: ACCOUNT }),
    });

    expect(errorKeys(result)).toContain("collateralToken");
    expect(errorKeys(result)).not.toContain("marginDepositInsufficient");
    expect(errorKeys(result)).not.toContain("marginDepositBeyondLiqPrice");
  });

  it("flips to the red state once accrued fees eat into the deposit", () => {
    const order = makeDepositOrder({
      initialCollateralDeltaAmount: expandDecimals(2_000, 6),
      triggerPrice: expandDecimals(12_000, 30),
    });

    const withoutFees = makeFundedPosition({ liquidationPrice: expandDecimals(11_000, 30) });
    const withFees = makeFundedPosition({
      liquidationPrice: expandDecimals(11_000, 30),
      pendingBorrowingFeesUsd: expandDecimals(900, 30),
      pendingFundingFeesUsd: expandDecimals(600, 30),
    });

    expect(
      getOrderErrors({ ...depositParams, positionsInfoData: { [withoutFees.key]: withoutFees }, order }).errors
    ).toEqual([]);

    expect(
      errorKeys(getOrderErrors({ ...depositParams, positionsInfoData: { [withFees.key]: withFees }, order }))
    ).toEqual(["marginDepositInsufficient"]);
  });

  it("evaluates concurrent deposits against their own amount and trigger only", () => {
    const position = makeFundedPosition({ liquidationPrice: expandDecimals(11_000, 30) });
    const positionsInfoData = { [position.key]: position };

    const funded = makeDepositOrder({
      key: "deposit-funded",
      initialCollateralDeltaAmount: expandDecimals(2_000, 6),
      triggerPrice: expandDecimals(12_000, 30),
    });
    const dust = makeDepositOrder({
      key: "deposit-dust",
      initialCollateralDeltaAmount: expandDecimals(1, 6),
      triggerPrice: expandDecimals(13_500, 30),
    });

    expect(getOrderErrors({ ...depositParams, positionsInfoData, order: funded }).errors).toEqual([]);
    expect(errorKeys(getOrderErrors({ ...depositParams, positionsInfoData, order: dust }))).toEqual([
      "marginDepositInsufficient",
    ]);
  });

  it("clears the red state once the trigger moves away from liquidation", () => {
    const position = makeFundedPosition({ liquidationPrice: expandDecimals(11_000, 30) });
    const positionsInfoData = { [position.key]: position };

    const nearLiquidation = makeDepositOrder({
      initialCollateralDeltaAmount: expandDecimals(1, 6),
      triggerPrice: expandDecimals(13_500, 30),
    });
    const movedAway = makeDepositOrder({
      initialCollateralDeltaAmount: expandDecimals(1, 6),
      triggerPrice: expandDecimals(16_000, 30),
    });

    expect(errorKeys(getOrderErrors({ ...depositParams, positionsInfoData, order: nearLiquidation }))).toEqual([
      "marginDepositInsufficient",
    ]);
    expect(getOrderErrors({ ...depositParams, positionsInfoData, order: movedAway }).errors).toEqual([]);
  });

  describe("short positions", () => {
    const shortDepositOrder = (overrides: Partial<PositionOrderInfo> = {}) =>
      makeDepositOrder({ isLong: false, ...overrides });

    it("returns the red state when the deposit leaves the short liquidatable at the trigger", () => {
      const position = makeFundedPosition({ isLong: false, liquidationPrice: expandDecimals(29_000, 30) });

      const result = getOrderErrors({
        ...depositParams,
        positionsInfoData: { [position.key]: position },
        order: shortDepositOrder({
          initialCollateralDeltaAmount: expandDecimals(1, 6),
          triggerPrice: expandDecimals(27_000, 30),
        }),
      });

      expect(errorKeys(result)).toEqual(["marginDepositInsufficient"]);
    });

    it("returns the yellow state when the short trigger is at or beyond the current liquidation price", () => {
      const position = makeFundedPosition({ isLong: false, liquidationPrice: expandDecimals(27_000, 30) });

      const result = getOrderErrors({
        ...depositParams,
        positionsInfoData: { [position.key]: position },
        order: shortDepositOrder({
          initialCollateralDeltaAmount: expandDecimals(2_000, 6),
          triggerPrice: expandDecimals(28_000, 30),
        }),
      });

      expect(errorKeys(result)).toEqual(["marginDepositBeyondLiqPrice"]);
      expect(result.level).toBe("warning");
    });

    it("returns no state for a short trigger a safe distance from liquidation", () => {
      const position = makeFundedPosition({ isLong: false, liquidationPrice: expandDecimals(27_000, 30) });

      const result = getOrderErrors({
        ...depositParams,
        positionsInfoData: { [position.key]: position },
        order: shortDepositOrder({
          initialCollateralDeltaAmount: expandDecimals(2_000, 6),
          triggerPrice: expandDecimals(26_000, 30),
        }),
      });

      expect(result.errors).toEqual([]);
    });
  });

  it("skips the standard increase checks that the same order would trip with a size", () => {
    const position = makeFundedPosition({ liquidationPrice: expandDecimals(11_000, 30) });
    const positionsInfoData = { [position.key]: position };

    // exactly the state the standard increase path reports as "resultingLiquidatable"
    const params = {
      ...depositParams,
      positionsInfoData,
      isSetAcceptablePriceImpactEnabled: true,
      nextPositionValues: nextValues(expandDecimals(13_000, 30)),
    };

    const deposit = getOrderErrors({
      ...params,
      order: makeDepositOrder({
        initialCollateralDeltaAmount: expandDecimals(2_000, 6),
        triggerPrice: expandDecimals(12_000, 30),
      }),
    });

    expect(deposit.errors).toEqual([]);

    // control: the same inputs with a positive size do produce the standard error
    const regularIncrease = getOrderErrors({
      ...params,
      order: makeIncreaseOrder(OrderType.LimitIncrease, {
        account: ACCOUNT,
        triggerPrice: expandDecimals(12_000, 30),
      }),
    });

    expect(errorKeys(regularIncrease)).toContain("resultingLiquidatable");
  });
});

describe("getOrderErrors — position liquidated before the trigger price", () => {
  const shortPositionKey = `0x1111111111111111111111111111111111111111:${marketInfo.marketTokenAddress}:USDC:false`;
  const longPositionKey = `0x1111111111111111111111111111111111111111:${marketInfo.marketTokenAddress}:USDC:true`;

  function makePosition(key: string, isLong: boolean, liquidationPrice: bigint) {
    return {
      key,
      isLong,
      sizeInUsd: expandDecimals(20_000, 30),
      collateralUsd: expandDecimals(2_000, 30),
      liquidationPrice,
    } as any;
  }

  const hasFreshPositionWarning = (result: ReturnType<typeof getOrderErrors>) =>
    result.errors.some((e) => e.key === "liquidatedBeforeTrigger" && e.level === "warning");

  it("warns for a long Limit Increase when the liq price is above the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      positionsInfoData: { [longPositionKey]: makePosition(longPositionKey, true, expandDecimals(55_000, 30)) },
      order: makeIncreaseOrder(OrderType.LimitIncrease),
    });

    expect(hasFreshPositionWarning(result)).toBe(true);
  });

  it("does not warn for a long Limit Increase when the position survives at the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      positionsInfoData: { [longPositionKey]: makePosition(longPositionKey, true, expandDecimals(45_000, 30)) },
      order: makeIncreaseOrder(OrderType.LimitIncrease),
    });

    expect(hasFreshPositionWarning(result)).toBe(false);
  });

  it("warns for a short Limit Increase when the liq price is below the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      positionsInfoData: { [shortPositionKey]: makePosition(shortPositionKey, false, expandDecimals(45_000, 30)) },
      order: makeIncreaseOrder(OrderType.LimitIncrease, { isLong: false }),
    });

    expect(hasFreshPositionWarning(result)).toBe(true);
  });

  it("does not warn for a short Limit Increase when the position survives at the trigger price", () => {
    const result = getOrderErrors({
      ...baseParams,
      positionsInfoData: { [shortPositionKey]: makePosition(shortPositionKey, false, expandDecimals(55_000, 30)) },
      order: makeIncreaseOrder(OrderType.LimitIncrease, { isLong: false }),
    });

    expect(hasFreshPositionWarning(result)).toBe(false);
  });

  it("does not warn without an existing position", () => {
    const result = getOrderErrors({
      ...baseParams,
      order: makeIncreaseOrder(OrderType.LimitIncrease),
    });

    expect(hasFreshPositionWarning(result)).toBe(false);
  });
});

describe("getOrderErrors — resulting position margin, end-to-end from order + position state", () => {
  const maxLeverageErrors = (result: ReturnType<typeof getOrderErrors>) =>
    result.errors.filter((e) => e.key === "maxLeverage");
  const liquidatableErrors = (result: ReturnType<typeof getOrderErrors>) =>
    result.errors.filter((e) => e.key === "resultingLiquidatable");

  const minCollateralUsd = expandDecimals(1, 30);
  const currentPrice = expandDecimals(20_000, 30); // the mock BTC oracle price

  // fees and impact are zeroed so the scenarios are exact; 1% min collateral factor → 100x;
  // the pool is deep enough that the liquidity check stays out of the way
  const cleanMarketsInfoData = mockMarketsInfoData(tokensData, ["BTC-BTC-USDC"], {
    "BTC-BTC-USDC": {
      longPoolAmount: expandDecimals(1_000, 8),
      maxOpenInterestLong: expandDecimals(1_000_000_000, 30),
      minCollateralFactor: expandDecimals(1, 28),
      minCollateralFactorForLiquidation: expandDecimals(5, 27),
      minCollateralFactorForOpenInterestLong: 0n,
      minCollateralFactorForOpenInterestShort: 0n,
      positionFeeFactorForBalanceWasImproved: 0n,
      positionFeeFactorForBalanceWasNotImproved: 0n,
      positionImpactFactorPositive: 0n,
      positionImpactFactorNegative: 0n,
      maxPositionImpactFactorPositive: 0n,
      maxPositionImpactFactorNegative: 0n,
      maxPositionImpactFactorForLiquidations: 0n,
    },
  });
  const cleanMarketInfo = cleanMarketsInfoData["BTC-BTC-USDC"];

  function makeCleanOrder(orderType: OrderType, overrides: Partial<PositionOrderInfo> = {}) {
    return makeIncreaseOrder(orderType, {
      marketInfo: cleanMarketInfo,
      marketAddress: cleanMarketInfo.marketTokenAddress,
      indexToken: cleanMarketInfo.indexToken,
      ...overrides,
    });
  }

  /** A long opened exactly at the current oracle price: flat pnl now, ±pnl at any other price. */
  function makeFlatPosition(p: { sizeUsd: number; collateralUsd: number }) {
    const sizeInUsd = expandDecimals(p.sizeUsd, 30);
    return {
      key: "position-key",
      marketInfo: cleanMarketInfo,
      indexToken: cleanMarketInfo.indexToken,
      collateralToken: tokensData.USDC,
      isLong: true,
      sizeInUsd,
      sizeInTokens: convertToTokenAmount(sizeInUsd, cleanMarketInfo.indexToken.decimals, currentPrice)!,
      collateralUsd: expandDecimals(p.collateralUsd, 30),
      collateralAmount: convertToTokenAmount(
        expandDecimals(p.collateralUsd, 30),
        tokensData.USDC.decimals,
        expandDecimals(1, 30)
      )!,
      pendingImpactAmount: 0n,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
      fundingFeeAmount: 0n,
    } as any;
  }

  // the same key composition isOrderForPosition matches on, so the order-level check
  // sees the position exactly like in production
  function positionKeyFor(order: PositionOrderInfo) {
    return `${order.account}:${order.marketAddress}:${order.targetCollateralToken.address}:${order.isLong}`;
  }

  // the full production chain: order + position + market → one projection at the evaluation
  // price → next position values without pnl and the contract margin check → order error mark;
  // no hand-made intermediate state
  function runOrderErrors(order: PositionOrderInfo, position?: any) {
    const positionsInfoData = position ? { [positionKeyFor(order)]: { ...position, key: positionKeyFor(order) } } : {};
    const projection = getOrderIncreaseProjection({
      order,
      position,
      triggerPrice: order.triggerPrice,
      sizeDeltaUsd: order.sizeDeltaUsd,
      findSwapPath: (() => undefined) as any,
      uiFeeFactor: 0n,
      chainId: ARBITRUM,
      marketsInfoData: cleanMarketsInfoData,
      isSetAcceptablePriceImpactEnabled: false,
      userReferralInfo: undefined,
    });

    return getOrderErrors({
      ...baseParams,
      marketsInfoData: cleanMarketsInfoData,
      positionsInfoData,
      order,
      nextPositionValues: getOrderIncreaseNextPositionValues({
        projection,
        minCollateralUsd,
        userReferralInfo: undefined,
        isPnlInLeverage: false,
      }),
      resultingPositionMarginState: getOrderIncreaseResultingPositionMarginState({
        projection,
        minCollateralUsd,
        userReferralInfo: undefined,
      }),
    });
  }

  // 10 USDC of added margin on 4 000 of added size: passes or fails purely on the
  // existing position's pnl at the evaluation price
  const restingBelowMarket = makeCleanOrder(OrderType.LimitIncrease, {
    triggerPrice: expandDecimals(18_000, 30), // −10% from the market
    sizeDeltaUsd: expandDecimals(4_000, 30),
    initialCollateralDeltaAmount: expandDecimals(10, 6),
  });

  const restingAboveMarket = makeCleanOrder(OrderType.StopIncrease, {
    triggerPrice: expandDecimals(22_000, 30), // +10% from the market
    sizeDeltaUsd: expandDecimals(4_000, 30),
    initialCollateralDeltaAmount: expandDecimals(10, 6),
  });

  it("shows the liquidatable message for a limit below the market that fails on the min-collateral reason", () => {
    // at the trigger the position loses 100 against 70 of total margin → remaining −30 < 1 of
    // min collateral, which is not a leverage failure, so the max-leverage remedy is wrong here;
    // at the current price the same order looks healthy (the trigger-priced tokens would
    // show fake instant profit), so this also locks in the trigger-price evaluation
    const result = runOrderErrors(restingBelowMarket, makeFlatPosition({ sizeUsd: 1_000, collateralUsd: 60 }));

    expect(maxLeverageErrors(result)).toHaveLength(0);
    expect(liquidatableErrors(result)).toHaveLength(1);
    expect(liquidatableErrors(result)[0].level).toBe("error");
    expect(result.errors.filter((e) => e.level === "error")).toHaveLength(1);

    const message = getMessageElement(liquidatableErrors(result)[0].msg);
    expect(message.type).toBe(LiquidatableIncreaseMessage);
    expect(message.props.positionKey).toBe(positionKeyFor(restingBelowMarket));
  });

  it("offers the max-leverage remedy for a limit below the market that fails on the leverage reason", () => {
    // 60 + 80 of margin less the 100 lost at the trigger leaves 40: above the 1 of min collateral
    // and positive, but below 1% of the resulting 5 000 of size (50) → "min collateral for leverage"
    const order = makeCleanOrder(OrderType.LimitIncrease, {
      triggerPrice: expandDecimals(18_000, 30),
      sizeDeltaUsd: expandDecimals(4_000, 30),
      initialCollateralDeltaAmount: expandDecimals(80, 6),
    });

    const result = runOrderErrors(order, makeFlatPosition({ sizeUsd: 1_000, collateralUsd: 60 }));

    expect(liquidatableErrors(result)).toHaveLength(0);
    expect(maxLeverageErrors(result)).toHaveLength(1);
    expect(maxLeverageErrors(result)[0].level).toBe("error");

    const { message, action } = getTransProps(maxLeverageErrors(result)[0].msg);
    expect(message).toBe(
      "This order may fail to execute because the resulting position would exceed the maximum allowed leverage. <0>Increase the position's margin</0> or reduce the order size before it triggers."
    );
    expect(action?.type).toBe(DepositMarginNowAction);
    expect(action?.props.positionKey).toBe(positionKeyFor(order));
  });

  it("does not flag a stop above the market whose position is healthy at the trigger", () => {
    // at the trigger the position is in profit; evaluating at the current price instead
    // would book a fake 10% loss on the trigger-priced tokens and flag a healthy order
    const result = runOrderErrors(restingAboveMarket, makeFlatPosition({ sizeUsd: 1_000, collateralUsd: 60 }));

    expect(maxLeverageErrors(result)).toHaveLength(0);
  });

  it("does not flag a healthy long limit whose trigger the market has already crossed", () => {
    // the market fell through the trigger, so the keeper can execute right now; the order is
    // still sized at 21 000, and evaluating those tokens at the current 20 000 would book a
    // phantom 190 of loss against 200 of margin and block a 20x order
    const executableNow = makeCleanOrder(OrderType.LimitIncrease, {
      triggerPrice: expandDecimals(21_000, 30),
      sizeDeltaUsd: expandDecimals(4_000, 30),
      initialCollateralDeltaAmount: expandDecimals(200, 6),
    });

    const result = runOrderErrors(executableNow);

    expect(maxLeverageErrors(result)).toHaveLength(0);
  });

  it("does not flag a resting order with sufficient margin", () => {
    const wellMargined = makeCleanOrder(OrderType.LimitIncrease, {
      triggerPrice: expandDecimals(18_000, 30),
      sizeDeltaUsd: expandDecimals(4_000, 30),
      initialCollateralDeltaAmount: expandDecimals(600, 6),
    });

    const result = runOrderErrors(wellMargined, makeFlatPosition({ sizeUsd: 1_000, collateralUsd: 60 }));

    expect(maxLeverageErrors(result)).toHaveLength(0);
  });

  it("shows a single liquidatable message when the precise check and the heuristic both fire", () => {
    const position = makeFlatPosition({ sizeUsd: 1_000, collateralUsd: 60 });

    // nextLiqPrice beyond the trigger fires the liq-price heuristic on its own
    const withHeuristic = getOrderErrors({
      ...baseParams,
      marketsInfoData: cleanMarketsInfoData,
      order: restingBelowMarket,
      nextPositionValues: { nextLiqPrice: expandDecimals(19_000, 30) } as NextPositionValues,
      resultingPositionMarginState: marginStateFor({
        order: restingBelowMarket,
        position,
        triggerPrice: restingBelowMarket.triggerPrice,
        sizeDeltaUsd: restingBelowMarket.sizeDeltaUsd,
        findSwapPath: (() => undefined) as any,
        uiFeeFactor: 0n,
        chainId: ARBITRUM,
        marketsInfoData: cleanMarketsInfoData,
        isSetAcceptablePriceImpactEnabled: false,
        minCollateralUsd,
        userReferralInfo: undefined,
      }),
    });

    // the precise prediction fails on min collateral → one liquidatable message, no leverage one
    expect(maxLeverageErrors(withHeuristic)).toHaveLength(0);
    expect(liquidatableErrors(withHeuristic)).toHaveLength(1);
  });

  it("reports a single deduplicated entry when both checks fail", () => {
    // 10 000 000 of size on 1 000 of margin trips the order-level check and the
    // resulting-position check at once
    const overLeveraged = makeCleanOrder(OrderType.LimitIncrease, {
      triggerPrice: expandDecimals(18_000, 30),
      sizeDeltaUsd: expandDecimals(10_000_000, 30),
      initialCollateralDeltaAmount: expandDecimals(1_000, 6),
    });

    const both = runOrderErrors(overLeveraged);

    expect(maxLeverageErrors(both)).toHaveLength(1);
    expect(maxLeverageErrors(both)[0].level).toBe("error");
  });

  // 200 000 of size on 1 000 of margin: the 200x next leverage handed in below trips the order-level check
  const heuristicOverLeveraged = makeCleanOrder(OrderType.LimitIncrease, {
    triggerPrice: expandDecimals(18_000, 30),
    sizeDeltaUsd: expandDecimals(200_000, 30),
    initialCollateralDeltaAmount: expandDecimals(1_000, 6),
  });

  it("keeps a single max-leverage entry when the precise check passes but both heuristics fire", () => {
    const passingState: PositionMarginState = {
      isLiquidatable: false,
      reason: undefined,
      remainingCollateralUsd: expandDecimals(1_000, 30),
      minCollateralUsd,
      minCollateralUsdForLeverage: expandDecimals(500, 30),
    };

    const result = getOrderErrors({
      ...baseParams,
      marketsInfoData: cleanMarketsInfoData,
      order: heuristicOverLeveraged,
      nextPositionValues: {
        nextLiqPrice: expandDecimals(19_000, 30),
        nextLeverage: BigInt(200 * BASIS_POINTS_DIVISOR),
      } as NextPositionValues,
      resultingPositionMarginState: passingState,
    });

    expect(result.errors.map((e) => e.key)).toEqual(["maxLeverage"]);
  });

  it("stays silent on the increase checks while positions are loading", () => {
    const params = {
      ...baseParams,
      marketsInfoData: cleanMarketsInfoData,
      order: heuristicOverLeveraged,
      nextPositionValues: {
        nextLiqPrice: expandDecimals(19_000, 30),
        nextLeverage: BigInt(200 * BASIS_POINTS_DIVISOR),
      } as NextPositionValues,
    };

    expect(getOrderErrors({ ...params, positionsInfoData: undefined }).errors).toEqual([]);

    // control: the same order is flagged once the (empty) positions are known
    expect(getOrderErrors({ ...params, positionsInfoData: {} }).errors.map((e) => e.key)).toEqual(["maxLeverage"]);
  });
});

describe("getOrderIncreaseProjection", () => {
  const triggerPrice = expandDecimals(20_000, 30);

  const baseArgs = {
    position: undefined,
    triggerPrice,
    sizeDeltaUsd: expandDecimals(10_000, 30),
    findSwapPath: (() => undefined) as any,
    uiFeeFactor: 0n,
    chainId: ARBITRUM,
    marketsInfoData,
    isSetAcceptablePriceImpactEnabled: true,
    minCollateralUsd: expandDecimals(1, 30),
    userReferralInfo: undefined,
  };

  it("keeps a stop increase a stop instead of pricing it as a limit", () => {
    const limit = getOrderIncreaseProjection({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice }),
    })!;
    const stop = getOrderIncreaseProjection({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.StopIncrease, { triggerPrice }),
    })!;

    expect(stop.increaseAmounts.limitOrderType).toBe(OrderType.StopIncrease);
    expect(limit.increaseAmounts.limitOrderType).toBe(OrderType.LimitIncrease);
    // a stop has no acceptable-price protection, a limit gets the recommended one
    expect(stop.increaseAmounts.acceptablePrice).not.toBe(limit.increaseAmounts.acceptablePrice);
    // the projection itself is the same at the same trigger
    expect(stop.increaseAmounts.collateralDeltaUsd).toBe(limit.increaseAmounts.collateralDeltaUsd);
    expect(stop.increaseAmounts.sizeDeltaInTokens).toBe(limit.increaseAmounts.sizeDeltaInTokens);
  });

  it("derives the next position values from the same projection the margin check uses", () => {
    const projection = getOrderIncreaseProjection({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice }),
    })!;

    const next = getOrderIncreaseNextPositionValues({
      projection,
      minCollateralUsd: baseArgs.minCollateralUsd,
      userReferralInfo: undefined,
      isPnlInLeverage: false,
    })!;

    expect(next.nextSizeUsd).toBe(projection.increaseAmounts.sizeDeltaUsd);
    expect(next.nextCollateralUsd).toBe(projection.increaseAmounts.collateralDeltaUsd);
    expect(next.nextLeverage).toBeGreaterThan(0n);
  });

  it("skips the next position values for an increase without a deposit and without a position", () => {
    const projection = getOrderIncreaseProjection({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice, initialCollateralDeltaAmount: 0n }),
    });

    expect(projection).toBeDefined();
    expect(
      getOrderIncreaseNextPositionValues({
        projection,
        minCollateralUsd: baseArgs.minCollateralUsd,
        userReferralInfo: undefined,
        isPnlInLeverage: false,
      })
    ).toBeUndefined();
  });

  const ACCOUNT = "0x1111111111111111111111111111111111111111";

  function makeUsdcPosition(p: { marketInfo: typeof marketInfo; sizeUsd: number; collateralUsd: number }) {
    return mockPositionInfo(
      {
        marketInfo: p.marketInfo,
        collateralTokenAddress: tokensData.USDC.address,
        account: ACCOUNT,
        isLong: true,
        sizeInUsd: expandDecimals(p.sizeUsd, 30),
        collateralUsd: expandDecimals(p.collateralUsd, 30),
      },
      { liquidationPrice: expandDecimals(10_000, 30) }
    );
  }

  const sizeOnlyOrder = makeIncreaseOrder(OrderType.LimitIncrease, {
    triggerPrice,
    initialCollateralDeltaAmount: 0n,
    sizeDeltaUsd: expandDecimals(4_000, 30),
  });

  it("derives the next position values for a size-only increase on an existing position", () => {
    const position = makeUsdcPosition({ marketInfo, sizeUsd: 10_000, collateralUsd: 300 });

    const projection = getOrderIncreaseProjection({
      ...baseArgs,
      order: sizeOnlyOrder,
      sizeDeltaUsd: sizeOnlyOrder.sizeDeltaUsd,
      position,
    });

    const next = getOrderIncreaseNextPositionValues({
      projection,
      minCollateralUsd: baseArgs.minCollateralUsd,
      userReferralInfo: undefined,
      isPnlInLeverage: false,
    });

    expect(next).toBeDefined();
    expect(next!.nextCollateralUsd).toBeLessThan(position.collateralUsd);
  });

  it("charges a size-only order's fees against the position's collateral", () => {
    const position = makeUsdcPosition({ marketInfo, sizeUsd: 10_000, collateralUsd: 300 });

    const projection = getOrderIncreaseProjection({
      ...baseArgs,
      uiFeeFactor: expandDecimals(1, 26),
      order: sizeOnlyOrder,
      sizeDeltaUsd: sizeOnlyOrder.sizeDeltaUsd,
      position,
    })!;

    // 0.05% position fee on 4 000 = 2, 0.01% ui fee = 0.4, no pending fees on the fixture
    expect(projection.increaseAmounts.collateralDeltaUsd).toBe(-expandDecimals(24, 29));

    const next = getOrderIncreaseNextPositionValues({
      projection,
      minCollateralUsd: baseArgs.minCollateralUsd,
      userReferralInfo: undefined,
      isPnlInLeverage: false,
    })!;

    // 300 − 2 − 0.4
    expect(next.nextCollateralUsd).toBe(expandDecimals(2976, 29));
  });

  it("fails a size-only order whose fees exceed the position's collateral on a non-leverage reason", () => {
    // no min collateral factor, so the open-interest gate is off and the check reaches the
    // min-collateral floor: 1 − 2.4 of collateral clamps to 0, less 7 of closing fee on 14 000 → "min collateral"
    const floorOnlyMarketInfo = mockMarketsInfoData(tokensData, ["BTC-BTC-USDC"])["BTC-BTC-USDC"];
    const position = makeUsdcPosition({ marketInfo: floorOnlyMarketInfo, sizeUsd: 10_000, collateralUsd: 1 });

    const state = marginStateFor({
      ...baseArgs,
      uiFeeFactor: expandDecimals(1, 26),
      order: { ...sizeOnlyOrder, marketInfo: floorOnlyMarketInfo },
      sizeDeltaUsd: sizeOnlyOrder.sizeDeltaUsd,
      position,
    })!;

    expect(state.isLiquidatable).toBe(true);
    expect(state.reason).toBe(PositionMarginFailureReason.MinCollateral);
    expect(getIsMaxLeverageMarginReason(state.reason)).toBe(false);
  });

  it("values the existing collateral at the trigger when the collateral is the index token", () => {
    const ethMarketInfo = mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"], {
      "ETH-ETH-USDC": { minCollateralFactor: expandDecimals(1, 28) },
    })["ETH-ETH-USDC"];
    const ethTriggerPrice = expandDecimals(1_000, 30); // ETH is mocked at 1 200

    const position = mockPositionInfo(
      {
        marketInfo: ethMarketInfo,
        collateralTokenAddress: tokensData.ETH.address,
        account: ACCOUNT,
        isLong: true,
        sizeInUsd: expandDecimals(6_000, 30),
        collateralUsd: expandDecimals(1_200, 30),
      },
      { liquidationPrice: expandDecimals(500, 30) }
    );

    const projection = getOrderIncreaseProjection({
      ...baseArgs,
      marketsInfoData: { [ethMarketInfo.marketTokenAddress]: ethMarketInfo },
      triggerPrice: ethTriggerPrice,
      sizeDeltaUsd: expandDecimals(3_000, 30),
      position,
      order: makeIncreaseOrder(OrderType.LimitIncrease, {
        marketInfo: ethMarketInfo,
        marketAddress: ethMarketInfo.marketTokenAddress,
        indexToken: ethMarketInfo.indexToken,
        initialCollateralToken: tokensData.ETH,
        initialCollateralTokenAddress: tokensData.ETH.address,
        targetCollateralToken: tokensData.ETH,
        initialCollateralDeltaAmount: expandDecimals(1, 18),
        sizeDeltaUsd: expandDecimals(3_000, 30),
        triggerPrice: ethTriggerPrice,
      }),
    })!;

    const next = getOrderIncreaseNextPositionValues({
      projection,
      minCollateralUsd: baseArgs.minCollateralUsd,
      userReferralInfo: undefined,
      isPnlInLeverage: false,
    })!;

    // 1 ETH of existing collateral is worth 1 000 at the trigger, not the 1 200 booked at the mark
    expect(next.nextCollateralUsd).toBe(
      convertToUsd(position.collateralAmount, 18, ethTriggerPrice)! + projection.increaseAmounts.collateralDeltaUsd
    );
    expect(next.nextCollateralUsd).not.toBe(position.collateralUsd + projection.increaseAmounts.collateralDeltaUsd);
  });
});

describe("getOrderIncreaseProjection — saved swap route", () => {
  // DOGE/USD [WETH-USDC] on Arbitrum: a second WETH→USDC edge in the prebuilt swap graph
  const SECOND_POOL_ADDRESS = "0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4";

  // impact is zeroed on both pools and the fee factors are flat, so only the fee tells the routes apart
  const flatPoolOverrides = (swapFeeFactor: bigint) => ({
    swapFeeFactorForBalanceWasImproved: swapFeeFactor,
    swapFeeFactorForBalanceWasNotImproved: swapFeeFactor,
    swapImpactFactorPositive: 0n,
    swapImpactFactorNegative: 0n,
  });

  const cheapPool = createMockMarketInfo(ETH_TOKEN, flatPoolOverrides(expandDecimals(1, 26))); // 0.01%
  const expensivePool = createMockMarketInfo(ETH_TOKEN, {
    marketTokenAddress: SECOND_POOL_ADDRESS,
    ...flatPoolOverrides(expandDecimals(1, 28)), // 1%
  });
  const twoPoolsMarketsInfoData = {
    [cheapPool.marketTokenAddress]: cheapPool,
    [expensivePool.marketTokenAddress]: expensivePool,
  };

  const triggerPrice = expandDecimals(1_800, 30); // ETH is mocked at 2 000

  function makeEthDepositOrder(swapPath: string[]) {
    return makeIncreaseOrder(OrderType.LimitIncrease, {
      marketInfo: cheapPool,
      marketAddress: cheapPool.marketTokenAddress,
      indexToken: ETH_TOKEN,
      initialCollateralToken: ETH_TOKEN,
      initialCollateralTokenAddress: ETH_TOKEN.address,
      targetCollateralToken: USDC_TOKEN,
      initialCollateralDeltaAmount: expandDecimals(5, 17), // 0.5 ETH
      sizeDeltaUsd: expandDecimals(3_000, 30),
      triggerPrice,
      swapPath,
    });
  }

  function projectAlong(order: PositionOrderInfo, manualPath: string[] | undefined) {
    return getOrderIncreaseProjection({
      order,
      position: undefined,
      triggerPrice,
      sizeDeltaUsd: order.sizeDeltaUsd,
      findSwapPath: createFindSwapPath({
        chainId: ARBITRUM,
        fromTokenAddress: ETH_TOKEN.address,
        toTokenAddress: USDC_TOKEN.address,
        marketsInfoData: twoPoolsMarketsInfoData,
        swapPricingType: undefined,
        manualPath,
      }),
      uiFeeFactor: 0n,
      chainId: ARBITRUM,
      marketsInfoData: twoPoolsMarketsInfoData,
      isSetAcceptablePriceImpactEnabled: false,
      userReferralInfo: undefined,
    });
  }

  it("swaps the deposit along the route saved on the order, not the one the router would pick", () => {
    const routed = projectAlong(makeEthDepositOrder([]), undefined)!;
    expect(routed.increaseAmounts.swapStrategy.swapPathStats?.swapPath).toEqual([MOCK_MARKET_ADDRESS]);

    const saved = makeEthDepositOrder([SECOND_POOL_ADDRESS]);
    const alongSaved = projectAlong(saved, saved.swapPath)!;
    expect(alongSaved.increaseAmounts.swapStrategy.swapPathStats?.swapPath).toEqual(saved.swapPath);

    // 0.5 ETH is 900 at the trigger: 1% is 9 of fee against 0.09 at 0.01% → 8.91 less collateral
    expect(routed.increaseAmounts.collateralDeltaUsd - alongSaved.increaseAmounts.collateralDeltaUsd).toBe(
      expandDecimals(891, 28)
    );
  });

  it("gives up on a saved route through a market missing from the markets data", () => {
    const saved = makeEthDepositOrder(["0x000000000000000000000000000000000000dEaD"]);

    expect(projectAlong(saved, saved.swapPath)).toBeUndefined();
  });

  it("does not blame the leverage when the saved route no longer resolves", () => {
    // the deposit cannot be priced along a dead route, so there is no projection and the order-level
    // check has no next leverage to compare; the route itself is what the order row must complain about.
    // 20 000 of size on 100 of existing margin at a 1% min collateral factor: priced at zero the
    // deposit would let the check see 210x against a 100x cap
    const market = { ...cheapPool, minCollateralFactor: expandDecimals(1, 28) };
    const saved = {
      ...makeEthDepositOrder(["0x000000000000000000000000000000000000dEaD"]),
      marketInfo: market,
      sizeDeltaUsd: expandDecimals(20_000, 30),
    };
    const positionKey = `${saved.account}:${saved.marketAddress}:${saved.targetCollateralToken.address}:${saved.isLong}`;
    const position = {
      ...mockPositionInfo(
        {
          marketInfo: market,
          collateralTokenAddress: USDC_TOKEN.address,
          account: saved.account,
          isLong: true,
          sizeInUsd: expandDecimals(1_000, 30),
          collateralUsd: expandDecimals(100, 30),
        },
        // survives to the 1 800 trigger, so the order is projected onto this position
        { isLong: true, liquidationPrice: expandDecimals(1_500, 30) }
      ),
      key: positionKey,
    };
    const marketsInfoDataWithCap = { ...twoPoolsMarketsInfoData, [market.marketTokenAddress]: market };
    const minCollateralUsd = expandDecimals(1, 30);

    const projection = getOrderIncreaseProjection({
      order: saved,
      position,
      triggerPrice,
      sizeDeltaUsd: saved.sizeDeltaUsd,
      findSwapPath: createFindSwapPath({
        chainId: ARBITRUM,
        fromTokenAddress: ETH_TOKEN.address,
        toTokenAddress: USDC_TOKEN.address,
        marketsInfoData: marketsInfoDataWithCap,
        swapPricingType: undefined,
        manualPath: saved.swapPath,
      }),
      uiFeeFactor: 0n,
      chainId: ARBITRUM,
      marketsInfoData: marketsInfoDataWithCap,
      isSetAcceptablePriceImpactEnabled: false,
      userReferralInfo: undefined,
    });

    expect(projection).toBeUndefined();

    const result = getOrderErrors({
      ...baseParams,
      marketsInfoData: marketsInfoDataWithCap,
      positionsInfoData: { [positionKey]: position },
      order: saved,
      nextPositionValues: getOrderIncreaseNextPositionValues({
        projection,
        minCollateralUsd,
        userReferralInfo: undefined,
        isPnlInLeverage: false,
      }),
      resultingPositionMarginState: getOrderIncreaseResultingPositionMarginState({
        projection,
        minCollateralUsd,
        userReferralInfo: undefined,
      }),
    });

    expect(result.errors.map((e) => e.key)).not.toContain("maxLeverage");
  });
});

describe("getOrderIncreaseResultingPositionMarginState", () => {
  const triggerPrice = expandDecimals(20_000, 30);

  const baseArgs = {
    position: undefined,
    triggerPrice,
    sizeDeltaUsd: expandDecimals(10_000, 30),
    findSwapPath: (() => undefined) as any,
    uiFeeFactor: 0n,
    chainId: ARBITRUM,
    marketsInfoData,
    isSetAcceptablePriceImpactEnabled: false,
    minCollateralUsd: expandDecimals(1, 30),
    userReferralInfo: undefined,
  };

  function makeLosingPosition(sizeInUsd: bigint, valueAtOracle: bigint, collateralUsd: bigint) {
    return {
      key: "position-key",
      marketInfo,
      indexToken: marketInfo.indexToken,
      collateralToken: tokensData.USDC,
      isLong: true,
      sizeInUsd,
      sizeInTokens: convertToTokenAmount(valueAtOracle, marketInfo.indexToken.decimals, triggerPrice)!,
      collateralUsd,
      collateralAmount: convertToTokenAmount(collateralUsd, tokensData.USDC.decimals, expandDecimals(1, 30))!,
      pendingImpactAmount: 0n,
      pendingBorrowingFeesUsd: 0n,
      pendingFundingFeesUsd: 0n,
      fundingFeeAmount: 0n,
    } as any;
  }

  it("returns undefined without a usable trigger price", () => {
    expect(
      marginStateFor({
        ...baseArgs,
        order: makeIncreaseOrder(OrderType.LimitIncrease),
        triggerPrice: 0n,
      })
    ).toBeUndefined();
  });

  it("returns undefined for a decrease order", () => {
    expect(
      marginStateFor({
        ...baseArgs,
        order: makeIncreaseOrder(OrderType.LimitDecrease),
      })
    ).toBeUndefined();
  });

  it("passes for a healthy standalone order", () => {
    const state = marginStateFor({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice }),
    });

    expect(state?.isLiquidatable).toBe(false);
  });

  it("fails when the existing position's loss eats the resulting margin", () => {
    const state = marginStateFor({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice }),
      // 100 000 of size now worth 99 000 → 1 000 of loss against 1 300 of margin: the raw-collateral
      // sufficiency gate passes (1 300 > 1 100 the resulting 110 000 of size needs), while the
      // pnl-aware validation is left with ~300
      position: makeLosingPosition(expandDecimals(100_000, 30), expandDecimals(99_000, 30), expandDecimals(300, 30)),
    });

    expect(state?.reason).toBe(PositionMarginFailureReason.MinCollateralForLeverage);
  });

  it("projects onto a fresh position when the existing one is liquidated before the trigger", () => {
    const doomed = makeLosingPosition(expandDecimals(100_000, 30), expandDecimals(99_000, 30), expandDecimals(100, 30));
    doomed.liquidationPrice = expandDecimals(21_000, 30);

    const state = marginStateFor({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice }),
      position: doomed,
    });
    const fresh = marginStateFor({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice }),
      position: undefined,
    });

    expect(state?.isLiquidatable).toBe(false);
    expect(state).toEqual(fresh);
  });

  it("charges the ui fee factor snapshotted on the order, not the live one", () => {
    const order = makeIncreaseOrder(OrderType.LimitIncrease, {
      triggerPrice,
      uiFeeFactor: expandDecimals(1, 28),
    } as any);

    const noFee = marginStateFor({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice }),
      uiFeeFactor: 0n,
    });

    // the order carries the factor, the live one is zero → the fee must still be charged
    const orderFactor = marginStateFor({ ...baseArgs, order, uiFeeFactor: 0n });

    // the order carries an explicit zero → the live factor must be ignored
    const orderZeroFactor = marginStateFor({
      ...baseArgs,
      order: makeIncreaseOrder(OrderType.LimitIncrease, { triggerPrice, uiFeeFactor: 0n } as any),
      uiFeeFactor: expandDecimals(1, 28),
    });

    expect(orderFactor!.remainingCollateralUsd).toBeLessThan(noFee!.remainingCollateralUsd);
    expect(orderZeroFactor!.remainingCollateralUsd).toBe(noFee!.remainingCollateralUsd);
  });
});

describe("getOrderIncreaseResultingPositionMarginState — degraded inputs never become a violation", () => {
  const triggerPrice = expandDecimals(18_000, 30);

  function makeSwapCollateralOrder(initialCollateralToken: PositionOrderInfo["initialCollateralToken"]) {
    const isSameToken = initialCollateralToken.address === tokensData.USDC.address;

    return makeIncreaseOrder(OrderType.LimitIncrease, {
      initialCollateralToken,
      initialCollateralTokenAddress: initialCollateralToken.address,
      targetCollateralToken: tokensData.USDC,
      swapPath: isSameToken ? [] : ["0xswapMarket"],
      triggerPrice,
      sizeDeltaUsd: expandDecimals(1_000, 30),
      // 500 USD of margin on 1 000 of size — healthy at a 1% min collateral factor
      initialCollateralDeltaAmount: isSameToken
        ? expandDecimals(500, 6)
        : convertToTokenAmount(
            expandDecimals(500, 30),
            initialCollateralToken.decimals,
            initialCollateralToken.prices.minPrice
          )!,
    });
  }

  function runProjection(order: PositionOrderInfo) {
    return marginStateFor({
      order,
      position: undefined,
      triggerPrice,
      sizeDeltaUsd: order.sizeDeltaUsd,
      // no route: what `makeSelectFindSwapPath` returns while markets load or a route is gone
      findSwapPath: (() => undefined) as any,
      uiFeeFactor: 0n,
      chainId: ARBITRUM,
      marketsInfoData,
      isSetAcceptablePriceImpactEnabled: false,
      minCollateralUsd: expandDecimals(1, 30),
      userReferralInfo: undefined,
    });
  }

  it("projects a same-token deposit without a route and finds it healthy", () => {
    expect(runProjection(makeSwapCollateralOrder(tokensData.USDC))?.isLiquidatable).toBe(false);
  });

  it("gives up instead of reading an unroutable swap deposit as an empty one", () => {
    // the swap yields nothing, so the deposit cannot be valued — the healthy order must not be flagged
    expect(runProjection(makeSwapCollateralOrder(tokensData.ETH))).toBeUndefined();
  });
});
