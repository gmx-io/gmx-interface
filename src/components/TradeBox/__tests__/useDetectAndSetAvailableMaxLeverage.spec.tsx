import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { StateCtx } from "context/SyntheticsStateContext/utils";
import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { MOCK_POSITIONS_CONSTANTS } from "domain/testUtils/mockChainData";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState } from "domain/testUtils/mockSyntheticsState";
import { USDC_ADDRESS } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import { TradeMode } from "sdk/utils/trade/types";

import { useDetectAndSetAvailableMaxLeverage } from "../hooks/useTradeButtonState";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
// ETH is mocked at 2 000 — the limit rests below the market, the position dies on the way there
const TRIGGER_PRICE = "1800";
const LIQUIDATED_BEFORE_TRIGGER = expandDecimals(1900, 30);
const SURVIVES_TO_TRIGGER = expandDecimals(1500, 30);

const marketInfo = createMockMarketInfo();

function buildState(
  liquidationPrice: bigint | undefined,
  triggerPrice = TRIGGER_PRICE,
  { sizeInUsd = expandDecimals(10_000, 30), collateralUsd = expandDecimals(2_000, 30) } = {}
): SyntheticsState {
  const position =
    liquidationPrice === undefined
      ? undefined
      : mockPositionInfo(
          {
            marketInfo,
            collateralTokenAddress: USDC_ADDRESS,
            account: ACCOUNT,
            isLong: true,
            sizeInUsd,
            collateralUsd,
          },
          { isLong: true, liquidationPrice }
        );

  return createMockSyntheticsState({
    marketInfo,
    isLeverageSliderEnabled: false,
    tradeMode: TradeMode.Limit,
    triggerPriceInputValue: triggerPrice,
    fromTokenInputValue: "1000",
    toTokenInputValue: "0",
    positionsConstants: MOCK_POSITIONS_CONSTANTS,
    account: ACCOUNT,
    positionsInfoData: position ? { [position.key]: position } : {},
  });
}

type MaxLeverageActions = ReturnType<typeof useDetectAndSetAvailableMaxLeverage>;

function Inner({
  setToTokenInputValue,
  actionsRef,
}: {
  setToTokenInputValue: (value: string, shouldResetPriceImpactWarning: boolean) => void;
  actionsRef: { current: MaxLeverageActions | null };
}) {
  actionsRef.current = useDetectAndSetAvailableMaxLeverage({ setToTokenInputValue, enabled: true });

  return null;
}

function renderMaxLeverageActions(
  state: SyntheticsState,
  setToTokenInputValue: (value: string, shouldResetPriceImpactWarning: boolean) => void
): MaxLeverageActions {
  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
  const actionsRef: { current: MaxLeverageActions | null } = { current: null };

  render(
    <StateCtx.Provider value={state}>
      <Inner setToTokenInputValue={setToTokenInputValue} actionsRef={actionsRef} />
    </StateCtx.Provider>
  );

  return actionsRef.current!;
}

/** The size in index tokens the max-leverage detection settles on. */
function detectMaxLeverageSize(liquidationPrice: bigint | undefined, triggerPrice = TRIGGER_PRICE): string {
  const setToTokenInputValue = vi.fn();

  const actions = renderMaxLeverageActions(buildState(liquidationPrice, triggerPrice), setToTokenInputValue);

  expect(actions.hasAvailableMaxLeverage).toBe(true);

  act(() => actions.detectAndSetAvailableMaxLeverage());

  expect(setToTokenInputValue).toHaveBeenCalled();

  return String(setToTokenInputValue.mock.calls.at(-1)![0]);
}

describe("useDetectAndSetAvailableMaxLeverage — searches on the position the amounts are built from", () => {
  afterEach(cleanup);

  it("ignores a position that cannot survive to the trigger price", () => {
    const doomed = detectMaxLeverageSize(LIQUIDATED_BEFORE_TRIGGER);
    const fresh = detectMaxLeverageSize(undefined);

    expect(Number(fresh)).toBeGreaterThan(0);
    expect(doomed).toBe(fresh);
  });

  it("keeps a position that does survive to the trigger price", () => {
    const alive = detectMaxLeverageSize(SURVIVES_TO_TRIGGER);
    const fresh = detectMaxLeverageSize(undefined);

    expect(Number(alive)).toBeGreaterThan(0);
    expect(alive).not.toBe(fresh);
  });
});

describe("useDetectAndSetAvailableMaxLeverage — sizes a resting order at its trigger price", () => {
  afterEach(cleanup);

  it("finds the same usd notional whether the trigger sits at the mark price or below it", () => {
    // sized at the mark price but evaluated at the trigger, the search would see a phantom 10 % loss
    const atMark = Number(detectMaxLeverageSize(undefined, "2000"));
    const belowMark = Number(detectMaxLeverageSize(undefined, TRIGGER_PRICE));

    expect(atMark).toBeGreaterThan(0);

    const notionalAtMark = atMark * 2000;
    const notionalBelowMark = belowMark * Number(TRIGGER_PRICE);

    expect(Math.abs(notionalBelowMark - notionalAtMark) / notionalAtMark).toBeLessThan(0.01);
  });
});

describe("useDetectAndSetAvailableMaxLeverage — offers nothing when no size passes", () => {
  afterEach(cleanup);

  it("finds no leverage for a position already below the min collateral factor", () => {
    const setToTokenInputValue = vi.fn();

    const actions = renderMaxLeverageActions(
      buildState(SURVIVES_TO_TRIGGER, TRIGGER_PRICE, {
        sizeInUsd: expandDecimals(1_000_000, 30),
        collateralUsd: expandDecimals(100, 30),
      }),
      setToTokenInputValue
    );

    expect(actions.hasAvailableMaxLeverage).toBe(false);

    act(() => actions.detectAndSetAvailableMaxLeverage());

    expect(setToTokenInputValue).not.toHaveBeenCalled();
  });
});

describe("useDetectAndSetAvailableMaxLeverage — the offer matches what the search settles on", () => {
  afterEach(cleanup);

  // hasAvailableMaxLeverage probes a single leverage instead of running the whole search,
  // so it has to agree with the search on both sides of the boundary
  it.each([2_000, 200, 150, 120, 100, 50])("agrees for a position with %i usd of collateral", (collateralUsd) => {
    const setToTokenInputValue = vi.fn();

    const actions = renderMaxLeverageActions(
      buildState(SURVIVES_TO_TRIGGER, TRIGGER_PRICE, {
        sizeInUsd: expandDecimals(10_000, 30),
        collateralUsd: expandDecimals(collateralUsd, 30),
      }),
      setToTokenInputValue
    );

    act(() => actions.detectAndSetAvailableMaxLeverage());

    expect(actions.hasAvailableMaxLeverage).toBe(setToTokenInputValue.mock.calls.length > 0);
  });

  it("covers both sides of the boundary", () => {
    const isOffered = (collateralUsd: number) =>
      renderMaxLeverageActions(
        buildState(SURVIVES_TO_TRIGGER, TRIGGER_PRICE, {
          sizeInUsd: expandDecimals(10_000, 30),
          collateralUsd: expandDecimals(collateralUsd, 30),
        }),
        vi.fn()
      ).hasAvailableMaxLeverage;

    expect(isOffered(150)).toBe(true);
    cleanup();
    expect(isOffered(100)).toBe(false);
  });
});
