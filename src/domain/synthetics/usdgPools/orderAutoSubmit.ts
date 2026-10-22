export type OrderAutoSubmitStep = "wait" | "approve" | "submit" | "stop";

export function getOrderAutoSubmitStep(p: {
  isSubmitting: boolean;
  isButtonLoading: boolean;
  isAllowanceLoaded: boolean;
  isButtonDisabled: boolean;
  isDepositButtonShown: boolean;
  approvalTokenAddress: string | undefined;
  isApprovalRequested: boolean;
}): OrderAutoSubmitStep {
  // before the allowance loads the button can't tell that it needs an approval
  if (p.isSubmitting || p.isButtonLoading || !p.isAllowanceLoaded) {
    return "wait";
  }

  // an error or a GMX Account deposit needs the trader, so the order must not go out later on its own
  if (p.isButtonDisabled || p.isDepositButtonShown) {
    return "stop";
  }

  if (p.approvalTokenAddress !== undefined) {
    // an approval already asked for is either still in the wallet (a remount drops the approving state) or was
    // rejected; either way it isn't asked again, and the arm's expiry or a tap on the trade box ends the wait
    return p.isApprovalRequested ? "wait" : "approve";
  }

  return "submit";
}
