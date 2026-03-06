import { Trans, msg, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo } from "react";
import { matchPath, useHistory, useLocation } from "react-router-dom";
import { getAddress, isAddress } from "viem";
import { useAccount } from "wagmi";

import { BOTANIX } from "config/chains";
import { useReferralsData } from "domain/referrals";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { getPageTitle } from "lib/legacy";
import useRouteQuery from "lib/useRouteQuery";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { BotanixBanner } from "components/BotanixBanner/BotanixBanner";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import PageTitle from "components/PageTitle/PageTitle";
import { ReferralsAffiliatesTab } from "components/Referrals/affiliates/ReferralsAffiliatesTab";
import { ReferralsDistributionsTab } from "components/Referrals/distributions/ReferralsDistributionsTab";
import { CREATE_REFERRAL_CODE_QUERY_PARAM } from "components/Referrals/shared/utils/referralsHelper";
import { ReferralsTradersTab } from "components/Referrals/traders/ReferralsTradersTab";
import SEO from "components/Seo/SEO";
import Tabs from "components/Tabs/Tabs";
import { Option } from "components/Tabs/types";

enum ReferralsTab {
  Traders = "traders",
  Affiliates = "affiliates",
  Distributions = "distributions",
}

export const TAB_OPTIONS = [ReferralsTab.Traders, ReferralsTab.Affiliates, ReferralsTab.Distributions];
const TAB_OPTION_LABELS = {
  [ReferralsTab.Traders]: msg`Traders`,
  [ReferralsTab.Affiliates]: msg`Affiliates`,
  [ReferralsTab.Distributions]: msg`Distributions`,
};

function useReferralsRouteParams() {
  const { pathname } = useLocation();
  const { address: walletAddress } = useAccount();

  return useMemo(() => {
    const match = matchPath<{ tabName: string; address?: string }>(pathname, {
      path: "/referrals/:tabName/:address?",
      exact: true,
    });
    const tabName = match?.params?.tabName as ReferralsTab | undefined;
    const address = match?.params?.address;
    const hasAddressInUrl = Boolean(address && isAddress(address, { strict: false }));

    const account = hasAddressInUrl ? getAddress(address!) : walletAddress;
    const activeTab = tabName && TAB_OPTIONS.includes(tabName) ? tabName : ReferralsTab.Traders;
    const isTabValidInUrl = Boolean(tabName && TAB_OPTIONS.includes(tabName));

    return { account, activeTab, isTabValidInUrl, hasAddressInUrl };
  }, [pathname, walletAddress]);
}

function Referrals() {
  const history = useHistory();
  const { chainId } = useChainId();
  const localizedTabOptionLabels = useLocalizedMap(TAB_OPTION_LABELS);
  const routeQuery = useRouteQuery();
  const { account, activeTab, isTabValidInUrl, hasAddressInUrl } = useReferralsRouteParams();

  const { data: referralsData, isLoading } = useReferralsData(account);
  const createReferralCodePrefill = routeQuery.get(CREATE_REFERRAL_CODE_QUERY_PARAM) ?? undefined;

  const isBotanix = chainId === BOTANIX;

  const tabsOptions = useMemo((): Option<ReferralsTab>[] => {
    return TAB_OPTIONS.map((option) => ({
      value: option,
      label: localizedTabOptionLabels[option],
    }));
  }, [localizedTabOptionLabels]);

  const setActiveTab = useCallback(
    (newTab: ReferralsTab) => {
      const basePath = hasAddressInUrl && account ? `/referrals/${newTab}/${account}` : `/referrals/${newTab}`;
      history.replace(basePath + (routeQuery.toString() ? `?${routeQuery.toString()}` : ""));
    },
    [account, hasAddressInUrl, history, routeQuery]
  );

  useEffect(() => {
    if (!isTabValidInUrl) {
      setActiveTab(ReferralsTab.Traders);
    }
  }, [isTabValidInUrl, setActiveTab]);

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
                <ReferralsTradersTab
                  isLoading={isLoading}
                  account={account}
                  hasAddressInUrl={hasAddressInUrl}
                />
              )}
              {activeTab === ReferralsTab.Affiliates && (
                <ReferralsAffiliatesTab
                  loading={isLoading}
                  account={account}
                  referralsData={referralsData}
                  initialReferralCode={createReferralCodePrefill}
                  hasAddressInUrl={hasAddressInUrl}
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
