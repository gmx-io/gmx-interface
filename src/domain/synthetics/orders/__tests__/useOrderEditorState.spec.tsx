import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expandDecimals } from "lib/numbers";
import { OrderType, type PositionOrderInfo } from "sdk/utils/orders/types";

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ isSetAcceptablePriceImpactEnabled: true }),
}));

import { useOrderEditorState, type OrderEditorState } from "../useOrderEditorState";

// the field shows 1968.38 for the stored 1968.384 trigger, the acceptable price is 5 % below it
const order = {
  key: "order",
  isLong: true,
  orderType: OrderType.LimitDecrease,
  triggerPrice: expandDecimals(1968384, 27),
  acceptablePrice: expandDecimals(18699648, 26),
  indexToken: { decimals: 18 },
} as unknown as PositionOrderInfo;

let state: OrderEditorState;

function Harness() {
  state = useOrderEditorState({ [order.key]: order });
  return null;
}

function openEditor() {
  act(() => state.setEditingOrderState({ orderKey: "order", source: "PositionsList" }));
  act(() => {
    state.setTriggerPriceInputValue("2000");
    state.setSizeInputValue("1000");
  });
}

describe("order editor reset", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("preserves the reopened order's values when the previous close timer expires", () => {
    render(<Harness />);
    openEditor();
    act(() => vi.advanceTimersByTime(100));
    act(() => state.setTriggerPriceInputValue("2200"));
    act(() => state.setEditingOrderState(undefined));
    act(() => vi.advanceTimersByTime(50));
    openEditor();
    act(() => vi.advanceTimersByTime(100));
    expect(state.triggerPriceInputValue).toBe("2000");
    expect(state.sizeInputValue).toBe("1000");
  });

  it.each([
    ["the editor closes", () => state.setEditingOrderState(undefined)],
    [
      "the same order is quickly reopened",
      () => {
        state.setEditingOrderState(undefined);
        state.setEditingOrderState({ orderKey: "order", source: "PositionsList" });
      },
    ],
    ["another order opens", () => state.setEditingOrderState({ orderKey: "other", source: "PositionsList" })],
  ])("clears inputs when %s", (_, change) => {
    render(<Harness />);
    openEditor();
    act(change);
    act(() => vi.advanceTimersByTime(100));
    expect(state.triggerPriceInputValue).toBe("");
    expect(state.sizeInputValue).toBe("");
  });

  it("keeps chart-supplied prices when dragging the open order or reopening it from the chart", () => {
    render(<Harness />);
    openEditor();
    act(() => {
      state.setEditingOrderState({ orderKey: "order", source: "PriceChart" });
      state.setTriggerPriceInputValue("2400");
    });
    expect(state.sizeInputValue).toBe("1000");
    expect(state.triggerPriceInputValue).toBe("2400");

    act(() => state.setEditingOrderState(undefined));
    act(() => {
      state.setEditingOrderState({ orderKey: "order", source: "PriceChart" });
      state.setTriggerPriceInputValue("2300");
    });
    act(() => vi.advanceTimersByTime(100));
    expect(state.triggerPriceInputValue).toBe("2300");
  });
});

describe("order editor acceptable price", () => {
  afterEach(cleanup);

  it.each<[string, bigint]>([
    ["1968.38", order.acceptablePrice],
    ["1968.39", (expandDecimals(196839, 28) * 95n) / 100n],
  ])("builds a TP's acceptable price from the price field %s", (triggerPriceInputValue, expected) => {
    render(<Harness />);
    act(() => state.setEditingOrderState({ orderKey: order.key, source: "PositionsList" }));
    act(() => state.setTriggerPriceInputValue(triggerPriceInputValue));

    expect(state.acceptablePrice).toBe(expected);
  });
});
