import { Trans, msg, t } from "@lingui/macro";
import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useLocalStorage } from "react-use";
import { getAddress, isAddress } from "viem";

import { BOTANIX } from "config/chains";
import { REFERRALS_SELECTED_TAB_KEY } from "config/localStorage";
import { useReferralsData } from "domain/referrals";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { getPageTitle } from "lib/legacy";
import useRouteQuery from "lib/useRouteQuery";
import useWallet from "lib/wallets/useWallet";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { BotanixBanner } from "components/BotanixBanner/BotanixBanner";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import PageTitle from "components/PageTitle/PageTitle";
import { ReferralsAffiliatesTab } from "components/Referrals/ReferralsAffiliatesTab";
import { ReferralsDistributionsTab } from "components/Referrals/ReferralsDistributionsTab";
import { CREATE_REFERRAL_CODE_QUERY_PARAM } from "components/Referrals/referralsHelper";
import { ReferralsTradersTab } from "components/Referrals/ReferralsTradersTab";
import SEO from "components/Seo/SEO";
import Tabs from "components/Tabs/Tabs";
import { Option } from "components/Tabs/types";

import "./Referrals.css";

enum ReferralsTab {
  Traders = "traders",
  Affiliates = "affiliates",
  Distributions = "distributions",
}

const TAB_OPTIONS = [ReferralsTab.Traders, ReferralsTab.Affiliates, ReferralsTab.Distributions];
const TAB_OPTION_LABELS = {
  [ReferralsTab.Traders]: msg`Traders`,
  [ReferralsTab.Affiliates]: msg`Affiliates`,
  [ReferralsTab.Distributions]: msg`Distributions`,
};

function Referrals() {
  const { account: walletAccount } = useWallet();
  const { account: queryAccount } = useParams<{ account?: string }>();
  let account: string | undefined;
  if (queryAccount && isAddress(queryAccount, { strict: false })) {
    account = getAddress(queryAccount);
  } else {
    account = walletAccount;
  }
  const { chainId } = useChainId();
  const [activeTab, setActiveTab] = useLocalStorage(REFERRALS_SELECTED_TAB_KEY, ReferralsTab.Traders);
  const { data: referralsData, isLoading } = useReferralsData(account);
  const localizedTabOptionLabels = useLocalizedMap(TAB_OPTION_LABELS);
  const routeQuery = useRouteQuery();

  const createReferralCodePrefill = routeQuery.get(CREATE_REFERRAL_CODE_QUERY_PARAM) ?? undefined;

  const isBotanix = chainId === BOTANIX;

  const tabsOptions = useMemo((): Option<ReferralsTab>[] => {
    return TAB_OPTIONS.map((option) => ({
      value: option,
      label: localizedTabOptionLabels[option],
    }));
  }, [localizedTabOptionLabels]);

  useEffect(() => {
    if (createReferralCodePrefill && activeTab !== ReferralsTab.Affiliates) {
      setActiveTab(ReferralsTab.Affiliates);
    }
  }, [createReferralCodePrefill, activeTab, setActiveTab]);

  return (
    <AppPageLayout title={t`Referrals`} header={<ChainContentHeader />}>
      <SEO title={getPageTitle(t`Referrals`)}>
        <div className="default-container page-layout flex grow flex-col gap-20">
          <PageTitle
            isTop
            title={t`Referrals`}
            subtitle={
              !isBotanix ? (
                <Trans>
                  Get fee discounts and earn up to 20% commission through the GMX <br /> referral programs.
                </Trans>
              ) : undefined
            }
            qa="referrals-page"
          />
          {isBotanix ? (
            <BotanixBanner />
          ) : (
            <div className="flex grow flex-col">
              <Tabs
                type="inline-primary"
                className="mb-8"
                options={tabsOptions}
                selectedValue={activeTab}
                onChange={setActiveTab}
              />

              {activeTab === ReferralsTab.Traders && (
                <ReferralsTradersTab isLoading={isLoading} account={account} referralsData={referralsData} />
              )}
              {activeTab === ReferralsTab.Affiliates && (
                <ReferralsAffiliatesTab
                  loading={isLoading}
                  account={account}
                  referralsData={referralsData}
                  initialReferralCode={createReferralCodePrefill}
                />
              )}
              {activeTab === ReferralsTab.Distributions && (
                <ReferralsDistributionsTab loading={isLoading} account={account} referralsData={referralsData} />
              )}
            </div>
          )}
        </div>
      </SEO>
    </AppPageLayout>
  );
}

export default Referrals;
