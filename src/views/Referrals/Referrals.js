import React, { useState } from "react";
import { useWeb3React } from "@web3-react/core";

import Card from "../../components/Common/Card";
import SEO from "../../components/Common/SEO";
import Tab from "../../components/Tab/Tab";
import Footer from "../../Footer";
import {
  useChainId,
  getPageTitle,
  formatAmount,
  USD_DECIMALS,
  helperToast,
  formatDate,
  getTokenInfo,
  getExplorerUrl,
  shortenAddress,
  fetcher,
  ARBITRUM,
} from "../../Helpers";
import { decodeReferralCode, useReferralsData } from "../../Api/referrals";

import "./Referrals.css";
import { registerReferralCode, setTraderReferralCodeByUser, useInfoTokens } from "../../Api";
import { utils } from "ethers";
import { BiCopy, BiEditAlt } from "react-icons/bi";
import Tooltip from "../../components/Tooltip/Tooltip";
import { useCopyToClipboard } from "react-use";
import Loader from "../../components/Common/Loader";
import Modal from "../../components/Modal/Modal";
import useSWR from "swr";
import { getContract } from "../../Addresses";
import ReferralContract from "../../abis/ReferralStorage.json";
import { RiQuestionLine } from "react-icons/ri";
import { FiPlus } from "react-icons/fi";

const AFFILIATE_CODE = "Affiliate Code";
const REFERRAL_CODE = "Referral Code";
let TAB_OPTIONS = [AFFILIATE_CODE, REFERRAL_CODE];

function getDollarValue(value) {
  return `$${formatAmount(value, USD_DECIMALS, 2, true, "0.00")}`;
}

function getErrorMessage(value) {
  let invalid = /\s/;
  if (!String(value).trim()) {
    return `Input can't be empty.`;
  }
  if (invalid.test(value)) {
    return "The referral code can't contain spaces.";
  }
  return "";
}

function Referrals({ connectWallet }) {
  const { active, account, library } = useWeb3React();
  const { chainId } = useChainId();
  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, undefined);
  let [activeTab, setActiveTab] = useState(AFFILIATE_CODE);
  const referralsData = useReferralsData(chainId, account);
  const ReferralToken = getContract(chainId, "Referral");

  const { data: userReferralCode } = useSWR(
    account && [
      `ReferralStorage:traderReferralCodes:${active}`,
      chainId,
      ReferralToken,
      "traderReferralCodes",
      account,
    ],
    {
      fetcher: fetcher(library, ReferralContract),
    }
  );

  let referralCodeInString;
  if (userReferralCode) {
    referralCodeInString = decodeReferralCode(userReferralCode);
  }
  function handleCreateReferralCode(event, code) {
    event.preventDefault();
    let referralCodeHex = utils.formatBytes32String(code);

    return registerReferralCode(chainId, referralCodeHex, {
      library,
      successMsg: `Referral code created!`,
      failMsg: "Referral code creation failed.",
    });
  }

  function renderBody() {
    if (activeTab === REFERRAL_CODE) {
      if (!account) {
        return (
          <CreateReferrarCode
            isWalletConnected={!!account}
            handleCreateReferralCode={handleCreateReferralCode}
            library={library}
            chainId={chainId}
            connectWallet={connectWallet}
          />
        );
      }
      if (!referralsData) return <Loader />;
      if (referralsData?.codes?.length > 0) {
        return (
          <ReferrersStats
            infoTokens={infoTokens}
            handleCreateReferralCode={handleCreateReferralCode}
            referralsData={referralsData}
            chainId={chainId}
            library={library}
          />
        );
      } else {
        return (
          <CreateReferrarCode
            isWalletConnected={!!account}
            handleCreateReferralCode={handleCreateReferralCode}
            library={library}
            chainId={chainId}
          />
        );
      }
    }
    if (activeTab === AFFILIATE_CODE) {
      if (!referralsData) return <Loader />;
      if (!referralCodeInString) {
        return (
          <JoinReferrarCode
            connectWallet={connectWallet}
            isWalletConnected={!!account}
            library={library}
            chainId={chainId}
          />
        );
      }

      return (
        <Rebates
          referralCodeInString={referralCodeInString}
          infoTokens={infoTokens}
          chainId={chainId}
          library={library}
          referralsData={referralsData}
        />
      );
    }
  }

  return (
    <SEO title={getPageTitle("Referrals")}>
      <div className="default-container page-layout">
        <div className="referral-tab-container">
          <Tab options={TAB_OPTIONS} option={activeTab} setOption={setActiveTab} onChange={setActiveTab} />
        </div>
        {renderBody()}
      </div>
      <Footer />
    </SEO>
  );
}

