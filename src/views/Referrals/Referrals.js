import React, { useEffect, useRef, useState } from "react";
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
  bigNumberify,
  REFERRAL_CODE_QUERY_PARAMS,
  isHashZero,
  REFERRAL_CODE_KEY,
  REFERRALS_DATA_KEY,
  useLocalStorageSerializeKey,
} from "../../Helpers";
import { decodeReferralCode, encodeReferralCode, useReferralsData } from "../../Api/referrals";

import "./Referrals.css";
import { registerReferralCode, setTraderReferralCodeByUser, useInfoTokens, useUserReferralCode } from "../../Api";
import { BiCopy, BiEditAlt } from "react-icons/bi";
import Tooltip from "../../components/Tooltip/Tooltip";
import { useCopyToClipboard, useLocalStorage } from "react-use";
import Loader from "../../components/Common/Loader";
import Modal from "../../components/Modal/Modal";
import { RiQuestionLine } from "react-icons/ri";
import { FiPlus } from "react-icons/fi";

// TODO: remove in prod
// function fakePrmise(code) {
//   const referralCodeHex = encodeReferralCode(code);
//   return new Promise((res, rej) => {
//     setTimeout(() => res({ data: referralCodeHex }), 3000);
//   });
// }

const getSampleReferrarStat = (code) => {
  return {
    discountUsd: bigNumberify(0),
    referralCode: code,
    totalRebateUsd: bigNumberify(0),
    tradedReferralsCount: 0,
    trades: 0,
    volume: bigNumberify(0),
  };
};

const TRADERS = "Traders";
const AFFILIATES = "Affiliates";
let TAB_OPTIONS = [TRADERS, AFFILIATES];

function getUSDValue(value) {
  return `$${formatAmount(value, USD_DECIMALS, 2, true, "0.00")}`;
}

function getErrorMessage(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  const regexForSpace = /\s/;
  if (regexForSpace.test(trimmedValue)) {
    return "The referral code can't contain spaces.";
  }

  if (trimmedValue.length > 20) {
    return "The referral code can't be more than 20 characters.";
  }

  const regexForValidString = /^\w+$/; // only number, string and underscore is allowed
  if (!regexForValidString.test(trimmedValue)) {
    return "The referral code contains invalid character.";
  }
  return "";
}

