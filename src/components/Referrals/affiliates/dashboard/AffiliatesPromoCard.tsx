import { Trans } from "@lingui/macro";

import { useReferralPromoClosed } from "domain/referrals";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { PromoCard } from "components/Referrals/shared/cards/PromoCard";

import referralCodePromoFg from "img/referral_code_promo_fg.png";

export function AffiliatesPromoCard({ account }: { account: string | undefined }) {
  const { isClosed, close } = useReferralPromoClosed("affiliate", account);

  if (isClosed) {
    return null;
  }

  return (
    <PromoCard
      title={<Trans>Enter the referral code and save up to 10% on fees</Trans>}
      subtitle={
        <Trans>
          Activate someone's referral code to receive a permanent discount on all opening and closing <br /> fees. Your
          savings apply automatically on every trade.{" "}
          <ExternalLink href="https://docs.gmx.io/docs/referrals" variant="icon-arrow" className="text-blue-300">
            <Trans>Learn more</Trans>
          </ExternalLink>
        </Trans>
      }
      onClose={close}
    >
      <img
        src={referralCodePromoFg}
        className="user-select-none absolute -bottom-22 right-28 z-10 w-[104px] max-[1257px]:hidden"
      />
    </PromoCard>
  );
}
