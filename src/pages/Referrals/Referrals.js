import "./Referrals.css";
import { useLocalStorage } from "react-use";
import { Trans, t } from "@lingui/macro";
import { useParams } from "react-router-dom";
import SEO from "components/Common/SEO";
import Tab from "components/Tab/Tab";
import Loader from "components/Common/Loader";
import Footer from "components/Footer/Footer";
import { getPageTitle, isHashZero } from "lib/legacy";
import { registerReferralCode, useCodeOwner, useReferrerTier, useUserReferralCode } from "domain/referrals";
import JoinReferralCode from "components/Referrals/JoinReferralCode";
import AffiliatesStats from "components/Referrals/AffiliatesStats";
import TradersStats from "components/Referrals/TradersStats";
import AddAffiliateCode from "components/Referrals/AddAffiliateCode";
import { deserializeSampleStats, isRecentReferralCodeNotExpired } from "components/Referrals/referralsHelper";
import { ethers } from "ethers";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { REFERRALS_SELECTED_TAB_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getIcon } from "config/icons";
import useReferralsData from "domain/referrals/useReferralsData";
import useWallet from "lib/wallets/useWallet";

const TRADERS = "Traders";
const AFFILIATES = "Affiliates";
const TAB_OPTIONS = [TRADERS, AFFILIATES];

function Referrals({ setPendingTxns, pendingTxns }) {
  const { isConnected, address: walletAccount, signer } = useWallet();

  const { account: queryAccount } = useParams();

  let account;
  if (queryAccount && ethers.utils.isAddress(queryAccount)) {
    account = ethers.utils.getAddress(queryAccount);
  } else {
    account = walletAccount;
  }
  const { chainId } = useChainId();
  const [activeTab, setActiveTab] = useLocalStorage(REFERRALS_SELECTED_TAB_KEY, TRADERS);
  const [recentlyAddedCodes, setRecentlyAddedCodes] = useLocalStorageSerializeKey([chainId, "REFERRAL", account], [], {
    deserializer: deserializeSampleStats,
  });
  const { data: referralsData, loading } = useReferralsData(account);
  const { userReferralCode, userReferralCodeString } = useUserReferralCode(signer, chainId, account);
  const { codeOwner } = useCodeOwner(signer, chainId, account, userReferralCode);
  const { referrerTier: traderTier } = useReferrerTier(signer, chainId, codeOwner);
  const networkIcon = getIcon(chainId, "network");

  function handleCreateReferralCode(referralCode) {
    return registerReferralCode(chainId, referralCode, signer, {
      sentMsg: t`Referral code submitted!`,
      failMsg: t`Referral code creation failed.`,
      pendingTxns,
    });
  }

  function renderAffiliatesTab() {
    const currentReferralsData = referralsData?.[chainId];
    const isReferralCodeAvailable =
      currentReferralsData?.codes?.length > 0 || recentlyAddedCodes?.filter(isRecentReferralCodeNotExpired).length > 0;
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
          active={isConnected}
          recentlyAddedCodes={recentlyAddedCodes}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
        />
      );
    }
  }

  function renderTradersTab() {
    if (loading) return <Loader />;
    if (isHashZero(userReferralCode) || !account || !userReferralCode) {
      return <JoinReferralCode active={isConnected} setPendingTxns={setPendingTxns} pendingTxns={pendingTxns} />;
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
  const TAB_OPTION_LABELS = { [TRADERS]: t`Traders`, [AFFILIATES]: t`Affiliates` };

  return (
    <SEO title={getPageTitle(t`Referrals`)}>
      <div className="default-container page-layout Referrals">
        <div className="section-title-block">
          <div className="section-title-icon" />
          <div className="section-title-content">
            <div className="Page-title">
              <Trans>
                Referrals <img width="24" src={networkIcon} alt="Network Icon" />
              </Trans>
            </div>
            <div className="Page-description">
              <Trans>
                Get fee discounts and earn rebates through the GMX referral program.
                <br />
                For more information, please read the{" "}
                <ExternalLink href="https://gmxio.gitbook.io/gmx/referrals">referral program details</ExternalLink>.
              </Trans>
            </div>
          </div>
        </div>
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
