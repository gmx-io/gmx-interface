import { Trans, msg, t } from "@lingui/macro";
import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useLocalStorage } from "react-use";
import { getAddress, isAddress } from "viem";

import { BOTANIX } from "config/chains";
import { REFERRALS_SELECTED_TAB_KEY } from "config/localStorage";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import {
  ReferralCodeStats,
  registerReferralCode,
  useAffiliateTier,
  useCodeOwner,
  useReferralsData,
  useReferrerDiscountShare,
  useUserReferralCode,
} from "domain/referrals";
import { useChainId } from "lib/chains";
import { useLocalizedMap } from "lib/i18n";
import { getPageTitle, isHashZero } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { serializeBigIntsInObject } from "lib/numbers";
import useRouteQuery from "lib/useRouteQuery";
import useWallet from "lib/wallets/useWallet";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { BotanixBanner } from "components/BotanixBanner/BotanixBanner";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Loader from "components/Loader/Loader";
import PageTitle from "components/PageTitle/PageTitle";
import AddAffiliateCode from "components/Referrals/AddAffiliateCode";
import AffiliatesStats from "components/Referrals/AffiliatesStats";
import JoinReferralCode from "components/Referrals/JoinReferralCode";
import {
  CREATE_REFERRAL_CODE_QUERY_PARAM,
  deserializeSampleStats,
  isRecentReferralCodeNotExpired,
} from "components/Referrals/referralsHelper";
import TradersStats from "components/Referrals/TradersStats";
import SEO from "components/Seo/SEO";
import Tabs from "components/Tabs/Tabs";

import "./Referrals.css";

const TRADERS = "Traders";
const AFFILIATES = "Affiliates";
const TAB_OPTIONS = [TRADERS, AFFILIATES];
const TAB_OPTION_LABELS = { [TRADERS]: msg`Traders`, [AFFILIATES]: msg`Affiliates` };

function Referrals() {
  const { active, account: walletAccount, signer } = useWallet();
  const { account: queryAccount } = useParams<{ account?: string }>();
  let account;
  if (queryAccount && isAddress(queryAccount)) {
    account = getAddress(queryAccount);
  } else {
    account = walletAccount;
  }
  const { chainId, srcChainId } = useChainId();
  const [activeTab, setActiveTab] = useLocalStorage(REFERRALS_SELECTED_TAB_KEY, TRADERS);
  const [recentlyAddedCodes, setRecentlyAddedCodes] = useLocalStorageSerializeKey<ReferralCodeStats[]>(
    [chainId, "REFERRAL", account],
    [],
    {
      raw: false,
      deserializer: deserializeSampleStats as any,
      serializer: (value) => {
        return JSON.stringify(serializeBigIntsInObject(value));
      },
    }
  );
  const { data: referralsData, loading } = useReferralsData(account);
  const { userReferralCode, userReferralCodeString } = useUserReferralCode(signer, chainId, account);
  const { codeOwner } = useCodeOwner(signer, chainId, account, userReferralCode);
  const { affiliateTier: traderTier } = useAffiliateTier(signer, chainId, codeOwner);
  const { discountShare } = useReferrerDiscountShare(signer, chainId, codeOwner);
  const { pendingTxns } = usePendingTxns();
  const localizedTabOptionLabels = useLocalizedMap(TAB_OPTION_LABELS);
  const routeQuery = useRouteQuery();

  const createReferralCodePrefill = routeQuery.get(CREATE_REFERRAL_CODE_QUERY_PARAM) ?? undefined;

  function handleCreateReferralCode(referralCode: string) {
    return registerReferralCode(chainId, referralCode, signer, {
      sentMsg: t`Referral code submitted.`,
      failMsg: t`Referral code creation failed.`,
      pendingTxns,
    });
  }

  const isBotanix = chainId === BOTANIX;

  function renderAffiliatesTab() {
    const ownsSomeChainCode = Boolean(referralsData?.chains?.[chainId]?.codes?.length);

    const hasRecentCode = recentlyAddedCodes?.some(isRecentReferralCodeNotExpired);
    const isSomeReferralCodeAvailable = ownsSomeChainCode || hasRecentCode;

    if (loading) return <Loader />;
    if (account && isSomeReferralCodeAvailable) {
      return (
        <AffiliatesStats
          referralsData={referralsData}
          handleCreateReferralCode={handleCreateReferralCode}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
          recentlyAddedCodes={recentlyAddedCodes}
          chainId={chainId}
          srcChainId={srcChainId}
        />
      );
    } else {
      return (
        <AddAffiliateCode
          handleCreateReferralCode={handleCreateReferralCode}
          active={active}
          recentlyAddedCodes={recentlyAddedCodes}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
          initialReferralCode={createReferralCodePrefill}
        />
      );
    }
  }

  const tabsOptions = useMemo(() => {
    return TAB_OPTIONS.map((option) => ({
      value: option,
      label: localizedTabOptionLabels[option],
    }));
  }, [localizedTabOptionLabels]);

  useEffect(() => {
    if (createReferralCodePrefill && activeTab !== AFFILIATES) {
      setActiveTab(AFFILIATES);
    }
  }, [createReferralCodePrefill, activeTab, setActiveTab]);

  function renderTradersTab() {
    if (loading) return <Loader />;
    if (isHashZero(userReferralCode) || !account || !userReferralCode) {
      return <JoinReferralCode active={active} />;
    }
    return (
      <TradersStats
        userReferralCodeString={userReferralCodeString}
        chainId={chainId}
        referralsData={referralsData}
        traderTier={traderTier}
        discountShare={discountShare}
      />
    );
  }

  return (
    <AppPageLayout header={<ChainContentHeader />}>
      <SEO title={getPageTitle(t`Referrals`)}>
        <div className="default-container page-layout flex flex-col gap-20">
          <PageTitle
            isTop
            title={t`Referrals`}
            subtitle={
              !isBotanix ? (
                <Trans>
                  Get fee discounts and earn rebates through the GMX referral program.
                  <br />
                  For more information, please read the{" "}
                  <ExternalLink href="https://docs.gmx.io/docs/referrals">referral program details</ExternalLink>.
                </Trans>
              ) : undefined
            }
            qa="referrals-page"
          />
          {isBotanix ? (
            <BotanixBanner />
          ) : (
            <div>
              <Tabs
                type="inline-primary"
                className="mb-16"
                options={tabsOptions}
                selectedValue={activeTab}
                onChange={setActiveTab}
              />

              {activeTab === AFFILIATES ? renderAffiliatesTab() : renderTradersTab()}
            </div>
          )}
        </div>
      </SEO>
    </AppPageLayout>
  );
}

export default Referrals;
