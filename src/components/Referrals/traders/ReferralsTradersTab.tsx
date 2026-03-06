import { Trans } from "@lingui/macro";

import { TotalReferralsStats, useUserReferralCode } from "domain/referrals";
import { useChainId } from "lib/chains";
import { isHashZero } from "lib/legacy";

import { Faq } from "components/Faq/Faq";
import Loader from "components/Loader/Loader";
import { JoinReferralWizard } from "components/Referrals/traders/joinCode/JoinReferralWizard";
import { ReferralsTradersContent } from "components/Referrals/traders/dashboard/ReferralsTradersContent";
import { WIZARD_FAQS } from "components/Referrals/traders/faq";

type ReferralsTradersTabProps = {
  account: string | undefined;
  isLoading: boolean;
  referralsData: TotalReferralsStats | undefined;
  hasAddressInUrl?: boolean;
};

export function ReferralsTradersTab({
  isLoading,
  account,
  referralsData,
  hasAddressInUrl = false,
}: ReferralsTradersTabProps) {
  const { chainId } = useChainId();
  const { userReferralCode } = useUserReferralCode(chainId, account);

  if (isLoading) {
    return <Loader />;
  }

  const isWizard = !hasAddressInUrl && (isHashZero(userReferralCode) || !account || !userReferralCode);

  return (
    <div className="flex gap-8 max-md:flex-col">
      {isWizard ? (
        <>
          <div className="flex grow flex-col gap-8">
            <JoinReferralWizard onGoToTraderDashboard={() => undefined} />
          </div>
          <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
            <Faq items={WIZARD_FAQS} title={<Trans>FAQ</Trans>} />
          </div>
        </>
      ) : (
        <ReferralsTradersContent account={account} referralsData={referralsData} />
      )}
    </div>
  );
}