function CreateReferrarCode({ handleCreateReferralCode, isWalletConnected, connectWallet }) {
  let [referralCode, setReferralCode] = useState("");
  let [isProcessing, setIsProcessing] = useState(false);
  function handleSubmit(e) {
    setIsProcessing(true);
    handleCreateReferralCode(e, referralCode)
      .then((res) => {
        // console.log({ res });
      })
      .finally(() => setIsProcessing(false));
  }

  return (
    <div className="referral-card section-center mt-large">
      <h2 className="title">Generate Referral Code</h2>
      <p className="sub-title">
        Looks like you don't have a referral code to share. Create one now and start earning rebates!
      </p>
      <div className="card-action">
        {isWalletConnected ? (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={referralCode}
              disabled={isProcessing}
              placeholder="Enter a code"
              onChange={(e) => {
                setReferralCode(e.target.value);
              }}
            />
            <button className="default-btn" type="submit" disabled={isProcessing}>
              {isProcessing ? "Creating..." : "Create"}
            </button>
          </form>
        ) : (
          <button className="default-btn" type="submit" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

function ReferrersStats({ referralsData, infoTokens, chainId, library }) {
  let [referralCode, setReferralCode] = useState("");
  let [isAdding, setIsAdding] = useState(false);
  let [isAddReferralCodeOpen, setIsAddReferralCodeOpen] = useState(false);
  let [error, setError] = useState("");
  const [, copyToClipboard] = useCopyToClipboard();
  let open = () => setIsAddReferralCodeOpen(true);
  let close = () => setIsAddReferralCodeOpen(false);

  function handleCreateReferralCode(event) {
    event.preventDefault();

    let referralCodeHex = utils.formatBytes32String(referralCode);
    setIsAdding(true);
    return registerReferralCode(chainId, referralCodeHex, {
      library,
      successMsg: `Referral code created!`,
      failMsg: "Referral code creation failed.",
    })
      .then(() => {
        setReferralCode("");
      })
      .finally(() => {
        setIsAdding(false);
        close();
      });
  }

  let { cumulativeStats, referrerTotalStats, discountDistributions } = referralsData;

  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        <InfoCard label="Total Traders Referred" data={cumulativeStats?.referralsCount || "0"} />
        <InfoCard label="Total Trading Volume" data={getDollarValue(cumulativeStats?.volume)} />
        <InfoCard label="Total Rebates" data={getDollarValue(cumulativeStats?.rebates)} />
        <InfoCard label="Total Rebates For Traders" data={getDollarValue(cumulativeStats?.discountUsd)} />
      </div>
      <div className="list">
        <Card
          title={
            <div className="referral-table-header">
              <span>Referral Codes</span>
              <button className="transparent-btn" onClick={open}>
                <FiPlus /> <span className="ml-small">Add New</span>
              </button>
            </div>
          }
        >
          <table className="referral-table">
            <thead>
              <tr>
                <th scope="col">Referral Code</th>
                <th scope="col">Traders Referred</th>
                <th scope="col">Total Volume</th>
                <th scope="col">Total Rebate</th>
              </tr>
            </thead>
            <tbody>
              {referrerTotalStats.map((stat, index) => {
                return (
                  <tr key={index}>
                    <td data-label="Referral Code">
                      <div className="table-referral-code">
                        <div
                          onClick={() => {
                            copyToClipboard(`https://gmx.io/trade?refferalCode=${stat.referralCode}`);
                            helperToast.success("Referral link copied to your clipboard");
                          }}
                          className="referral-code"
                        >
                          <span>{stat.referralCode}</span>
                          <BiCopy />
                        </div>
                      </div>
                    </td>
                    <td data-label="Traders Referred">{stat.tradedReferralsCount}</td>
                    <td data-label="Total Volume">{getDollarValue(stat.volume)}</td>
                    <td data-label="Total Rebate">{getDollarValue(stat.totalRebateUsd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Modal
            className="Connect-wallet-modal"
            isVisible={isAddReferralCodeOpen}
            setIsVisible={setIsAddReferralCodeOpen}
            label="Create New Referral Code"
          >
            <div className="edit-referral-modal">
              <form onSubmit={!error && handleCreateReferralCode}>
                <input
                  disabled={isAdding}
                  type="text"
                  placeholder="Enter new referral code"
                  className="text-input edit-referral-code-input"
                  value={referralCode}
                  onChange={(e) => {
                    setError(getErrorMessage(referralCode));
                    setReferralCode(e.target.value);
                  }}
                />
                <p className="error">{error}</p>
                <button type="submit" className="App-cta Exchange-swap-button" disabled={error || isAdding}>
                  {isAdding ? "Adding..." : "Add New Referral Code"}
                </button>
              </form>
            </div>
          </Modal>
        </Card>
      </div>
      {discountDistributions?.length > 0 && (
        <div className="reward-history">
          <Card title="Rebates Distribution History">
            <table className="referral-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {discountDistributions.map((rebate, index) => {
                  let tokenInfo = getTokenInfo(infoTokens, rebate.token);
                  let explorerURL = getExplorerUrl(chainId);
                  return (
                    <tr key={index}>
                      <td data-label="Date">{formatDate(rebate.timestamp)}</td>
                      <td data-label="Amount">
                        {formatAmount(rebate.amount, tokenInfo.decimals, 4, true)} {tokenInfo.symbol}
                      </td>
                      <td data-label="Tx Hash">
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          href={explorerURL + `tx/${rebate.transactionHash}`}
                        >
                          {shortenAddress(rebate.transactionHash, 20)}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

function Rebates({ referralsData, infoTokens, chainId, library, referralCodeInString }) {
  let { referralTotalStats, rebateDistributions } = referralsData;
  let [isEditModalOpen, setIsEditModalOpen] = useState(false);
  let [editReferralCode, setEditReferralCode] = useState("");
  let [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  let open = () => setIsEditModalOpen(true);
  let close = () => setIsEditModalOpen(false);

  function handleUpdateReferralCode(event) {
    event.preventDefault();
    setIsUpdateSubmitting(true);
    let referralCodeHex = utils.formatBytes32String(editReferralCode);
    return setTraderReferralCodeByUser(chainId, referralCodeHex, {
      library,
      successMsg: `Referral code updated!`,
      failMsg: "Referral code updated failed.",
    }).finally(() => {
      setIsUpdateSubmitting(false);
      setIsEditModalOpen(false);
    });
  }

  return (
    <div className="rebate-container">
      <div className="referral-stats">
        <InfoCard label="Total Volume Traded" data={getDollarValue(referralTotalStats?.volume)} />
        <InfoCard label="Total Rebate" data={getDollarValue(referralTotalStats?.discountUsd)} />
        <InfoCard
          label="Active Referral Code"
          data={
            <div className="referral-code-edit">
              <span>{referralCodeInString}</span>
              <BiEditAlt onClick={open} />
            </div>
          }
        />
        <Modal
          className="Connect-wallet-modal"
          isVisible={isEditModalOpen}
          setIsVisible={close}
          label="Edit Referral Code"
        >
          <div className="edit-referral-modal">
            <form onSubmit={handleUpdateReferralCode}>
              <input
                disabled={isUpdateSubmitting}
                type="text"
                placeholder="Enter new referral code"
                className="text-input edit-referral-code-input"
                value={editReferralCode}
                onChange={(e) => setEditReferralCode(e.target.value)}
              />
              <button type="submit" className="App-cta Exchange-swap-button" disabled={isUpdateSubmitting}>
                {isUpdateSubmitting ? "Updating..." : "Update Referral Code"}
              </button>
            </form>
          </div>
        </Modal>
      </div>
      {rebateDistributions.length > 0 && (
        <div className="reward-history">
          <Card title="Rebates Distribution History">
            <table className="referral-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {rebateDistributions.map((rebate, index) => {
                  let tokenInfo = getTokenInfo(infoTokens, rebate.token);
                  let explorerURL = getExplorerUrl(chainId);
                  return (
                    <tr key={index}>
                      <td data-label="Date">{formatDate(rebate.timestamp)}</td>
                      <td data-label="Amount">
                        {formatAmount(rebate.amount, tokenInfo.decimals, 4, true)} {tokenInfo.symbol}
                      </td>
                      <td data-label="Tx Hash">
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          href={explorerURL + `tx/${rebate.transactionHash}`}
                        >
                          {shortenAddress(rebate.transactionHash, 20)}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, data }) {
  return (
    <div className="info-card">
      <h3 className="label">
        {label}{" "}
        <Tooltip handle={<RiQuestionLine />} position="left-bottom" renderContent={() => "This is sample copy!"} />
      </h3>
      <div className="data">{data}</div>
    </div>
  );
}

function JoinReferrarCode({ isWalletConnected, chainId, library, connectWallet }) {
  let [referralCode, setReferralCode] = useState("");
  let [isSubmitting, setIsSubmitting] = useState(false);
  function handleSetTraderReferralCode(event, code) {
    event.preventDefault();
    setIsSubmitting(true);
    let referralCodeHex = utils.formatBytes32String(code);
    return setTraderReferralCodeByUser(chainId, referralCodeHex, {
      library,
      successMsg: `Referral code added!`,
      failMsg: "Adding referral code failed.",
    }).finally(() => {
      setIsSubmitting(false);
    });
  }
  return (
    <div className="referral-card section-center mt-large">
      <h2 className="title">Enter Affiliate code</h2>
      <p className="sub-title">Please input an affiliate code to start earning rebates.</p>
      <div className="card-action">
        {isWalletConnected ? (
          <form onSubmit={(e) => handleSetTraderReferralCode(e, referralCode)}>
            <input
              type="text"
              value={referralCode}
              disabled={isSubmitting}
              placeholder="Enter a code"
              onChange={(e) => {
                setReferralCode(e.target.value);
              }}
            />
            <button className="default-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting.." : "Submit"}
            </button>
          </form>
        ) : (
          <button className="default-btn" type="submit" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

function ReferralWrapper({ ...props }) {
  let { chainId } = useChainId();
  return chainId === ARBITRUM ? (
    <Referrals {...props} />
  ) : (
    <div style={{ width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <h3>Right now we support only Arbitrum Network!</h3>
    </div>
  );
}
export default ReferralWrapper;
