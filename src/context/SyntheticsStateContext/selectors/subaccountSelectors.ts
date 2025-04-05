import { SyntheticsState } from "../SyntheticsStateContextProvider";

export const selectSubaccountState = (s: SyntheticsState) => s.subaccountState;
export const selectRawSubaccount = (s: SyntheticsState) => s.subaccountState.subaccount;

export const selectUpdateSubaccountSettings = (s: SyntheticsState) => s.subaccountState.updateSubaccountSettings;
export const selectResetSubaccountApproval = (s: SyntheticsState) => s.subaccountState.resetSubaccountApproval;
export const selectGenerateSubaccountIfNotExists = (s: SyntheticsState) => s.subaccountState.tryEnableSubaccount;
