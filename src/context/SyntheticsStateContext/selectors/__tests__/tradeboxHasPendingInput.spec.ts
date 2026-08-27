import { describe, expect, it } from "vitest";

import { SyntheticsState } from "../../SyntheticsStateContextProvider";
import { selectTradeboxHasPendingInput } from "../tradeboxSelectors";

const IDLE_TRADEBOX = {
  fromTokenInputValue: "",
  toTokenInputValue: "",
  closeSizeInputValue: "0",
  triggerPriceInputValue: "",
  triggerRatioInputValue: "",
};

function makeState(tradebox: Partial<typeof IDLE_TRADEBOX>): SyntheticsState {
  return { tradebox: { ...IDLE_TRADEBOX, ...tradebox } } as unknown as SyntheticsState;
}

describe("selectTradeboxHasPendingInput", () => {
  it("treats an untouched form as empty", () => {
    expect(selectTradeboxHasPendingInput(makeState({}))).toBe(false);
    expect(selectTradeboxHasPendingInput(makeState({ fromTokenInputValue: "0.00" }))).toBe(false);
    expect(selectTradeboxHasPendingInput(makeState({ fromTokenInputValue: "abc" }))).toBe(false);
  });

  it("detects an amount in any of the fields", () => {
    expect(selectTradeboxHasPendingInput(makeState({ fromTokenInputValue: "0.5" }))).toBe(true);
    expect(selectTradeboxHasPendingInput(makeState({ toTokenInputValue: "1" }))).toBe(true);
    expect(selectTradeboxHasPendingInput(makeState({ closeSizeInputValue: "250" }))).toBe(true);
    expect(selectTradeboxHasPendingInput(makeState({ triggerPriceInputValue: "1250.5" }))).toBe(true);
    expect(selectTradeboxHasPendingInput(makeState({ triggerRatioInputValue: "0.0001" }))).toBe(true);
  });
});
