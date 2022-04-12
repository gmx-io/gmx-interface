import React, { useEffect, useState } from "react";
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
  bigNumberify,
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
const AFFiLIATES = "Affiliates";
let TAB_OPTIONS = [TRADERS, AFFiLIATES];

function getDollarValue(value) {
  return `$${formatAmount(value, USD_DECIMALS, 2, true, "0.00")}`;
}

function getErrorMessage(value) {
  let trimmedValue = value.trim();
  let invalid = /\s/;
  if (invalid.test(trimmedValue)) {
    return "The referral code can't contain spaces.";
  }
  return "";
}

function Referrals({ connectWallet, setPendingTxns, pendingTxns }) {
  const { active, account, library } = useWeb3React();
  const { chainId } = useChainId();
  const { infoTokens } = useInfoTokens(library, chainId, active, undefined, undefined);
  let [activeTab, setActiveTab] = useState(TRADERS);
  const referralsData = useReferralsData(chainId, account);
  const ReferralToken = getContract(chainId, "Referral");

  const [referralsDataState, setReferralsDataState] = useState(referralsData);
  useEffect(() => {
    setReferralsDataState(referralsData);
  }, [referralsData]);

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

  let isZero = (v) => !v || v === utils.formatBytes32String(0);

  let referralCodeInString;
  if (!isZero(userReferralCode)) {
    referralCodeInString = decodeReferralCode(userReferralCode);
  }

  function handleCreateReferralCode(event, code) {
    event.preventDefault();
    let referralCodeHex = utils.formatBytes32String(code);

    return registerReferralCode(chainId, referralCodeHex, {
      library,
      successMsg: `Referral code created!`,
      failMsg: "Referral code creation failed.",
      setPendingTxns,
      pendingTxns,
    });
  }

  function renderBody() {
    if (activeTab === AFFiLIATES) {
      if (!account) {
        return (
          <CreateReferrarCode
            isWalletConnected={!!account}
            handleCreateReferralCode={handleCreateReferralCode}
            library={library}
            chainId={chainId}
            connectWallet={connectWallet}
            setPendingTxns={setPendingTxns}
            pendingTxns={pendingTxns}
          />
        );
      }
      if (!referralsDataState) return <Loader />;
      if (referralsDataState?.codes?.length > 0) {
        return (
          <ReferrersStats
            infoTokens={infoTokens}
            handleCreateReferralCode={handleCreateReferralCode}
            referralsDataState={referralsDataState}
            chainId={chainId}
            library={library}
            setPendingTxns={setPendingTxns}
            pendingTxns={pendingTxns}
          />
        );
      } else {
        return (
          <CreateReferrarCode
            isWalletConnected={!!account}
            handleCreateReferralCode={handleCreateReferralCode}
            library={library}
            chainId={chainId}
            setPendingTxns={setPendingTxns}
            pendingTxns={pendingTxns}
            referralsDataState={referralsDataState}
            setReferralsDataState={setReferralsDataState}
          />
        );
      }
    }
    if (activeTab === TRADERS) {
      if (!referralsDataState) return <Loader />;
      if (!referralCodeInString) {
        return (
          <JoinReferrarCode
            connectWallet={connectWallet}
            isWalletConnected={!!account}
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

function CreateReferrarCode({
  handleCreateReferralCode,
  isWalletConnected,
  connectWallet,
  setReferralsDataState,
  referralsDataState,
}) {
  let [referralCode, setReferralCode] = useState("");
  let [isProcessing, setIsProcessing] = useState(false);
  let [error, setError] = useState("");
  function handleSubmit(e) {
    setIsProcessing(true);
    handleCreateReferralCode(e, referralCode)
      .then((res) => {
        setReferralsDataState((state) => {
          let referralCodeString = decodeReferralCode(res.data);
          return {
            ...state,
            codes: state.codes.concat(referralCodeString),
            referrerTotalStats: state.referrerTotalStats.concat(getSampleReferrarStat(referralCodeString)),
          };
        });
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

function ReferrersStats({ referralsDataState, infoTokens, chainId, library, setPendingTxns, pendingTxns }) {
  let [referralCode, setReferralCode] = useState("");
  let [isAdding, setIsAdding] = useState(false);
  let [isAddReferralCodeOpen, setIsAddReferralCodeOpen] = useState(false);
  let [error, setError] = useState("");
  const [, copyToClipboard] = useCopyToClipboard();
  let open = () => setIsAddReferralCodeOpen(true);
  let close = () => {
    setReferralCode("");
    setIsAdding(false);
    setError(false);
    setIsAddReferralCodeOpen(false);
  };

  function handleCreateReferralCode(event) {
    event.preventDefault();
    if (error) return;
    let referralCodeHex = utils.formatBytes32String(referralCode);
    setIsAdding(true);
    return registerReferralCode(chainId, referralCodeHex, {
      library,
      successMsg: `Referral code created!`,
      failMsg: "Referral code creation failed.",
      setPendingTxns,
      pendingTxns,
    })
      .then(() => {
        setReferralCode("");
      })
      .finally(() => {
        setIsAdding(false);
        close();
      });
  }

  let { cumulativeStats, referrerTotalStats, discountDistributions } = referralsDataState;

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
              <form onSubmit={handleCreateReferralCode}>
                <input
                  disabled={isAdding}
                  type="text"
                  placeholder="Enter new referral code"
                  className={`text-input ${!error && "mb-sm"}`}
                  value={referralCode}
                  onChange={(e) => {
                    let { value } = e.target;
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

function Rebates({
  referralsDataState,
  infoTokens,
  chainId,
  library,
  referralCodeInString,
  setPendingTxns,
  pendingTxns,
}) {
  let { referralTotalStats, rebateDistributions } = referralsDataState;
  let [isEditModalOpen, setIsEditModalOpen] = useState(false);
  let [editReferralCode, setEditReferralCode] = useState("");
  let [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  let [error, setError] = useState("");
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
                className={`text-input ${!error && "mb-sm"}`}
                value={editReferralCode}
                onChange={({ target }) => {
                  let { value } = target;
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

function JoinReferrarCode({ isWalletConnected, chainId, library, connectWallet, setPendingTxns, pendingTxns }) {
  let [referralCode, setReferralCode] = useState("");
  let [isSubmitting, setIsSubmitting] = useState(false);
  let [isJoined, setIsJoined] = useState(false);
  let [error, setError] = useState("");
  function handleSetTraderReferralCode(event, code) {
    event.preventDefault();
    setIsSubmitting(true);
    let referralCodeHex = utils.formatBytes32String(code);
    return setTraderReferralCodeByUser(chainId, referralCodeHex, {
      library,
      successMsg: `Referral code added!`,
      failMsg: "Adding referral code failed.",
      setPendingTxns,
      pendingTxns,
    })
      .then(() => {
        // mutateUserReferralCode
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
      <h2 className="title">Enter Affiliate Code</h2>
      <p className="sub-title">Please input an affiliate code to start earning rebates.</p>
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
