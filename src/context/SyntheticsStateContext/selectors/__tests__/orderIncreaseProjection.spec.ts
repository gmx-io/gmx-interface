import { beforeEach, describe, expect, it, vi } from "vitest";

import * as orderUtils from "domain/synthetics/orders/utils";
import { MOCK_POSITIONS_CONSTANTS } from "domain/testUtils/mockChainData";
import { createMockMarketInfo, MOCK_MARKET_ADDRESS } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, MOCK_ACCOUNT } from "domain/testUtils/mockSyntheticsState";
import { ETH_ADDRESS, ETH_TOKEN, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { OrderType, PositionOrderInfo } from "sdk/utils/orders/types";

import {
  makeSelectOrderEditorPositionOrderError,
  selectOrderEditorIncreaseAmounts,
  selectOrderEditorIncreaseResultingPositionMarginState,
  selectOrderEditorNextPositionValuesForIncrease,
  selectOrderEditorNextPositionValuesWithoutPnlForIncrease,
} from "../orderEditorSelectors";
import {
  makeSelectOrderErrorByOrderKey,
  makeSelectOrderIncreaseProjection,
  selectOrderErrorsCount,
} from "../orderSelectors";

vi.mock("domain/synthetics/orders/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("domain/synthetics/orders/utils")>();
  return { ...actual, getOrderIncreaseProjection: vi.fn(actual.getOrderIncreaseProjection) };
});

/**
 * A resting increase paid in ETH into USDC collateral on a fresh position: the one shape where the
 * order rows, the header badge, a chart-line drag and the Order Editor used to size the same order
 * through two different amounts chains.
 */
