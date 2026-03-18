import { t } from "@lingui/macro";
import { forwardRef } from "react";

import ReferralsIcon from "img/ic_referrals.svg?react";

export const ReferralCodeInput = forwardRef(function ReferralCodeInput(
  { disabled, value, onChange }: { disabled?: boolean; value: string; onChange: (value: string) => void },
  ref: React.Ref<HTMLInputElement>
) {
  return (
    <div className="relative flex items-center">
      <input
        ref={ref}
        disabled={disabled}
        type="text"
        placeholder={t`Enter referral code`}
        className="text-input peer pl-40 !text-typography-primary"
        value={value}
        onChange={({ target }) => onChange(target.value)}
      />
      <ReferralsIcon className="absolute left-12 size-20 shrink-0 text-typography-secondary peer-focus:text-blue-300" />
    </div>
  );
});
