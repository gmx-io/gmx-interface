import { describe, expect, it } from "vitest";

import { getOrderAutoSubmitStep } from "../orderAutoSubmit";

const ready = {
  isSubmitting: false,
  isButtonLoading: false,
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
    ["stops on a validation error instead of sending once it clears", { isButtonDisabled: true }, "stop"],
    ["stops instead of opening the GMX Account deposit", { isDepositButtonShown: true }, "stop"],
    ["requests an approval", { approvalTokenAddress: USDG }, "approve"],
    ["stops when the same approval is asked again", { approvalTokenAddress: USDG, isApprovalRequested: true }, "stop"],
  ] as const)("%s", (_, overrides, expected) => {
    expect(getOrderAutoSubmitStep({ ...ready, ...overrides })).toBe(expected);
  });
});
