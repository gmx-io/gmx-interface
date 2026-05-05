import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { StateCtx } from "context/SyntheticsStateContext/utils";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, type MockSyntheticsStateOverrides } from "domain/testUtils/mockSyntheticsState";

import { useTradeboxManualLeverageSizeSlider } from "../useTradeboxManualLeverageSizeSlider";

type HookResult = ReturnType<typeof useTradeboxManualLeverageSizeSlider>;

type Opts = Pick<
  MockSyntheticsStateOverrides,
  "isLeverageSliderEnabled" | "fromTokenInputValue" | "toTokenInputValue"
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
