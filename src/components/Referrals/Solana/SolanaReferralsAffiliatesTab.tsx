import { Trans } from "@lingui/macro";

import { Faq } from "components/Faq/Faq";
import Loader from "components/Loader/Loader";
import { HowToStartEarning } from "components/Referrals/affiliates/HowToStartEarning";

import { SolanaAffiliateDashboard } from "./SolanaAffiliateDashboard";
import { SolanaCreateAffiliateWizard } from "./SolanaCreateAffiliateWizard";
import { SOLANA_AFFILIATE_WIZARD_FAQS } from "./solanaReferralsFaq";
import type { SolanaAffiliateData, SolanaReferralsData } from "./solanaReferralsTypes";

function getEmptyAffiliate(code: string): SolanaAffiliateData {
  return { code, rewardRatePercent: undefined, totalReferrals: 0, activeReferrals: 0, activity: [], referees: [] };
}

export function SolanaReferralsAffiliatesTab({
  data,
  justCreatedCode,
  isDashboardForced,
  hasAppliedTraderCode,
  onCreated,
  onGoToDashboard,
}: {
  data: SolanaReferralsData;
  /** The user applied someone's code, so the "enter a code" promo is hidden */
  hasAppliedTraderCode: boolean;
  /** Code created in this visit, before the data shows it */
  justCreatedCode: string | undefined;
  isDashboardForced: boolean;
  onCreated: (code: string) => void;
  onGoToDashboard: () => void;
}) {
  if (data.isWalletInitializing || (data.account && data.isLoading)) {
    return <Loader />;
  }

  const affiliate =
    data.affiliate ?? (isDashboardForced && justCreatedCode ? getEmptyAffiliate(justCreatedCode) : undefined);

  if (data.account && affiliate) {
    return (
      <SolanaAffiliateDashboard
        account={data.account}
        affiliate={affiliate}
        hasAppliedTraderCode={hasAppliedTraderCode}
      />
    );
  }

  return (
    <div className="flex gap-8 max-md:flex-col">
      <div className="flex grow flex-col gap-8">
        <SolanaCreateAffiliateWizard
          account={data.account}
          createCode={data.createCode}
          onCreated={onCreated}
          onGoToAffiliateDashboard={onGoToDashboard}
        />
        <HowToStartEarning shareStepLabel={<Trans>Share and earn GT</Trans>} />
      </div>
      <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
        <Faq items={SOLANA_AFFILIATE_WIZARD_FAQS} title={<Trans>FAQ</Trans>} />
      </div>
    </div>
  );
}
