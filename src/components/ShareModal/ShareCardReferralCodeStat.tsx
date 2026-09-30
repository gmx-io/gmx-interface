import { Trans } from "@lingui/macro";

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
      {code}
    </ShareCardStat>
  );
}
