import { Trans } from "@lingui/macro";
import { useEffect } from "react";
import { Link } from "react-router-dom";

import { REFERRALS_REWARDS_PROMO_DISMISSED_KEY } from "config/localStorage";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { useLocalStorageSerializeKeySafe } from "lib/localStorage";
import { sendRewardsBannerEvent, sendRewardsNavigationEvent } from "lib/userAnalytics/rewardsEvents";

import { RewardsPromoBannerCard } from "components/RewardsPromoBanner/RewardsPromoBannerCard";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import rewardsBannerCoinWallet from "img/rewards_banner_coin_wallet.png";

export function AffiliateRewardsPromoBanner({ account, className }: { account?: string; className?: string }) {
  const { isActive } = useIncentivesV2State();
  const [isDismissed, setIsDismissed] = useLocalStorageSerializeKeySafe<boolean>(
    [REFERRALS_REWARDS_PROMO_DISMISSED_KEY, account ?? "disconnected"],
    false
  );

  useEffect(() => {
    if (!isActive || isDismissed) return;

    sendRewardsBannerEvent("BannerShown", "referrals-rewards-program", account ?? "disconnected");
  }, [account, isActive, isDismissed]);

  if (!isActive || isDismissed) return null;

  const handleDismiss = () => {
    sendRewardsBannerEvent("BannerDismiss", "referrals-rewards-program");
    setIsDismissed(true);
  };

  const handleActionClick = () => {
    sendRewardsBannerEvent("BannerClick", "referrals-rewards-program");
    sendRewardsNavigationEvent({ source: "ReferralsPageBanner" });
  };

  return (
    <RewardsPromoBannerCard
      className={className}
      coin={rewardsBannerCoinWallet}
      onClose={handleDismiss}
      data-testid="affiliate-rewards-promo-banner"
    >
      <div className="relative z-10 flex min-w-0 flex-col gap-4 pr-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-16 font-medium text-typography-primary">
            <Trans>Referral Bonus</Trans>
          </h3>
          <p className="text-13 text-typography-secondary">
            <Trans>Refer traders and earn 50% of their rewards while the program is live.</Trans>
          </p>
        </div>
        <Link
          to="/rewards"
          className="flex w-fit items-center gap-4 text-14 font-medium text-blue-300"
          onClick={handleActionClick}
        >
          <Trans>Read more</Trans>
          <ArrowRightIcon className="size-16" />
        </Link>
      </div>
    </RewardsPromoBannerCard>
  );
}
