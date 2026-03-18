import { Trans } from "@lingui/macro";

import { useReferralPromoClosed, useReferralsData } from "domain/referrals";
import { useChainId } from "lib/chains";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { PromoCard } from "components/Referrals/shared/cards/PromoCard";

import affiliateCodePromoFg from "img/affiliate_code_promo_fg.png";

export function TradersPromoCard({ account }: { account: string | undefined }) {
  const { isClosed, close } = useReferralPromoClosed("trader", account);
  const { chainId } = useChainId();
  const { data: referralsData } = useReferralsData(account);
  const hasOwnAffiliateCode = Boolean(referralsData?.chains?.[chainId]?.codes?.length);

  if (isClosed || hasOwnAffiliateCode) {
    return null;
  }

  return (
    <PromoCard
      title={<Trans>Create your referral code and earn rebates from your referrals</Trans>}
      subtitle={
        <Trans>
          Generate your own referral code and earn rebates whenever users trade with it. Rewards scale <br /> with your
          tier and the activity of your referred traders.{" "}
          <ExternalLink href="https://docs.gmx.io/docs/referrals" variant="icon-arrow" className="text-blue-300">
            <Trans>Learn more</Trans>
          </ExternalLink>
        </Trans>
      }
      onClose={close}
      imgSrc={affiliateCodePromoFg}
      imgClassName="-bottom-34 right-28 max-[1266px]:hidden"
    />
  );
}
