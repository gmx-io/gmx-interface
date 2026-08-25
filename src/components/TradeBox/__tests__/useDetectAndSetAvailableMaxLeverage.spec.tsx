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

function buildState(liquidationPrice: bigint | undefined): SyntheticsState {
  const position =
    liquidationPrice === undefined
      ? undefined
      : mockPositionInfo(
          {
            marketInfo,
            collateralTokenAddress: USDC_ADDRESS,
            account: ACCOUNT,
            isLong: true,
            sizeInUsd: expandDecimals(10_000, 30),
            collateralUsd: expandDecimals(2_000, 30),
          },
          { isLong: true, liquidationPrice }
        );

  return createMockSyntheticsState({
    marketInfo,
    isLeverageSliderEnabled: false,
    tradeMode: TradeMode.Limit,
    triggerPriceInputValue: TRIGGER_PRICE,
    fromTokenInputValue: "1000",
    toTokenInputValue: "0",
    positionsConstants: MOCK_POSITIONS_CONSTANTS,
    account: ACCOUNT,
    positionsInfoData: position ? { [position.key]: position } : {},
  });
}

function Inner({
  setToTokenInputValue,
  actionsRef,
}: {
  setToTokenInputValue: (value: string, shouldResetPriceImpactWarning: boolean) => void;
  actionsRef: { current: (() => void) | null };
}) {
  actionsRef.current = useDetectAndSetAvailableMaxLeverage({ setToTokenInputValue });

  return null;
}

/** The size in index tokens the max-leverage detection settles on. */
function detectMaxLeverageSize(liquidationPrice: bigint | undefined): string {
  const setToTokenInputValue = vi.fn();
  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
  const actionsRef: { current: (() => void) | null } = { current: null };

  render(
    <StateCtx.Provider value={buildState(liquidationPrice)}>
      <Inner setToTokenInputValue={setToTokenInputValue} actionsRef={actionsRef} />
    </StateCtx.Provider>
  );

  act(() => actionsRef.current!());

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
