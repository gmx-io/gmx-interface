import { Trans, t } from "@lingui/macro";
import { useCallback, useState } from "react";

import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { registerReferralCode, TotalReferralsStats, useTiers } from "domain/referrals";
import { getSharePercentage } from "domain/referrals/utils/referralsHelper";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { Faq } from "components/Faq/Faq";
import Loader from "components/Loader/Loader";
import { AffiliatesStats } from "components/Referrals/affiliates/dashboard/AffiliatesStats";
import { useRecentReferralCodes } from "components/Referrals/shared/hooks/useRecentReferralCodes";

import { CreateAffiliateWizard } from "./createCode/CreateAffiliateWizard";
import { AFFILIATE_WIZARD_FAQS } from "./faq";
import { HowToStartEarning } from "./HowToStartEarning";

type ReferralsAffiliatesTabProps = {
  isLoading: boolean;
  account: string | undefined;
  referralsData: TotalReferralsStats | undefined;
  initialReferralCode: string | undefined;
  hasAddressInUrl?: boolean;
};

export function ReferralsAffiliatesTab({
  isLoading,
  account,
  referralsData,
  initialReferralCode,
  hasAddressInUrl = false,
}: ReferralsAffiliatesTabProps) {
  const [forceDashboard, setForceDashboard] = useState(false);
  const { signer } = useWallet();
  const { chainId } = useChainId();
  const { pendingTxns } = usePendingTxns();
  const { recentCodes } = useRecentReferralCodes();
  const affiliateTierInfo = referralsData?.chains?.[chainId]?.affiliateTierInfo;
  const tierId = affiliateTierInfo?.tierId;
  const discountShare = affiliateTierInfo?.discountShare;
  const { totalRebate } = useTiers(chainId, tierId);
  const currentTraderDiscountPercentage = getSharePercentage(tierId, discountShare, totalRebate);

  function handleCreateReferralCode(referralCode: string) {
    return registerReferralCode(chainId, referralCode, signer, {
      sentMsg: t`Referral code submitted`,
      failMsg: t`Referral code creation failed`,
      pendingTxns,
    });
  }

  const ownsSomeChainCode = Boolean(referralsData?.chains?.[chainId]?.codes?.length);
  const hasRecentCode = recentCodes.length > 0;
  const isSomeReferralCodeAvailable = ownsSomeChainCode || hasRecentCode;
  const handleGoToAffiliateDashboard = useCallback(() => setForceDashboard(true), []);

  if (isLoading) return <Loader />;

  const isWizard = !forceDashboard && !hasAddressInUrl && (!account || !isSomeReferralCodeAvailable);

  if (!isWizard) {
    return (
      <AffiliatesStats
        account={account}
        referralsData={referralsData}
        handleCreateReferralCode={handleCreateReferralCode}
      />
    );
  }

  return (
    <div className="flex gap-8 max-md:flex-col">
      <div className="flex grow flex-col gap-8">
        <CreateAffiliateWizard
          onGoToAffiliateDashboard={handleGoToAffiliateDashboard}
          handleCreateReferralCode={handleCreateReferralCode}
          initialReferralCode={initialReferralCode}
          traderDiscountPercentage={currentTraderDiscountPercentage}
        />
        <HowToStartEarning />
      </div>
      <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
        <Faq items={AFFILIATE_WIZARD_FAQS} title={<Trans>FAQ</Trans>} />
      </div>
    </div>
  );
}
