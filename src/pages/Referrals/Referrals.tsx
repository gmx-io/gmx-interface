import { Trans, msg, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useLocalStorage } from "react-use";

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
import useWallet from "lib/wallets/useWallet";

import Loader from "components/Common/Loader";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";
import AddAffiliateCode from "components/Referrals/AddAffiliateCode";
import AffiliatesStats from "components/Referrals/AffiliatesStats";
import JoinReferralCode from "components/Referrals/JoinReferralCode";
import { deserializeSampleStats, isRecentReferralCodeNotExpired } from "components/Referrals/referralsHelper";
import TradersStats from "components/Referrals/TradersStats";
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
  if (queryAccount && ethers.isAddress(queryAccount)) {
    account = ethers.getAddress(queryAccount);
  } else {
    account = walletAccount;
  }
  const { chainId } = useChainId();
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

  function handleCreateReferralCode(referralCode: string) {
    return registerReferralCode(chainId, referralCode, signer, {
      sentMsg: t`Referral code submitted!`,
      failMsg: t`Referral code creation failed.`,
      pendingTxns,
    });
  }

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
        />
      );
    } else {
      return (
        <AddAffiliateCode
          handleCreateReferralCode={handleCreateReferralCode}
          active={active}
          recentlyAddedCodes={recentlyAddedCodes}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
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
    <SEO title={getPageTitle(t`Referrals`)}>
      <div className="default-container page-layout Referrals">
        <PageTitle
          isTop
          title={t`Referrals`}
          subtitle={
            <Trans>
              Get fee discounts and earn rebates through the GMX referral program.
              <br />
              For more information, please read the{" "}
              <ExternalLink href="https://docs.gmx.io/docs/referrals">referral program details</ExternalLink>.
            </Trans>
          }
          qa="referrals-page"
        />
        <div className="referral-tab-container">
          <Tabs options={tabsOptions} selectedValue={activeTab} onChange={setActiveTab} />
        </div>
        {activeTab === AFFILIATES ? renderAffiliatesTab() : renderTradersTab()}
      </div>
      <Footer />
    </SEO>
  );
}

export default Referrals;
