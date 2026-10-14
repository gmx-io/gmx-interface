import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ isSetAcceptablePriceImpactEnabled: false }),
}));

import { useOrderEditorState, type OrderEditorState } from "../useOrderEditorState";

let state: OrderEditorState;

function Harness() {
  state = useOrderEditorState(undefined);
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

  it("clears inputs when the editor stays closed", () => {
    render(<Harness />);
    openEditor();
    act(() => state.setEditingOrderState(undefined));
    act(() => vi.advanceTimersByTime(100));
    expect(state.triggerPriceInputValue).toBe("");
    expect(state.sizeInputValue).toBe("");
  });

  it("discards unsubmitted values before quickly reopening the same order", () => {
    render(<Harness />);
    openEditor();
    act(() => state.setTriggerPriceInputValue("2200"));
    act(() => state.setEditingOrderState(undefined));
    act(() => state.setEditingOrderState({ orderKey: "order", source: "PositionsList" }));
    expect(state.triggerPriceInputValue).toBe("");
    expect(state.sizeInputValue).toBe("");
  });

  it("preserves an explicit chart price supplied in the same action as opening", () => {
    render(<Harness />);
    openEditor();
    act(() => state.setEditingOrderState(undefined));
    act(() => {
      state.setEditingOrderState({ orderKey: "order", source: "PriceChart" });
      state.setTriggerPriceInputValue("2300");
    });
    act(() => vi.advanceTimersByTime(100));
    expect(state.triggerPriceInputValue).toBe("2300");
  });
});
