import { describe, expect, it } from "vitest";

import { getOrderAutoSubmitStep } from "../orderAutoSubmit";

const ready = {
  isSubmitting: false,
  isButtonLoading: false,
  isAllowanceLoaded: true,
  isButtonDisabled: false,
  isDepositButtonShown: false,
  approvalTokenAddress: undefined,
  isApprovalRequested: false,
};

const USDG = "0x004B506865409877C9fA29bfb1ebA929984B9bbC";

describe("getOrderAutoSubmitStep", () => {
  it.each([
    ["submits a ready order", {}, "submit"],
    ["waits while network fees load", { isButtonLoading: true, isButtonDisabled: true }, "wait"],
    ["waits while a submit is in flight", { isSubmitting: true }, "wait"],
    [
      "waits for the allowance before choosing between the approval and the order",
      { isAllowanceLoaded: false },
      "wait",
    ],
    ["stops on a validation error instead of sending once it clears", { isButtonDisabled: true }, "stop"],
    ["stops instead of opening the GMX Account deposit", { isDepositButtonShown: true }, "stop"],
    ["requests an approval", { approvalTokenAddress: USDG }, "approve"],
    ["doesn't ask for the same approval twice", { approvalTokenAddress: USDG, isApprovalRequested: true }, "wait"],
  ] as const)("%s", (_, overrides, expected) => {
    expect(getOrderAutoSubmitStep({ ...ready, ...overrides })).toBe(expected);
  });
});
