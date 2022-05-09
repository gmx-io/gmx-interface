import React from "react";
import { useLocalStorage } from "react-use";
import { useWeb3React } from "@web3-react/core";
import SEO from "../../components/Common/SEO";
import Tab from "../../components/Tab/Tab";
import Footer from "../../Footer";
import { useChainId, getPageTitle, REFERRALS_SELECTED_TAB_KEY, useLocalStorageSerializeKey } from "../../Helpers";
import {
  encodeReferralCode,
  useReferralsData,
  registerReferralCode,
  useCodeOwner,
  useReferrerTier,
  useUserReferralCode,
} from "../../Api/referrals";

import "./Referrals.css";

import Loader from "../../components/Common/Loader";
import JoinReferralCode from "./JoinReferralCode";
import AffiliatesStats from "./AffiliatesStats";
import TradersStats from "./TradersStats";
import CreateAffiliateCode from "./CreateAffiliateCode";
import { isRecentReferralCodeNotExpired } from "./ReferralsHelper";

const TRADERS = "Traders";
const AFFILIATES = "Affiliates";
const TAB_OPTIONS = [TRADERS, AFFILIATES];

function Referrals({ connectWallet, setPendingTxns, pendingTxns }) {
  const { active, account, library, chainId: chainIdWithoutLocalStorage } = useWeb3React();
  const { chainId } = useChainId();
  const [activeTab, setActiveTab] = useLocalStorage(REFERRALS_SELECTED_TAB_KEY, TRADERS);
  const { data: referralsData, loading } = useReferralsData(chainIdWithoutLocalStorage, account);
  const [recentlyAddedCodes, setRecentlyAddedCodes] = useLocalStorageSerializeKey([chainId, "REFERRAL", account], []);
  const { userReferralCode, userReferralCodeString } = useUserReferralCode(library, chainId, account);
  const { codeOwner } = useCodeOwner(library, chainId, account, userReferralCode);
  const { referrerTier: traderTier } = useReferrerTier(library, chainId, codeOwner);

  function handleCreateReferralCode(code) {
    const referralCodeHex = encodeReferralCode(code);
    return registerReferralCode(chainId, referralCodeHex, library, {
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
          account={account}
          active={active}
          referralsData={referralsData}
          handleCreateReferralCode={handleCreateReferralCode}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
          recentlyAddedCodes={recentlyAddedCodes}
          chainId={chainId}
          library={library}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
        />
      );
    } else {
      return (
        <CreateAffiliateCode
          account={account}
          isWalletConnected={active}
          handleCreateReferralCode={handleCreateReferralCode}
          library={library}
          chainId={chainId}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
          referralsData={referralsData}
          connectWallet={connectWallet}
          recentlyAddedCodes={recentlyAddedCodes}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
        />
      );
    }
  }

  function renderTradersTab() {
    if (!userReferralCodeString || !account) {
      return (
        <JoinReferralCode
          account={account}
          connectWallet={connectWallet}
          isWalletConnected={active}
          library={library}
          chainId={chainId}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
        />
      );
    }
    if (!referralsData) return <Loader />;
    return (
      <TradersStats
        account={account}
        userReferralCodeString={userReferralCodeString}
        chainId={chainId}
        library={library}
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
