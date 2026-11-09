import { Trans, msg, t } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";

import { useLocalizedMap } from "lib/i18n";
import { getPageTitle } from "lib/legacy";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { BlueShimmerText } from "components/BlueShimmerText/BlueShimmerText";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import PageTitle from "components/PageTitle/PageTitle";
import { SolanaReferralsAffiliatesTab } from "components/Referrals/Solana/SolanaReferralsAffiliatesTab";
import { SolanaReferralsTradersTab } from "components/Referrals/Solana/SolanaReferralsTradersTab";
import { SolanaReferralsTab, SOLANA_REFERRALS_TABS } from "components/Referrals/Solana/solanaReferralsTypes";
import { useSolanaReferralsData } from "components/Referrals/Solana/useSolanaReferralsData";
import SEO from "components/Seo/SEO";
import Tabs from "components/Tabs/Tabs";
import { Option, RegularOption } from "components/Tabs/types";

const TAB_OPTION_LABELS = {
  [SolanaReferralsTab.Traders]: msg`Trader benefits`,
  [SolanaReferralsTab.Affiliates]: msg`Affiliate dashboard`,
};

export default function SolanaReferrals({ activeTab }: { activeTab: SolanaReferralsTab }) {
  const history = useHistory();
  const localizedTabOptionLabels = useLocalizedMap(TAB_OPTION_LABELS);
  const data = useSolanaReferralsData();

  // Codes applied or created in this visit, before the data shows them. They belong to the wallet that made them.
  const [visitAccount, setVisitAccount] = useState(data.account);
  const [justAppliedCode, setJustAppliedCode] = useState<string>();
  const [isTraderDashboardForced, setIsTraderDashboardForced] = useState(false);
  const [justCreatedCode, setJustCreatedCode] = useState<string>();
  const [isAffiliateDashboardForced, setIsAffiliateDashboardForced] = useState(false);

  if (visitAccount !== data.account) {
    // Another wallet (or none): forget the codes of the previous one
    setVisitAccount(data.account);
    setJustAppliedCode(undefined);
    setIsTraderDashboardForced(false);
    setJustCreatedCode(undefined);
    setIsAffiliateDashboardForced(false);
  }

  const hasTraderCode = Boolean(data.appliedCode ?? justAppliedCode);
  const hasAffiliateCode = Boolean(data.affiliate?.code ?? justCreatedCode);
  const isCreateCodeLabel = !data.account || (!data.isLoading && !hasAffiliateCode);
  const isOnTradersDashboard = activeTab === SolanaReferralsTab.Traders && hasTraderCode;
  const isOnAffiliatesDashboard = activeTab === SolanaReferralsTab.Affiliates && hasAffiliateCode;

  const tabsOptions = useMemo((): Option<SolanaReferralsTab>[] => {
    return SOLANA_REFERRALS_TABS.map((option): RegularOption<SolanaReferralsTab> => {
      const shouldShimmer =
        (option === SolanaReferralsTab.Affiliates && isOnTradersDashboard && !hasAffiliateCode) ||
        (option === SolanaReferralsTab.Traders && isOnAffiliatesDashboard && !hasTraderCode);

      const label =
        option === SolanaReferralsTab.Affiliates && isCreateCodeLabel
          ? t`Create referral code`
          : localizedTabOptionLabels[option];

      return {
        value: option,
        label: shouldShimmer ? <BlueShimmerText>{label}</BlueShimmerText> : label,
      };
    });
  }, [
    localizedTabOptionLabels,
    isCreateCodeLabel,
    isOnTradersDashboard,
    isOnAffiliatesDashboard,
    hasAffiliateCode,
    hasTraderCode,
  ]);

  const setActiveTab = useCallback(
    (newTab: SolanaReferralsTab) => {
      if (newTab === activeTab) return;
      // After a success screen, coming back to its tab shows the dashboard, not the form again
      if (justAppliedCode) setIsTraderDashboardForced(true);
      if (justCreatedCode) setIsAffiliateDashboardForced(true);
      history.replace(`/referrals/${newTab}${history.location.search}`);
    },
    [activeTab, history, justAppliedCode, justCreatedCode]
  );

  return (
    <AppPageLayout title={t`Referrals`} header={<ChainContentHeader />}>
      <SEO title={getPageTitle(t`Referrals`)}>
        <div className="default-container page-layout flex grow flex-col gap-20">
          <PageTitle
            isTop
            title={t`Referrals`}
            subtitle={
              <Trans>
                Get fee discounts and earn GT rewards through the GMX Solana <br className="max-md:hidden" /> referral
                program
              </Trans>
            }
            qa="referrals-page"
          />
          <div className="flex grow flex-col">
            <Tabs
              type="inline-primary"
              className="mb-8"
              options={tabsOptions}
              selectedValue={activeTab}
              onChange={setActiveTab}
            />

            {activeTab === SolanaReferralsTab.Traders && (
              <SolanaReferralsTradersTab
                data={data}
                justAppliedCode={justAppliedCode}
                isDashboardForced={isTraderDashboardForced}
                ownAffiliateCode={data.affiliate?.code ?? justCreatedCode}
                onApplied={setJustAppliedCode}
                onGoToDashboard={() => setIsTraderDashboardForced(true)}
              />
            )}
            {activeTab === SolanaReferralsTab.Affiliates && (
              <SolanaReferralsAffiliatesTab
                data={data}
                justCreatedCode={justCreatedCode}
                isDashboardForced={isAffiliateDashboardForced}
                hasAppliedTraderCode={hasTraderCode}
                onCreated={setJustCreatedCode}
                onGoToDashboard={() => setIsAffiliateDashboardForced(true)}
              />
            )}
          </div>
        </div>
      </SEO>
    </AppPageLayout>
  );
}
