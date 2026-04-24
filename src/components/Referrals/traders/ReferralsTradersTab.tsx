import { Trans } from "@lingui/macro";
import { useCallback, useState } from "react";

import { useUserReferralCode } from "domain/referrals";
import { useChainId } from "lib/chains";
import { isHashZero } from "lib/legacy";

import { Faq } from "components/Faq/Faq";
import Loader from "components/Loader/Loader";
import { ReferralsTradersContent } from "components/Referrals/traders/dashboard/ReferralsTradersContent";
import { WIZARD_FAQS } from "components/Referrals/traders/faq";
import { HowToStartSaving } from "components/Referrals/traders/HowToStartSaving";
import { JoinReferralWizard } from "components/Referrals/traders/joinCode/JoinReferralWizard";

type ReferralsTradersTabProps = {
  account: string | undefined;
  isLoading: boolean;
  hasAddressInUrl?: boolean;
};

export function ReferralsTradersTab({ isLoading, account, hasAddressInUrl = false }: ReferralsTradersTabProps) {
  const [forceDashboard, setForceDashboard] = useState(false);
  const { chainId } = useChainId();
  const { userReferralCode } = useUserReferralCode(chainId, account);
  const handleGoToTraderDashboard = useCallback(() => setForceDashboard(true), []);

  if (isLoading) {
    return <Loader />;
  }

  const isWizard =
    !forceDashboard && !hasAddressInUrl && (isHashZero(userReferralCode) || !account || !userReferralCode);

  return (
    <div className="flex gap-8 max-md:flex-col">
      {isWizard ? (
        <>
          <div className="flex grow flex-col gap-8">
            <JoinReferralWizard onGoToTraderDashboard={handleGoToTraderDashboard} />
            <HowToStartSaving />
          </div>
          <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
            <Faq items={WIZARD_FAQS} title={<Trans>FAQ</Trans>} />
          </div>
        </>
      ) : (
        <ReferralsTradersContent account={account} />
      )}
    </div>
  );
}
