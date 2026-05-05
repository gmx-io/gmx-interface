import { Trans, msg, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { BOTANIX } from "config/chains";
import { useReferralsData, useUserReferralCode } from "domain/referrals";
import { CREATE_REFERRAL_CODE_QUERY_PARAM } from "domain/referrals/utils/referralsHelper";
import { useMegaethPointsActive } from "domain/synthetics/common/useMegaethPointsActive";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { getPageTitle, isHashZero } from "lib/legacy";
import useRouteQuery from "lib/useRouteQuery";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { BlueShimmerText } from "components/BlueShimmerText/BlueShimmerText";
import { BotanixBanner } from "components/BotanixBanner/BotanixBanner";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import PageTitle from "components/PageTitle/PageTitle";
import { ReferralsAffiliatesTab } from "components/Referrals/affiliates/ReferralsAffiliatesTab";
import { ReferralsDistributionsTab } from "components/Referrals/distributions/ReferralsDistributionsTab";
import { useRecentReferralCodes } from "components/Referrals/shared/hooks/useRecentReferralCodes";
import { ReferralsTradersTab } from "components/Referrals/traders/ReferralsTradersTab";
import SEO from "components/Seo/SEO";
import Tabs from "components/Tabs/Tabs";
import { Option, RegularOption } from "components/Tabs/types";

import LockIcon from "img/ic_lock.svg?react";
import sparkleIcon from "img/sparkle.svg";

export enum ReferralsTab {
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

type Props = {
  account: string | undefined;
  activeTab: ReferralsTab;
  hasAddressInUrl: boolean;
};

function Referrals({ account, activeTab, hasAddressInUrl }: Props) {
  const history = useHistory();
  const { chainId } = useChainId();
  const localizedTabOptionLabels = useLocalizedMap(TAB_OPTION_LABELS);
  const routeQuery = useRouteQuery();

  const { data: referralsData, isLoading } = useReferralsData(account);
  const createReferralCodePrefill = routeQuery.get(CREATE_REFERRAL_CODE_QUERY_PARAM) ?? undefined;

  const isBotanix = chainId === BOTANIX;

  const hasAffiliateCode = Boolean(referralsData?.chains?.[chainId]?.codes?.length);
  const { recentCodes } = useRecentReferralCodes();
  const hasAnyAffiliateCode = hasAffiliateCode || recentCodes.length > 0;

  const { userReferralCode } = useUserReferralCode(chainId, account);
  const hasTraderCode = Boolean(userReferralCode && !isHashZero(userReferralCode));

  const isOnTradersDashboard = activeTab === ReferralsTab.Traders && hasTraderCode && !hasAddressInUrl;
  const isOnAffiliatesDashboard = activeTab === ReferralsTab.Affiliates && hasAnyAffiliateCode && !hasAddressInUrl;
  const isMegaethPointsActive = useMegaethPointsActive();

  const tabsOptions = useMemo((): Option<ReferralsTab>[] => {
    return TAB_OPTIONS.map((option): RegularOption<ReferralsTab> => {
      const isDistributionsLocked = option === ReferralsTab.Distributions && !hasAffiliateCode;

      const shouldShimmer =
        (option === ReferralsTab.Affiliates && isOnTradersDashboard && !hasAnyAffiliateCode) ||
        (option === ReferralsTab.Traders && isOnAffiliatesDashboard && !hasTraderCode);

      const baseLabel = localizedTabOptionLabels[option];
      const labelNode =
        isMegaethPointsActive && option === ReferralsTab.Affiliates ? (
          <span className="inline-flex items-center gap-4">
            {baseLabel}
            <img className="h-10" src={sparkleIcon} alt="" />
          </span>
        ) : (
          baseLabel
        );

      return {
        value: option,
        label: shouldShimmer ? <BlueShimmerText>{labelNode}</BlueShimmerText> : labelNode,
        disabled: isDistributionsLocked,
        disabledMessage: isDistributionsLocked ? t`Register an affiliate code to access distributions` : undefined,
        icon: isDistributionsLocked ? <LockIcon className="size-16" /> : undefined,
      };
    });
  }, [
    localizedTabOptionLabels,
    hasAffiliateCode,
    isOnTradersDashboard,
    isOnAffiliatesDashboard,
    hasAnyAffiliateCode,
    hasTraderCode,
    isMegaethPointsActive,
  ]);

  const setActiveTab = useCallback(
    (newTab: ReferralsTab) => {
      const basePath = hasAddressInUrl && account ? `/referrals/${newTab}/${account}` : `/referrals/${newTab}`;
      history.replace(basePath + (routeQuery.toString() ? `?${routeQuery.toString()}` : ""));
    },
    [account, hasAddressInUrl, history, routeQuery]
  );

  useEffect(() => {
    if (activeTab === ReferralsTab.Distributions && !hasAffiliateCode && !isLoading) {
      setActiveTab(ReferralsTab.Affiliates);
    }
  }, [activeTab, hasAffiliateCode, isLoading, setActiveTab]);

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
                  Get fee discounts and earn up to 15% commission through the GMX <br /> referral program.
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
                <ReferralsTradersTab isLoading={isLoading} account={account} hasAddressInUrl={hasAddressInUrl} />
              )}
              {activeTab === ReferralsTab.Affiliates && (
                <ReferralsAffiliatesTab
                  isLoading={isLoading}
                  account={account}
                  referralsData={referralsData}
                  initialReferralCode={createReferralCodePrefill}
                  hasAddressInUrl={hasAddressInUrl}
                />
              )}
              {activeTab === ReferralsTab.Distributions && (
                <ReferralsDistributionsTab isLoading={isLoading} account={account} referralsData={referralsData} />
              )}
            </div>
          )}
        </div>
      </SEO>
    </AppPageLayout>
  );
}

export default Referrals;