function Referrals({ connectWallet, setPendingTxns, pendingTxns }) {
  const { active, account, library, chainId: chainIdWithoutLocalStorage } = useWeb3React();
  const { chainId } = useChainId();
  const { infoTokens } = useInfoTokens(library, chainId, active);
  const [activeTab, setActiveTab] = useLocalStorage(REFERRAL_CODE_KEY, TRADERS);
  const { data: referralsData, loading } = useReferralsData(chainIdWithoutLocalStorage, account);
  const [referralsDataState, setReferralsDataState] = useLocalStorageSerializeKey([
    chainId,
    REFERRALS_DATA_KEY,
    account,
  ]);
  const { userReferralCode } = useUserReferralCode(library, chainId, account);
  useEffect(() => {
    if (!referralsDataState) {
      setReferralsDataState(referralsData);
    }
  }, [referralsData, referralsDataState, setReferralsDataState]);

  let referralCodeInString;
  if (userReferralCode && !isHashZero(userReferralCode)) {
    referralCodeInString = decodeReferralCode(userReferralCode);
  }

  function handleCreateReferralCode(code) {
    const referralCodeHex = encodeReferralCode(code);
    return registerReferralCode(chainId, referralCodeHex, {
      library,
      successMsg: `Referral code created!`,
      failMsg: "Referral code creation failed.",
      setPendingTxns,
      pendingTxns,
    });
  }

  function renderAffiliatesTab() {
    if (!account || !referralsDataState)
      return (
        <CreateReferrarCode
          isWalletConnected={active}
          handleCreateReferralCode={handleCreateReferralCode}
          library={library}
          chainId={chainId}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
          referralsDataState={referralsDataState}
          setReferralsDataState={setReferralsDataState}
          connectWallet={connectWallet}
        />
      );
    if (loading) return <Loader />;
    if (referralsDataState.codes?.length > 0) {
      return (
        <ReferrersStats
          infoTokens={infoTokens}
          referralsDataState={referralsDataState}
          setReferralsDataState={setReferralsDataState}
          handleCreateReferralCode={handleCreateReferralCode}
          chainId={chainId}
          library={library}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
        />
      );
    } else {
      return (
        <CreateReferrarCode
          isWalletConnected={active}
          handleCreateReferralCode={handleCreateReferralCode}
          library={library}
          chainId={chainId}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
          referralsDataState={referralsDataState}
          setReferralsDataState={setReferralsDataState}
          connectWallet={connectWallet}
        />
      );
    }
  }

  function renderTradersTab() {
    if (!account)
      return (
        <JoinReferrarCode
          connectWallet={connectWallet}
          isWalletConnected={active}
          library={library}
          chainId={chainId}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
        />
      );
    if (!referralsDataState) return <Loader />;
    if (!referralCodeInString) {
      return (
        <JoinReferrarCode
          connectWallet={connectWallet}
          isWalletConnected={active}
          library={library}
          chainId={chainId}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
        />
      );
    }

    return (
      <Rebates
        referralCodeInString={referralCodeInString}
        infoTokens={infoTokens}
        chainId={chainId}
        library={library}
        referralsDataState={referralsDataState}
        setPendingTxns={setPendingTxns}
        pendingTxns={pendingTxns}
      />
    );
  }

  return (
    <SEO title={getPageTitle("Referrals")}>
      <div className="default-container page-layout">
        <div className="referral-tab-container">
          <Tab options={TAB_OPTIONS} option={activeTab} setOption={setActiveTab} onChange={setActiveTab} />
        </div>
        {activeTab === AFFILIATES ? renderAffiliatesTab() : renderTradersTab()}
      </div>
      <Footer />
    </SEO>
  );
}

