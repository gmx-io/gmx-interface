import { Trans } from "@lingui/macro";

import { Faq } from "components/Faq/Faq";
import Loader from "components/Loader/Loader";
import { HowToStartSaving } from "components/Referrals/traders/HowToStartSaving";

import { SolanaJoinReferralWizard } from "./SolanaJoinReferralWizard";
import { SOLANA_TRADER_WIZARD_FAQS } from "./solanaReferralsFaq";
import type { SolanaReferralsData } from "./solanaReferralsTypes";
import { SolanaTradersDashboard } from "./SolanaTradersDashboard";

export function SolanaReferralsTradersTab({
  data,
  justAppliedCode,
  isDashboardForced,
  ownAffiliateCode,
  onApplied,
  onGoToDashboard,
}: {
  data: SolanaReferralsData;
  /** The user's own affiliate code: it hides the "create a code" promo and can't be applied */
  ownAffiliateCode: string | undefined;
  /** Code applied in this visit, before the data shows it */
  justAppliedCode: string | undefined;
  isDashboardForced: boolean;
  onApplied: (code: string) => void;
  onGoToDashboard: () => void;
}) {
  if (data.isWalletInitializing || (data.account && data.isLoading)) {
    return <Loader />;
  }

  // A code applied in this visit keeps its success screen until the user moves on
  const isOnSuccessScreen = Boolean(justAppliedCode) && !isDashboardForced;
  const appliedCode = isOnSuccessScreen
    ? undefined
    : data.appliedCode ?? (isDashboardForced ? justAppliedCode : undefined);
  const isWizard = !data.account || !appliedCode;

  return (
    <div className="flex gap-8 max-md:flex-col">
      {isWizard ? (
        <>
          <div className="flex grow flex-col gap-8">
            <SolanaJoinReferralWizard
              key={data.account ?? "no-wallet"}
              account={data.account}
              ownCode={ownAffiliateCode}
              topHolders={data.topHolders}
              applyCode={data.applyCode}
              onApplied={onApplied}
              onGoToTraderDashboard={onGoToDashboard}
            />
            <HowToStartSaving />
          </div>
          <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
            <Faq items={SOLANA_TRADER_WIZARD_FAQS} title={<Trans>FAQ</Trans>} />
          </div>
        </>
      ) : (
        <SolanaTradersDashboard
          key={data.account}
          data={data}
          appliedCode={appliedCode}
          hasOwnAffiliateCode={Boolean(ownAffiliateCode)}
        />
      )}
    </div>
  );
}
