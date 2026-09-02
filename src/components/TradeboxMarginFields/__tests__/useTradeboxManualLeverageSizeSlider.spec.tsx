import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { selectTradeboxIncreaseResultingPositionMarginState } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxTradeErrors";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { StateCtx } from "context/SyntheticsStateContext/utils";
import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { MOCK_POSITIONS_CONSTANTS } from "domain/testUtils/mockChainData";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, type MockSyntheticsStateOverrides } from "domain/testUtils/mockSyntheticsState";
import { ETH_ADDRESS, USDC_ADDRESS } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import { TradeMode } from "sdk/utils/trade/types";

import { useTradeboxManualLeverageSizeSlider } from "../useTradeboxManualLeverageSizeSlider";

type HookResult = ReturnType<typeof useTradeboxManualLeverageSizeSlider>;

type Opts = Pick<
  MockSyntheticsStateOverrides,
  | "isLeverageSliderEnabled"
  | "fromTokenInputValue"
  | "toTokenInputValue"
  | "fromTokenAddress"
  | "collateralAddress"
  | "tradeMode"
  | "triggerPriceInputValue"
  | "uiFeeFactor"
  | "positionsConstants"
  | "account"
  | "positionsInfoData"
> & {
  hasMarketInfo?: boolean;
};

function buildState(opts: Opts = {}): SyntheticsState {
  const { hasMarketInfo = false, ...stateOverrides } = opts;
  return createMockSyntheticsState({
    ...stateOverrides,
    marketInfo: hasMarketInfo ? createMockMarketInfo() : undefined,
  });
}

function Harness({
  state,
  setTo,
  setSize,
  actionsRef,
}: {
  state: SyntheticsState;
  setTo: (v: string, r: boolean) => void;
  setSize: (v: string) => void;
  actionsRef: { current: HookResult | null };
}) {
  return (
    <StateCtx.Provider value={state}>
      <Inner setTo={setTo} setSize={setSize} actionsRef={actionsRef} />
    </StateCtx.Provider>
  );
}

function Inner({
  setTo,
  setSize,
  actionsRef,
}: {
  setTo: (v: string, r: boolean) => void;
  setSize: (v: string) => void;
  actionsRef: { current: HookResult | null };
}) {
  actionsRef.current = useTradeboxManualLeverageSizeSlider({
    sizeDisplayMode: "usd",
    canConvert: true,
    maxAvailableAmount: 1n,
    tokensToUsd: (v) => v,
    setSizeInputValue: setSize,
    setToTokenInputValue: setTo,
  });

  return (
    <div>
      <span data-testid="enabled">{String(actionsRef.current.isLeverageSliderEnabled)}</span>
      <span data-testid="pct">{actionsRef.current.sizePercentage}</span>
    </div>
  );
}

function setup(opts: Opts = {}) {
  const state = buildState(opts);
  const setTo = vi.fn();
  const setSize = vi.fn();
  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
  const actionsRef: { current: HookResult | null } = { current: null };

  const utils = render(<Harness state={state} setTo={setTo} setSize={setSize} actionsRef={actionsRef} />);

  return { setTo, setSize, actionsRef, ...utils };
}

describe("useTradeboxManualLeverageSizeSlider", () => {
  afterEach(cleanup);

  describe("isLeverageSliderEnabled", () => {
    it("returns true when setting is enabled", () => {
      const { getByTestId } = setup({ isLeverageSliderEnabled: true });
      expect(getByTestId("enabled").textContent).toBe("true");
    });

    it("returns false when setting is disabled", () => {
      const { getByTestId } = setup({ isLeverageSliderEnabled: false });
      expect(getByTestId("enabled").textContent).toBe("false");
    });
  });

  describe("sizePercentage", () => {
    it("returns 0 when leverage slider is enabled", () => {
      const { getByTestId } = setup({ isLeverageSliderEnabled: true, hasMarketInfo: true });
      expect(getByTestId("pct").textContent).toBe("0");
    });

    it("returns 0 when marketInfo is missing", () => {
      const { getByTestId } = setup({ isLeverageSliderEnabled: false, hasMarketInfo: false });
      expect(getByTestId("pct").textContent).toBe("0");
    });

    it("returns 0 when fromTokenAmount <= 0", () => {
      const { getByTestId } = setup({
        isLeverageSliderEnabled: false,
        hasMarketInfo: true,
        fromTokenInputValue: "",
      });
      expect(getByTestId("pct").textContent).toBe("0");
    });
  });

  describe("handleSizePercentageChange", () => {
    it("no-ops when leverage slider is enabled", () => {
      const { setTo, actionsRef } = setup({ isLeverageSliderEnabled: true });
      act(() => actionsRef.current!.handleSizePercentageChange(50));
      expect(setTo).not.toHaveBeenCalled();
    });

    it("no-ops when no market info", () => {
      const { setTo, actionsRef } = setup({ isLeverageSliderEnabled: false, hasMarketInfo: false });
      act(() => actionsRef.current!.handleSizePercentageChange(50));
      expect(setTo).not.toHaveBeenCalled();
    });

    it("sets toTokenInputValue when market info is available", () => {
      const { setTo, actionsRef } = setup({
        isLeverageSliderEnabled: false,
        hasMarketInfo: true,
        fromTokenInputValue: "1000",
        toTokenInputValue: "0",
      });
      act(() => actionsRef.current!.handleSizePercentageChange(50));
      expect(setTo).toHaveBeenCalled();
      expect(Number(setTo.mock.calls[0][0])).toBeGreaterThan(0);
    });

    it("100% yields larger size than 50%", () => {
      const { setTo, actionsRef } = setup({
        isLeverageSliderEnabled: false,
        hasMarketInfo: true,
        fromTokenInputValue: "1000",
        toTokenInputValue: "0",
      });

      act(() => actionsRef.current!.handleSizePercentageChange(50));
      const size50 = Number(setTo.mock.calls[0][0]);

      act(() => actionsRef.current!.handleSizePercentageChange(100));
      const size100 = Number(setTo.mock.calls[1][0]);

      expect(size100).toBeGreaterThan(size50);
    });
  });

  describe("markFieldInteraction", () => {
    it("prevents additional slider sync calls", () => {
      const { setTo, actionsRef } = setup({
        isLeverageSliderEnabled: false,
        hasMarketInfo: true,
        fromTokenInputValue: "1000",
        toTokenInputValue: "0",
      });

      act(() => actionsRef.current!.handleSizePercentageChange(50));
      const callsAfterSlider = setTo.mock.calls.length;

      act(() => actionsRef.current!.markFieldInteraction());

      expect(setTo.mock.calls.length).toBe(callsAfterSlider);
    });
  });
});

