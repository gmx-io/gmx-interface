import "./Referrals.css";
import React from "react";
import { useLocalStorage } from "react-use";
import { useWeb3React } from "@web3-react/core";
import SEO from "../../components/Common/SEO";
import Tab from "../../components/Tab/Tab";
import Loader from "../../components/Common/Loader";
import Footer from "../../Footer";
import {
  useChainId,
  getPageTitle,
  REFERRALS_SELECTED_TAB_KEY,
  useLocalStorageSerializeKey,
  isHashZero,
} from "../../Helpers";
import {
  useReferralsData,
  registerReferralCode,
  useCodeOwner,
  useReferrerTier,
  useUserReferralCode,
} from "../../Api/referrals";
import JoinReferralCode from "../../components/Referrals/JoinReferralCode";
import AffiliatesStats from "../../components/Referrals/AffiliatesStats";
import TradersStats from "../../components/Referrals/TradersStats";
import AddAffiliateCode from "../../components/Referrals/AddAffiliateCode";
import { deserializeSampleStats, isRecentReferralCodeNotExpired } from "../../components/Referrals/referralsHelper";

const TRADERS = "Traders";
const AFFILIATES = "Affiliates";
const TAB_OPTIONS = [TRADERS, AFFILIATES];

function Referrals({ connectWallet, setPendingTxns, pendingTxns }) {
  const { active, account, library } = useWeb3React();
  const { chainId } = useChainId();
  const [activeTab, setActiveTab] = useLocalStorage(REFERRALS_SELECTED_TAB_KEY, TRADERS);
  const { data: referralsData, loading } = useReferralsData(chainId, account);
  const [recentlyAddedCodes, setRecentlyAddedCodes] = useLocalStorageSerializeKey([chainId, "REFERRAL", account], [], {
    deserializer: deserializeSampleStats,
  });
  const { userReferralCode, userReferralCodeString } = useUserReferralCode(library, chainId, account);
  const { codeOwner } = useCodeOwner(library, chainId, account, userReferralCode);
  const { referrerTier: traderTier } = useReferrerTier(library, chainId, codeOwner);

  function handleCreateReferralCode(referralCode) {
    return registerReferralCode(chainId, referralCode, library, {
      sentMsg: "Referral code submitted!",
      failMsg: "Referral code creation failed.",
      pendingTxns,
    });
  }

  function renderAffiliatesTab() {
    const isReferralCodeAvailable =
      referralsData?.codes?.length > 0 || recentlyAddedCodes?.filter(isRecentReferralCodeNotExpired).length > 0;
    if (loading) return <Loader />;
    if (isReferralCodeAvailable) {
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
          connectWallet={connectWallet}
          recentlyAddedCodes={recentlyAddedCodes}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
        />
      );
    }
  }

  function renderTradersTab() {
    if (loading) return <Loader />;
    if (isHashZero(userReferralCode) || !account || !userReferralCode) {
      return (
        <JoinReferralCode
          connectWallet={connectWallet}
          active={active}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
        />
      );
    }
    return (
      <TradersStats
        userReferralCodeString={userReferralCodeString}
        chainId={chainId}
        referralsData={referralsData}
        setPendingTxns={setPendingTxns}
        pendingTxns={pendingTxns}
        traderTier={traderTier}
      />
    );
  }

  return (
    <SEO title={getPageTitle("Referrals")}>
      <div className="default-container page-layout Referrals">
        <div className="section-title-block">
          <div className="section-title-icon"></div>
          <div className="section-title-content">
            <div className="Page-title">Referrals</div>
            <div className="Page-description">
              Get fee discounts and earn rebates through the GMX referral program.
              <br />
              For more information, please read the{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://gmxio.gitbook.io/gmx/referrals">
                referral program details
              </a>
              .
            </div>
          </div>
        </div>
        <div className="referral-tab-container">
          <Tab options={TAB_OPTIONS} option={activeTab} setOption={setActiveTab} onChange={setActiveTab} />
        </div>
        {activeTab === AFFILIATES ? renderAffiliatesTab() : renderTradersTab()}
      </div>
      <Footer />
    </SEO>
  );
}

export default Referrals;