describe("per-order increase projection", () => {
  const marketInfo = createMockMarketInfo();
  const TRIGGER_PRICE = expandDecimals(1800, 30); // ETH is mocked at 2 000
  const SIZE_USD = expandDecimals(3000, 30);
  const DEPOSIT_ETH = expandDecimals(5, 17); // 0.5 ETH ≈ 900 USD at the trigger

  function makeOrder(overrides: Partial<PositionOrderInfo> = {}): PositionOrderInfo {
    return {
      key: "order-key",
      account: MOCK_ACCOUNT,
      marketAddress: MOCK_MARKET_ADDRESS,
      marketInfo,
      indexToken: ETH_TOKEN,
      initialCollateralToken: ETH_TOKEN,
      initialCollateralTokenAddress: ETH_ADDRESS,
      targetCollateralToken: USDC_TOKEN,
      initialCollateralDeltaAmount: DEPOSIT_ETH,
      sizeDeltaUsd: SIZE_USD,
      triggerPrice: TRIGGER_PRICE,
      acceptablePrice: expandDecimals(1820, 30),
      minOutputAmount: 0n,
      swapPath: [MOCK_MARKET_ADDRESS],
      swapPathStats: undefined,
      isLong: true,
      isTwap: false,
      isSwap: false,
      orderType: OrderType.LimitIncrease,
      uiFeeFactor: undefined,
      shouldUnwrapNativeToken: false,
      executionFee: 0n,
      autoCancel: false,
      validFromTime: 0n,
      updatedAtTime: 0n,
      ...overrides,
    } as unknown as PositionOrderInfo;
  }

  function createState({
    order = makeOrder(),
    editor = { triggerPriceInputValue: "1800", sizeInputValue: "3000" },
    isSetAcceptablePriceImpactEnabled = false,
  }: {
    order?: PositionOrderInfo;
    editor?: { triggerPriceInputValue: string; sizeInputValue: string };
    isSetAcceptablePriceImpactEnabled?: boolean;
  } = {}) {
    return createMockSyntheticsState({
      marketInfo,
      positionsConstants: MOCK_POSITIONS_CONSTANTS,
      ordersInfoData: { [order.key]: order },
      orderEditor: { editingOrderState: { orderKey: order.key, source: "PositionsList" }, ...editor },
      isSetAcceptablePriceImpactEnabled,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sizes the order once for the rows, the badge, a chart-line drag and the editor at the same trigger", () => {
    const order = makeOrder();
    const state = createState({ order });

    makeSelectOrderErrorByOrderKey(order.key)(state);
    selectOrderErrorsCount(state);
    makeSelectOrderEditorPositionOrderError(order.key, TRIGGER_PRICE)(state);
    selectOrderEditorNextPositionValuesForIncrease(state);
    selectOrderEditorNextPositionValuesWithoutPnlForIncrease(state);
    selectOrderEditorIncreaseResultingPositionMarginState(state);
    selectOrderEditorIncreaseAmounts(state);

    expect(vi.mocked(orderUtils.getOrderIncreaseProjection)).toHaveBeenCalledTimes(1);

    // a drag to another price is one more projection, not two
    makeSelectOrderEditorPositionOrderError(order.key, expandDecimals(1700, 30))(state);

    expect(vi.mocked(orderUtils.getOrderIncreaseProjection)).toHaveBeenCalledTimes(2);
  });

  it("prices a fresh position's deposit along the route to the order's collateral token", () => {
    const state = createState();

    const amounts = selectOrderEditorIncreaseAmounts(state)!;
    const nextValues = selectOrderEditorNextPositionValuesForIncrease(state)!;
    const marginState = selectOrderEditorIncreaseResultingPositionMarginState(state)!;

    expect(amounts.swapStrategy.type).toBe("internalSwap");
    expect(nextValues.nextCollateralUsd).toBeGreaterThan(0n);
    // 3 000 of size on ≈ 900 of margin (0.5 ETH at the 1 800 trigger, less fees)
    expect(nextValues.nextLeverage).toBeGreaterThan(30000n);
    expect(nextValues.nextLeverage).toBeLessThan(40000n);
    expect(marginState.isLiquidatable).toBe(false);
  });

  it("keeps a stop increase a stop in the editor's amounts", () => {
    const order = makeOrder({ orderType: OrderType.StopIncrease, triggerPrice: expandDecimals(2200, 30) });
    const state = createState({
      order,
      editor: { triggerPriceInputValue: "2200", sizeInputValue: "3000" },
      isSetAcceptablePriceImpactEnabled: true,
    });

    const amounts = selectOrderEditorIncreaseAmounts(state)!;

    expect(amounts.limitOrderType).toBe(OrderType.StopIncrease);
    expect(amounts.triggerThresholdType).toBeDefined();
    expect(amounts.recommendedAcceptablePriceDeltaBps).toBe(0n);
  });

  it("charges the ui fee factor snapshotted on the order, not the live one", () => {
    const live = selectOrderEditorNextPositionValuesForIncrease(createState())!;
    const snapshotted = selectOrderEditorNextPositionValuesForIncrease(
      createState({ order: makeOrder({ uiFeeFactor: expandDecimals(1, 26) }) })
    )!;

    expect(snapshotted.nextCollateralUsd).toBeLessThan(live.nextCollateralUsd!);
  });

  it("agrees between the order row and the editor on the same order", () => {
    const order = makeOrder({ sizeDeltaUsd: expandDecimals(80_000, 30) }); // ≈ 90x at the trigger
    const state = createState({ order, editor: { triggerPriceInputValue: "1800", sizeInputValue: "80000" } });

    const rowErrors = makeSelectOrderErrorByOrderKey(order.key)(state);
    const projection = makeSelectOrderIncreaseProjection(order.key, order.triggerPrice, order.sizeDeltaUsd)(state)!;
    const editorMarginState = selectOrderEditorIncreaseResultingPositionMarginState(state)!;

    // the size round-trips through the index-token amount at the trigger, so only rounding dust may differ
    expect(bigMath.abs(projection.increaseAmounts.sizeDeltaUsd - order.sizeDeltaUsd)).toBeLessThan(expandDecimals(1, 24));
    expect(editorMarginState.isLiquidatable).toBe(true);
    expect(rowErrors.errors.map((e) => e.key)).toContain("maxLeverage");
  });
});
