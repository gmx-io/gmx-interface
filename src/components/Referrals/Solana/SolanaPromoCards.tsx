import { Trans } from "@lingui/macro";

import { REFERRALS_DOCS_URL } from "config/links";
import { useReferralPromoClosed } from "domain/referrals";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { PromoCard } from "components/Referrals/shared/cards/PromoCard";

import affiliateCodePromoFg from "img/affiliate_code_promo_fg.png";
import referralCodePromoFg from "img/referral_code_promo_fg.png";

// Same cards as on EVM, with Solana copy: GT instead of rebates, a fixed 10% discount instead of "up to 10%".
// The line breaks only keep the text clear of the picture, so they show only when the picture does.

export function SolanaTradersPromoCard({ account, hasOwnCode }: { account: string | undefined; hasOwnCode: boolean }) {
  const { isClosed, close } = useReferralPromoClosed("trader", account);

  if (isClosed || hasOwnCode) {
    return null;
  }

  return (
    <PromoCard
      title={<Trans>Create your referral code and earn GT from your referrals</Trans>}
      subtitle={
        <Trans>
          Generate your own referral code and earn GT and GT sellable quota whenever users trade with it. Rewards
          <br className="max-[1266px]:hidden" /> scale with your VIP tier and the activity of your referees.{" "}
          <ExternalLink href={REFERRALS_DOCS_URL} variant="icon-arrow" className="text-blue-300">
            <Trans>Read more</Trans>
          </ExternalLink>
          .
        </Trans>
      }
      onClose={close}
      imgSrc={affiliateCodePromoFg}
      imgClassName="-bottom-34 right-28 max-[1266px]:hidden"
    />
  );
}

export function SolanaAffiliatesPromoCard({
  account,
  hasAppliedCode,
}: {
  account: string | undefined;
  hasAppliedCode: boolean;
}) {
  const { isClosed, close } = useReferralPromoClosed("affiliate", account);

  if (isClosed || hasAppliedCode) {
    return null;
  }

  return (
    <PromoCard
      title={<Trans>Enter a referral code and save 10% on fees</Trans>}
      subtitle={
        <Trans>
          Activate someone's referral code to receive a permanent 10% discount on all opening and closing{" "}
          <br className="max-[1257px]:hidden" /> fees. Your savings apply automatically on every trade.{" "}
          <ExternalLink href={REFERRALS_DOCS_URL} variant="icon-arrow" className="text-blue-300">
            <Trans>Read more</Trans>
          </ExternalLink>
          .
        </Trans>
      }
      onClose={close}
      imgSrc={referralCodePromoFg}
      imgClassName="-bottom-22 right-28 max-[1257px]:hidden"
    />
  );
}
