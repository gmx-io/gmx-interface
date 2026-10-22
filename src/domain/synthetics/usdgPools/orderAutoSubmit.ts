export type OrderAutoSubmitStep = "wait" | "approve" | "submit" | "stop";

export function getOrderAutoSubmitStep(p: {
  isSubmitting: boolean;
  isButtonLoading: boolean;
  isButtonDisabled: boolean;
  isDepositButtonShown: boolean;
  approvalTokenAddress: string | undefined;
  isApprovalRequested: boolean;
}): OrderAutoSubmitStep {
  if (p.isSubmitting || p.isButtonLoading) {
    return "wait";
  }

  // an error or a GMX Account deposit needs the trader, so the order must not go out later on its own
  if (p.isButtonDisabled || p.isDepositButtonShown) {
    return "stop";
  }

  if (p.approvalTokenAddress !== undefined) {
    // the same token asking again means its approval was rejected
    return p.isApprovalRequested ? "stop" : "approve";
  }

  return "submit";
}
