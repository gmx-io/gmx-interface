import { t } from "@lingui/macro";

import { getPageOutdatedError } from "lib/useHasOutdatedUi";

import { ApplyReferralCodeButtonContent } from "./ApplyReferralCodeButtonContent";

export type ReferralCodeButtonState = {
  text: React.ReactNode;
  disabled?: boolean;
  onSubmit?: (event: React.FormEvent) => void;
};

type Params = {
  type: "join" | "edit";
  referralCode: string;
  userReferralCodeString: string;
  isSubmitting: boolean;
  isValidating: boolean;
  referralCodeExists: boolean;
  onSubmit: (event: React.FormEvent) => void;
  hasOutdatedUi?: boolean;
  isApproving?: boolean;
  isLoadingQuote?: boolean;
  needsApproval?: boolean;
  depositTokenSymbol?: string;
  onApprove?: (event: React.FormEvent) => void;
};

export function getReferralCodeButtonState({
  type,
  referralCode,
  userReferralCodeString,
  isSubmitting,
  isValidating,
  referralCodeExists,
  onSubmit,
  hasOutdatedUi = false,
  isApproving = false,
  isLoadingQuote = false,
  needsApproval = false,
  depositTokenSymbol,
  onApprove,
}: Params): ReferralCodeButtonState {
  const isEdit = type === "edit";

  if (hasOutdatedUi) {
    return { text: getPageOutdatedError(), disabled: true };
  }
  if (isApproving) {
    return { text: t`Approving...`, disabled: true };
  }
  if (isEdit && referralCode === userReferralCodeString) {
    return { text: t`Same as current active code`, disabled: true };
  }
  if (isEdit && isSubmitting) {
    return { text: t`Updating...`, disabled: true };
  }
  if (isSubmitting) {
    return { text: t`Adding...`, disabled: true };
  }
  if (referralCode === "") {
    return { text: t`Enter referral code`, disabled: true };
  }
  if (isValidating) {
    return { text: t`Checking code...`, disabled: true };
  }
  if (!referralCodeExists) {
    return { text: t`Code not found`, disabled: true };
  }
  if (isLoadingQuote) {
    return { text: t`Loading...`, disabled: true };
  }
  if (needsApproval && onApprove && depositTokenSymbol) {
    return {
      text: t`Approve ${depositTokenSymbol}`,
      disabled: false,
      onSubmit: onApprove,
    };
  }
  if (isEdit) {
    return { text: t`Update`, disabled: false, onSubmit };
  }
  return {
    text: <ApplyReferralCodeButtonContent />,
    disabled: false,
    onSubmit,
  };
}