describe("useTradeboxManualLeverageSizeSlider — the slider cap stays inside the validation", () => {
  afterEach(cleanup);

  /** The size the slider hands to the size field at 100%, in index token units. */
  function sizeAt100(opts: Opts): string {
    const { setTo, actionsRef } = setup(opts);

    act(() => actionsRef.current!.handleSizePercentageChange(100));

    expect(setTo).toHaveBeenCalled();

    return String(setTo.mock.calls.at(-1)![0]);
  }

  /** The blocking check the tradebox runs on the resulting position for that same size. */
  function isAcceptedByValidation(opts: Opts, toTokenInputValue: string): boolean {
    const state = buildState({ ...opts, toTokenInputValue });

    return selectTradeboxIncreaseResultingPositionMarginState(state)?.isLiquidatable !== true;
  }

  const marginOpts: Opts = {
    isLeverageSliderEnabled: false,
    hasMarketInfo: true,
    fromTokenInputValue: "1000",
    toTokenInputValue: "0",
    positionsConstants: MOCK_POSITIONS_CONSTANTS,
  };

  it("a market increase paid in the collateral token", () => {
    const size = sizeAt100(marginOpts);

    expect(Number(size)).toBeGreaterThan(0);
    expect(isAcceptedByValidation(marginOpts, size)).toBe(true);
  });

  it("a market increase with a non-zero ui fee factor", () => {
    // 0.1%, the factor a third-party frontend would charge
    const opts: Opts = { ...marginOpts, uiFeeFactor: expandDecimals(1, 27) };

    const size = sizeAt100(opts);

    expect(Number(size)).toBeGreaterThan(0);
    expect(isAcceptedByValidation(opts, size)).toBe(true);
  });

  it("a market increase paid in a token that has to be swapped into the collateral", () => {
    const opts: Opts = { ...marginOpts, fromTokenAddress: ETH_ADDRESS, collateralAddress: USDC_ADDRESS, fromTokenInputValue: "1" };

    const size = sizeAt100(opts);

    expect(Number(size)).toBeGreaterThan(0);
    expect(isAcceptedByValidation(opts, size)).toBe(true);
  });

  it("a limit increase resting below the market", () => {
    // ETH is mocked at 2 000
    const opts: Opts = { ...marginOpts, tradeMode: TradeMode.Limit, triggerPriceInputValue: "1800" };

    const size = sizeAt100(opts);
    const marketSize = sizeAt100(marginOpts);

    // the trigger-priced size buys more tokens for the same margin, and nothing collapses it
    expect(Number(size)).toBeGreaterThan(Number(marketSize));
    expect(isAcceptedByValidation(opts, size)).toBe(true);
  });

  describe("caps against the position the amounts are built from", () => {
    const ACCOUNT = "0x1111111111111111111111111111111111111111";
    const marketInfo = createMockMarketInfo();

    function withPosition(liquidationPrice: bigint | undefined): Opts {
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

      return {
        ...marginOpts,
        tradeMode: TradeMode.Limit,
        triggerPriceInputValue: "1800",
        account: ACCOUNT,
        positionsInfoData: position ? { [position.key]: position } : {},
      };
    }

    it("drops a position that cannot survive to the trigger price", () => {
      // liquidated at 1 900, on the way from the 2 000 mark down to the 1 800 trigger
      const doomed = sizeAt100(withPosition(expandDecimals(1900, 30)));
      const fresh = sizeAt100(withPosition(undefined));

      expect(Number(fresh)).toBeGreaterThan(0);
      expect(doomed).toBe(fresh);
    });

    it("keeps a position that does survive to the trigger price", () => {
      const alive = sizeAt100(withPosition(expandDecimals(1500, 30)));
      const fresh = sizeAt100(withPosition(undefined));

      expect(Number(alive)).toBeGreaterThan(0);
      expect(alive).not.toBe(fresh);
    });
  });
});
