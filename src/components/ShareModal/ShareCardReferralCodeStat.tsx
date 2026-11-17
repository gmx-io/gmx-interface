import { Trans } from "@lingui/macro";

import { formatReferralCodeForDisplay } from "domain/referrals/utils/referralCode";

import { ShareCardStat } from "./ShareCardStat";

type Props = {
  referralCodeOwnerKind: "created" | "used" | undefined;
  code: string | undefined;
};

export function ShareCardReferralCodeStat({ referralCodeOwnerKind, code }: Props) {
  if (!referralCodeOwnerKind || !code) {
    return null;
  }

  return (
    <ShareCardStat
      label={referralCodeOwnerKind === "created" ? <Trans>Referral code</Trans> : <Trans>Used referral code</Trans>}
    >
      {formatReferralCodeForDisplay(code)}
    </ShareCardStat>
  );
}
