import { Trans, t } from "@lingui/macro";
import Loader from "components/Common/Loader";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import AddAffiliateCode from "components/Referrals/AddAffiliateCode";
import AffiliatesStats from "components/Referrals/AffiliatesStats";
import JoinReferralCode from "components/Referrals/JoinReferralCode";
import TradersStats from "components/Referrals/TradersStats";
import { deserializeSampleStats, isRecentReferralCodeNotExpired } from "components/Referrals/referralsHelper";
import Tab from "components/Tab/Tab";
import { REFERRALS_SELECTED_TAB_KEY } from "config/localStorage";
import {
  ReferralCodeStats,
  registerReferralCode,
  useAffiliateTier,
  useCodeOwner,
  useReferralsData,
  useReferrerDiscountShare,
  useUserReferralCode,
} from "domain/referrals";
import { ethers } from "ethers";
import { useChainId } from "lib/chains";
import { getPageTitle, isHashZero } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useParams } from "react-router-dom";
import { useLocalStorage } from "react-use";
import "./Referrals.css";
import useWallet from "lib/wallets/useWallet";
import PageTitle from "components/PageTitle/PageTitle";
import { usePendingTxns } from "lib/usePendingTxns";

const TRADERS = "Traders";
const AFFILIATES = "Affiliates";
const TAB_OPTIONS = [TRADERS, AFFILIATES];
const TAB_OPTION_LABELS = { [TRADERS]: t`Traders`, [AFFILIATES]: t`Affiliates` };

function Referrals() {
  const { active, account: walletAccount, signer } = useWallet();
  const { account: queryAccount } = useParams<{ account?: string }>();
  let account;
  if (queryAccount && ethers.utils.isAddress(queryAccount)) {
    account = ethers.utils.getAddress(queryAccount);
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
      serializer: (value) => JSON.stringify(value),
    }
  );
  const { data: referralsData, loading } = useReferralsData(account);
  const { userReferralCode, userReferralCodeString } = useUserReferralCode(signer, chainId, account);
  const { codeOwner } = useCodeOwner(signer, chainId, account, userReferralCode);
  const { affiliateTier: traderTier } = useAffiliateTier(signer, chainId, codeOwner);
  const { discountShare } = useReferrerDiscountShare(signer, chainId, codeOwner);
  const [pendingTxns] = usePendingTxns();

  function handleCreateReferralCode(referralCode) {
    return registerReferralCode(chainId, referralCode, signer, {
      sentMsg: t`Referral code submitted!`,
      failMsg: t`Referral code creation failed.`,
      pendingTxns,
    });
  }

  function renderAffiliatesTab() {
    const currentReferralsData = referralsData?.chains?.[chainId];

    const isReferralCodeAvailable =
      currentReferralsData?.codes?.length || recentlyAddedCodes?.filter(isRecentReferralCodeNotExpired).length;

    if (loading) return <Loader />;
    if (account && isReferralCodeAvailable) {
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
        />
        <div className="referral-tab-container">
          <Tab
            options={TAB_OPTIONS}
            optionLabels={TAB_OPTION_LABELS}
            option={activeTab}
            setOption={setActiveTab}
            onChange={setActiveTab}
          />
        </div>
        {activeTab === AFFILIATES ? renderAffiliatesTab() : renderTradersTab()}
      </div>
      <Footer />
    </SEO>
  );
}

export default Referrals;