function CreateReferrarCode({
  handleCreateReferralCode,
  referralsDataState,
  isWalletConnected,
  connectWallet,
  setReferralsDataState,
}) {
  const [referralCode, setReferralCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setIsProcessing(true);
    handleCreateReferralCode(referralCode)
      .then(() => {
        referralsDataState.codes.push(referralCode);
        referralsDataState.referrerTotalStats.push(getSampleReferrarStat(referralCode));
        setReferralsDataState(referralsDataState);
        setReferralCode("");
      })
      .catch(({ data }) => {
        if (data?.message) {
          const isAlreadyExistError = data.message.includes("code already exists");
          if (isAlreadyExistError) setError("Referral code is already taken.");
        }
      })
      .finally(() => setIsProcessing(false));
  }

  return (
    <div className="referral-card section-center mt-large">
      <h2 className="title">Generate Referral Code</h2>
      <p className="sub-title">
        Looks like you don't have a referral code to share. <br /> Create one now and start earning rebates!
      </p>
      <div className="card-action">
        {isWalletConnected ? (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={referralCode}
              disabled={isProcessing}
              className={`text-input ${!error && "mb-sm"}`}
              placeholder="Enter a code"
              onChange={({ target }) => {
                let { value } = target;
                setReferralCode(value);
                setError(getErrorMessage(value));
              }}
            />
            {error && (
              <p className="error" style={{ textAlign: "left" }}>
                {error}
              </p>
            )}
            <button
              className="App-cta Exchange-swap-button"
              type="submit"
              disabled={!referralCode.trim() || isProcessing}
            >
              {isProcessing ? "Creating..." : "Create"}
            </button>
          </form>
        ) : (
          <button className="App-cta Exchange-swap-button" type="submit" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

function ReferrersStats({ referralsDataState, handleCreateReferralCode, setReferralsDataState, infoTokens, chainId }) {
  const [referralCode, setReferralCode] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isAddReferralCodeModalOpen, setIsAddReferralCodeModalOpen] = useState(false);
  const [error, setError] = useState("");
  const addNewModalRef = useRef(null);

  const [, copyToClipboard] = useCopyToClipboard();
  const open = () => setIsAddReferralCodeModalOpen(true);
  const close = () => {
    setReferralCode("");
    setIsAdding(false);
    setError("");
    setIsAddReferralCodeModalOpen(false);
  };

  function handleSubmit(event) {
    event.preventDefault();
    if (error) return;
    setIsAdding(true);
    handleCreateReferralCode(referralCode)
      .then(() => {
        referralsDataState.codes.push(referralCode);
        referralsDataState.referrerTotalStats.push(getSampleReferrarStat(referralCode));
        setReferralsDataState(referralsDataState);
        setReferralCode("");
        close();
      })
      .catch(({ data }) => {
        if (data?.message) {
          const isAlreadyExistError = data.message.includes("code already exists");
          if (isAlreadyExistError) setError("Referral code is already taken.");
        }
      })
      .finally(() => {
        setIsAdding(false);
      });
  }

  const { cumulativeStats, referrerTotalStats, discountDistributions } = referralsDataState;

  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        <InfoCard
          label="Total Traders Referred"
          tooltipText="Amount of traders you referred."
          data={cumulativeStats?.referralsCount || "0"}
        />
        <InfoCard
          label="Total Trading Volume"
          tooltipText="Volume traded by your referred traders."
          data={getUSDValue(cumulativeStats?.volume)}
        />
        <InfoCard
          label="Total Rebates"
          tooltipText="Rebates earned by this account as an affiliate."
          data={getUSDValue(cumulativeStats?.rebates)}
        />
        <InfoCard
          label="Total Rebates For Traders"
          tooltipText="Rebates earned by your referred traders."
          data={getUSDValue(cumulativeStats?.discountUsd)}
        />
      </div>
      <div className="list">
        <Modal
          className="Connect-wallet-modal"
          isVisible={isAddReferralCodeModalOpen}
          setIsVisible={close}
          label="Create New Referral Code"
          onAfterOpen={() => addNewModalRef.current?.focus()}
        >
          <div className="edit-referral-modal">
            <form onSubmit={handleSubmit}>
              <input
                disabled={isAdding}
                ref={addNewModalRef}
                type="text"
                placeholder="Enter new referral code"
                className={`text-input ${!error && "mb-sm"}`}
                value={referralCode}
                onChange={(e) => {
                  const { value } = e.target;
                  setReferralCode(value);
                  setError(getErrorMessage(value));
                }}
              />
              {error && <p className="error">{error}</p>}
              <button type="submit" className="App-cta Exchange-swap-button" disabled={error || isAdding}>
                {isAdding ? "Adding..." : "Add New Referral Code"}
              </button>
            </form>
          </div>
        </Modal>
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
          <div className="table-wrapper">
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
                              copyToClipboard(
                                `https://gmx.io/trade?${REFERRAL_CODE_QUERY_PARAMS}=${stat.referralCode}`
                              );
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
                      <td data-label="Total Volume">{getUSDValue(stat.volume)}</td>
                      <td data-label="Total Rebate">{getUSDValue(stat.totalRebateUsd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      {discountDistributions?.length > 0 && (
        <div className="reward-history">
          <Card title="Rebates Distribution History">
            <div className="table-wrapper">
              <table className="referral-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {discountDistributions
                    .concat(discountDistributions.concat(discountDistributions))
                    .map((rebate, index) => {
                      const tokenInfo = getTokenInfo(infoTokens, rebate.token);
                      const explorerURL = getExplorerUrl(chainId);
                      return (
                        <tr key={index}>
                          <td data-label="Date">{formatDate(rebate.timestamp)}</td>
                          <td data-label="Amount">
                            {formatAmount(rebate.amount, tokenInfo.decimals, 4, true)} {tokenInfo.symbol}
                          </td>
                          <td data-label="Transaction">
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
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Rebates({
  referralsDataState,
  infoTokens,
  chainId,
  library,
  referralCodeInString,
  setPendingTxns,
  pendingTxns,
}) {
  const { referralTotalStats, rebateDistributions } = referralsDataState;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editReferralCode, setEditReferralCode] = useState("");
  const [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  const [error, setError] = useState("");
  const editModalRef = useRef(null);

  const open = () => setIsEditModalOpen(true);
  const close = () => {
    setEditReferralCode("");
    setIsUpdateSubmitting(false);
    setError("");
    setIsEditModalOpen(false);
  };
  function handleUpdateReferralCode(event) {
    event.preventDefault();
    setIsUpdateSubmitting(true);
    const referralCodeHex = encodeReferralCode(editReferralCode);
    return setTraderReferralCodeByUser(chainId, referralCodeHex, {
      library,
      successMsg: `Referral code updated!`,
      failMsg: "Referral code updated failed.",
      setPendingTxns,
      pendingTxns,
    }).finally(() => {
      setIsUpdateSubmitting(false);
      setIsEditModalOpen(false);
    });
  }

  return (
    <div className="rebate-container">
      <div className="referral-stats">
        <InfoCard
          label="Total Volume Traded"
          tooltipText="Volume traded by this account."
          data={getUSDValue(referralTotalStats?.volume)}
        />
        <InfoCard
          label="Total Rebate"
          tooltipText="Rebates earned by this account as an affiliate."
          data={getUSDValue(referralTotalStats?.discountUsd)}
        />
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
          onAfterOpen={() => editModalRef.current?.focus()}
        >
          <div className="edit-referral-modal">
            <form onSubmit={handleUpdateReferralCode}>
              <input
                ref={editModalRef}
                disabled={isUpdateSubmitting}
                type="text"
                placeholder="Enter new referral code"
                className={`text-input ${!error && "mb-sm"}`}
                value={editReferralCode}
                onChange={({ target }) => {
                  const { value } = target;
                  setEditReferralCode(value);
                  setError(getErrorMessage(value));
                }}
              />
              {error && <p className="error">{error}</p>}
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
                  const tokenInfo = getTokenInfo(infoTokens, rebate.token);
                  const explorerURL = getExplorerUrl(chainId);
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

function JoinReferrarCode({ isWalletConnected, chainId, library, connectWallet, setPendingTxns, pendingTxns }) {
  const [referralCode, setReferralCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState("");
  function handleSetTraderReferralCode(event, code) {
    event.preventDefault();
    setIsSubmitting(true);
    const referralCodeHex = encodeReferralCode(code);
    return setTraderReferralCodeByUser(chainId, referralCodeHex, {
      library,
      successMsg: `Referral code added!`,
      failMsg: "Adding referral code failed.",
      setPendingTxns,
      pendingTxns,
    })
      .then((res) => {
        setIsJoined(true);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }
  //
  if (isJoined) return <Loader />;
  return (
    <div className="referral-card section-center mt-large">
      <h2 className="title">Enter Referral Code</h2>
      <p className="sub-title">Please input a referral code to start earning rebates.</p>
      <div className="card-action">
        {isWalletConnected ? (
          <form onSubmit={(e) => handleSetTraderReferralCode(e, referralCode)}>
            <input
              type="text"
              value={referralCode}
              disabled={isSubmitting}
              className={`text-input ${!error && "mb-sm"}`}
              placeholder="Enter a code"
              onChange={({ target }) => {
                let { value } = target;
                setReferralCode(value);
                setError(getErrorMessage(value));
              }}
            />
            {error && (
              <p className="error" style={{ textAlign: "left" }}>
                {error}
              </p>
            )}
            <button
              className="App-cta Exchange-swap-button"
              type="submit"
              disabled={!referralCode.trim() || isSubmitting}
            >
              {isSubmitting ? "Submitting.." : "Submit"}
            </button>
          </form>
        ) : (
          <button className="App-cta Exchange-swap-button" type="submit" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, data, tooltipText, toolTipPosition = "right-bottom" }) {
  return (
    <div className="info-card">
      <h3 className="label">
        {label}{" "}
        {tooltipText && (
          <Tooltip handle={<RiQuestionLine />} position={toolTipPosition} renderContent={() => tooltipText} />
        )}
      </h3>
      <div className="data">{data}</div>
    </div>
  );
}

export default Referrals;
