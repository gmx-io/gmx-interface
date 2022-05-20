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
  getExplorerUrl,
  shortenAddress,
  bigNumberify,
  REFERRAL_CODE_QUERY_PARAMS,
  MAX_REFERRAL_CODE_LENGTH,
  isHashZero,
  REFERRALS_SELECTED_TAB_KEY,
  REFERRAL_CODE_KEY,
  useLocalStorageSerializeKey,
  ARBITRUM,
  AVALANCHE,
  useDebounce,
  isAddressZero,
} from "../../Helpers";
import { decodeReferralCode, encodeReferralCode, useReferralsData } from "../../Api/referrals";

import "./Referrals.css";
import {
  getReferralCodeOwner,
  registerReferralCode,
  setTraderReferralCodeByUser,
  useCodeOwner,
  useReferrerTier,
  useUserReferralCode,
} from "../../Api";
import { BiCopy, BiEditAlt, BiErrorCircle } from "react-icons/bi";
import { IoWarningOutline } from "react-icons/io5";
import Tooltip from "../../components/Tooltip/Tooltip";
import { useCopyToClipboard, useLocalStorage } from "react-use";
import Loader from "../../components/Common/Loader";
import Modal from "../../components/Modal/Modal";
import { FiPlus } from "react-icons/fi";
import { getToken, getNativeToken } from "../../data/Tokens";
import Checkbox from "../../components/Checkbox/Checkbox";

const REFERRAL_DATA_MAX_TIME = 60000 * 5; // 5 minutes
const TRADERS = "Traders";
const AFFILIATES = "Affiliates";
const TAB_OPTIONS = [TRADERS, AFFILIATES];
const CODE_REGEX = /^\w+$/; // only number, string and underscore is allowed

function isRecentReferralCodeNotExpired(referralCodeInfo) {
  if (referralCodeInfo.time) {
    return referralCodeInfo.time + REFERRAL_DATA_MAX_TIME > Date.now();
  }
}

async function validateReferralCodeExists(referralCode, chainId) {
  const referralCodeBytes32 = encodeReferralCode(referralCode);
  const referralCodeOwner = await getReferralCodeOwner(chainId, referralCodeBytes32);
  return !isAddressZero(referralCodeOwner);
}

async function getReferralCodeTakenStatus(account, referralCode, chainId) {
  const referralCodeBytes32 = encodeReferralCode(referralCode);
  const [ownerArbitrum, ownerAvax] = await Promise.all([
    getReferralCodeOwner(ARBITRUM, referralCodeBytes32),
    getReferralCodeOwner(AVALANCHE, referralCodeBytes32),
  ]);

  const takenOnArb =
    !isAddressZero(ownerArbitrum) && (ownerArbitrum !== account || (ownerArbitrum === account && chainId === ARBITRUM));
  const takenOnAvax =
    !isAddressZero(ownerAvax) && (ownerAvax !== account || (ownerAvax === account && chainId === AVALANCHE));

  const referralCodeTakenInfo = {
    [ARBITRUM]: takenOnArb,
    [AVALANCHE]: takenOnAvax,
    both: takenOnArb && takenOnAvax,
    ownerArbitrum,
    ownerAvax,
  };

  if (referralCodeTakenInfo.both) {
    return { status: "all", info: referralCodeTakenInfo };
  }
  if (referralCodeTakenInfo[chainId]) {
    return { status: "current", info: referralCodeTakenInfo };
  }
  if (chainId === AVALANCHE ? referralCodeTakenInfo[ARBITRUM] : referralCodeTakenInfo[AVALANCHE]) {
    return { status: "other", info: referralCodeTakenInfo };
  }
  return { status: "none", info: referralCodeTakenInfo };
}

function getTierIdDisplay(tierId) {
  if (!tierId) {
    return "";
  }
  return Number(tierId) + 1;
}

const tierRebateInfo = {
  0: 5,
  1: 10,
  2: 15,
};

const tierDiscountInfo = {
  0: 5,
  1: 10,
  2: 10,
};

const getSampleReferrarStat = (code, ownerOnOtherNetwork, account) => {
  return {
    discountUsd: bigNumberify(0),
    referralCode: code,
    totalRebateUsd: bigNumberify(0),
    tradedReferralsCount: 0,
    registeredReferralsCount: 0,
    trades: 0,
    volume: bigNumberify(0),
    time: Date.now(),
    ownerOnOtherChain: {
      code: encodeReferralCode(code),
      codeString: code,
      owner: undefined,
      isTaken: !isAddressZero(ownerOnOtherNetwork),
      isTakenByCurrentUser:
        !isAddressZero(ownerOnOtherNetwork) && ownerOnOtherNetwork.toLowerCase() === account.toLowerCase(),
    },
  };
};

function getUSDValue(value) {
  return `$${formatAmount(value, USD_DECIMALS, 2, true, "0.00")}`;
}

function getCodeError(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  if (trimmedValue.length > MAX_REFERRAL_CODE_LENGTH) {
    return `The referral code can't be more than ${MAX_REFERRAL_CODE_LENGTH} characters.`;
  }

  if (!CODE_REGEX.test(trimmedValue)) {
    return "Only letters, numbers and underscores are allowed.";
  }
  return "";
}

function Referrals({ connectWallet, setPendingTxns, pendingTxns }) {
  const { active, account, library, chainId: chainIdWithoutLocalStorage } = useWeb3React();
  const { chainId } = useChainId();
  const [activeTab, setActiveTab] = useLocalStorage(REFERRALS_SELECTED_TAB_KEY, TRADERS);
  const { data: referralsData, loading } = useReferralsData(chainIdWithoutLocalStorage, account);
  const [recentlyAddedCodes, setRecentlyAddedCodes] = useLocalStorageSerializeKey([chainId, "REFERRAL", account], []);
  const { userReferralCode } = useUserReferralCode(library, chainId, account);
  const { codeOwner } = useCodeOwner(library, chainId, account, userReferralCode);
  const { referrerTier: traderTier } = useReferrerTier(library, chainId, codeOwner);
  const userReferralCodeInLocalStorage = window.localStorage.getItem(REFERRAL_CODE_KEY);

  let referralCodeInString;
  if (userReferralCode && !isHashZero(userReferralCode)) {
    referralCodeInString = decodeReferralCode(userReferralCode);
  }

  if (!referralCodeInString && userReferralCodeInLocalStorage && !isHashZero(userReferralCodeInLocalStorage)) {
    referralCodeInString = decodeReferralCode(userReferralCodeInLocalStorage);
  }

  function handleCreateReferralCode(code) {
    const referralCodeHex = encodeReferralCode(code);
    return registerReferralCode(chainId, referralCodeHex, {
      library,
      sentMsg: "Referral code submitted!",
      failMsg: "Referral code creation failed.",
      pendingTxns,
    });
  }

  function renderAffiliatesTab() {
    if (!account)
      return (
        <CreateReferralCode
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
    if (loading) return <Loader />;
    if (referralsData.codes?.length > 0 || recentlyAddedCodes.filter(isRecentReferralCodeNotExpired).length > 0) {
      return (
        <AffiliatesInfo
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
        <CreateReferralCode
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
    if (!account)
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
    if (!referralsData) return <Loader />;
    if (!referralCodeInString) {
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

    return (
      <TradersInfo
        account={account}
        referralCodeInString={referralCodeInString}
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

function CreateReferralCode({
  account,
  handleCreateReferralCode,
  isWalletConnected,
  connectWallet,
  setRecentlyAddedCodes,
  recentlyAddedCodes,
  chainId,
}) {
  const [referralCode, setReferralCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmCreateReferralCode, setConfirmCreateReferralCode] = useState(false);
  const [error, setError] = useState("");
  const [isChecked, setIsChecked] = useState(false);

  const [referralCodeCheckStatus, setReferralCodeCheckStatus] = useState("ok");
  const debouncedReferralCode = useDebounce(referralCode, 300);

  useEffect(() => {
    let cancelled = false;
    const checkCodeTakenStatus = async () => {
      if (error || error.length > 0) {
        setReferralCodeCheckStatus("ok");
        return;
      }
      const { status: takenStatus } = await getReferralCodeTakenStatus(account, debouncedReferralCode, chainId);
      // ignore the result if the referral code to check has changed
      if (cancelled) {
        return;
      }
      if (takenStatus === "none") {
        setReferralCodeCheckStatus("ok");
      } else {
        setReferralCodeCheckStatus("taken");
      }
    };
    setReferralCodeCheckStatus("checking");
    checkCodeTakenStatus();
    return () => {
      cancelled = true;
    };
  }, [account, debouncedReferralCode, error, chainId]);

  function getButtonError() {
    if (!referralCode || referralCode.length === 0) {
      return "Enter a code";
    }
    if (referralCodeCheckStatus === "taken") {
      return "Code already taken";
    }
    if (referralCodeCheckStatus === "checking") {
      return "Checking code...";
    }

    return false;
  }

  const buttonError = getButtonError();

  function getPrimaryText() {
    if (buttonError) {
      return buttonError;
    }

    if (isProcessing) {
      return `Creating...`;
    }

    return "Create";
  }
  function isPrimaryEnabled() {
    if (buttonError) {
      return false;
    }
    if (isChecked) {
      return true;
    }
    if (error || isProcessing) {
      return false;
    }
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsProcessing(true);
    const { status: takenStatus, info: takenInfo } = await getReferralCodeTakenStatus(account, referralCode, chainId);
    if (takenStatus === "all" || takenStatus === "current") {
      setError(`Referral code is taken.`);
      setIsProcessing(false);
    }
    if (takenStatus === "other") {
      setError(`Referral code is taken on ${chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}`);
      setConfirmCreateReferralCode(true);
      setIsProcessing(false);
    }

    if (takenStatus === "none" || (takenStatus === "other" && isChecked)) {
      const ownerOnOtherNetwork = takenInfo[chainId === ARBITRUM ? "ownerAvax" : "ownerArbitrum"];
      setIsProcessing(true);
      try {
        const tx = await handleCreateReferralCode(referralCode);
        const receipt = await tx.wait();
        if (receipt.status === 1) {
          recentlyAddedCodes.push(getSampleReferrarStat(referralCode, ownerOnOtherNetwork, account));
          helperToast.success("Referral code created!");
          setRecentlyAddedCodes(recentlyAddedCodes);
          setReferralCode("");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }
  }

  return (
    <div className="referral-card section-center mt-medium">
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
                setError(getCodeError(value));
              }}
            />
            {error && (
              <p className="error" style={{ textAlign: "left" }}>
                {error}
              </p>
            )}
            {confirmCreateReferralCode && (
              <div className="confirm-checkbox">
                <Checkbox isChecked={isChecked} setIsChecked={setIsChecked}>
                  Confirm creating referral code
                </Checkbox>
              </div>
            )}
            <button className="App-cta Exchange-swap-button" type="submit" disabled={!isPrimaryEnabled()}>
              {getPrimaryText()}
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

function AffiliatesInfo({
  account,
  referralsData,
  handleCreateReferralCode,
  chainId,
  setRecentlyAddedCodes,
  recentlyAddedCodes,
}) {
  const [referralCode, setReferralCode] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const [confirmCreateReferralCode, setConfirmCreateReferralCode] = useState(false);
  const [isAddReferralCodeModalOpen, setIsAddReferralCodeModalOpen] = useState(false);
  const [error, setError] = useState("");
  const addNewModalRef = useRef(null);

  const [referralCodeCheckStatus, setReferralCodeCheckStatus] = useState("ok");
  const debouncedReferralCode = useDebounce(referralCode, 300);

  useEffect(() => {
    let cancelled = false;
    const checkCodeTakenStatus = async () => {
      if (error || error.length > 0) {
        setReferralCodeCheckStatus("ok");
        return;
      }
      const { status: takenStatus } = await getReferralCodeTakenStatus(account, referralCode, chainId);

      // ignore the result if the referral code to check has changed
      if (cancelled) {
        return;
      }
      if (takenStatus === "none") {
        setReferralCodeCheckStatus("ok");
      } else {
        setReferralCodeCheckStatus("taken");
      }
    };
    setReferralCodeCheckStatus("checking");
    checkCodeTakenStatus();
    return () => {
      cancelled = true;
    };
  }, [account, debouncedReferralCode, error, chainId, referralCode]);

  function getButtonError() {
    if (!referralCode || referralCode.length === 0) {
      return "Enter a code";
    }
    if (referralCodeCheckStatus === "taken") {
      return "Code already taken";
    }
    if (referralCodeCheckStatus === "checking") {
      return "Checking code...";
    }

    return false;
  }

  const buttonError = getButtonError();

  function getPrimaryText() {
    if (buttonError) {
      return buttonError;
    }

    if (isAdding) {
      return `Creating...`;
    }

    return "Create";
  }
  function isPrimaryEnabled() {
    if (buttonError) {
      return false;
    }

    if (isChecked) {
      return true;
    }

    if (error || isAdding) {
      return false;
    }
    return true;
  }

  const [, copyToClipboard] = useCopyToClipboard();
  const open = () => setIsAddReferralCodeModalOpen(true);
  const close = () => {
    setReferralCode("");
    setIsAdding(false);
    setError("");
    setConfirmCreateReferralCode(false);
    setIsChecked(false);
    setIsAddReferralCodeModalOpen(false);
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setIsAdding(true);
    const { status: takenStatus, info: takenInfo } = await getReferralCodeTakenStatus(account, referralCode, chainId);

    if (takenStatus === "all" || takenStatus === "current") {
      setError(`Referral code is taken.`);
      setIsAdding(false);
    }
    if (takenStatus === "other") {
      setError(`Referral code is taken on ${chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}`);
      setConfirmCreateReferralCode(true);
      setIsAdding(false);
    }

    if (takenStatus === "none" || (takenStatus === "other" && isChecked)) {
      const ownerOnOtherNetwork = takenInfo[chainId === ARBITRUM ? "ownerAvax" : "ownerArbitrum"];
      setIsAdding(true);
      try {
        const tx = await handleCreateReferralCode(referralCode);
        close();
        const receipt = await tx.wait();
        if (receipt.status === 1) {
          recentlyAddedCodes.push(getSampleReferrarStat(referralCode, ownerOnOtherNetwork, account));
          helperToast.success("Referral code created!");
          setRecentlyAddedCodes(recentlyAddedCodes);
          setReferralCode("");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsAdding(false);
      }
    }
  }

  let { cumulativeStats, referrerTotalStats, rebateDistributions, referrerTierInfo } = referralsData;
  const finalReferrerTotalStats = recentlyAddedCodes.filter(isRecentReferralCodeNotExpired).reduce((acc, cv) => {
    const addedCodes = referrerTotalStats.map((c) => c.referralCode.trim());
    if (!addedCodes.includes(cv.referralCode)) {
      acc = acc.concat(cv);
    }
    return acc;
  }, referrerTotalStats);

  const tierId = referrerTierInfo?.tierId;
  let referrerRebates = bigNumberify(0);
  if (cumulativeStats && cumulativeStats.rebates && cumulativeStats.discountUsd) {
    referrerRebates = cumulativeStats.rebates.sub(cumulativeStats.discountUsd);
  }

  return (
    <div className="referral-body-container">
      <div className="referral-stats">
        <InfoCard
          label="Total Traders Referred"
          tooltipText="Amount of traders you referred."
          data={cumulativeStats?.registeredReferralsCount || "0"}
        />
        <InfoCard
          label="Total Trading Volume"
          tooltipText="Volume traded by your referred traders."
          data={getUSDValue(cumulativeStats?.volume)}
        />
        <InfoCard
          label="Total Rebates"
          tooltipText="Rebates earned by this account as an affiliate."
          data={getUSDValue(referrerRebates)}
        />
      </div>
      <div className="list">
        <Modal
          className="Connect-wallet-modal"
          isVisible={isAddReferralCodeModalOpen}
          setIsVisible={close}
          label="Create Referral Code"
          onAfterOpen={() => addNewModalRef.current?.focus()}
        >
          <div className="edit-referral-modal">
            <form onSubmit={handleSubmit}>
              <input
                disabled={isAdding}
                ref={addNewModalRef}
                type="text"
                placeholder="Enter referral code"
                className={`text-input ${!error && "mb-sm"}`}
                value={referralCode}
                onChange={(e) => {
                  const { value } = e.target;
                  setReferralCode(value);
                  setError(getCodeError(value));
                }}
              />
              {error && <p className="error">{error}</p>}
              {confirmCreateReferralCode && (
                <div className="confirm-checkbox">
                  <Checkbox isChecked={isChecked} setIsChecked={setIsChecked}>
                    Confirm creating referral code
                  </Checkbox>
                </div>
              )}
              <button type="submit" className="App-cta Exchange-swap-button" disabled={!isPrimaryEnabled()}>
                {getPrimaryText()}
              </button>
            </form>
          </div>
        </Modal>
        <Card
          title={
            <div className="referral-table-header">
              <p className="title">
                Referral Codes{" "}
                <span className="sub-title">
                  {referrerTierInfo && `Tier ${getTierIdDisplay(tierId)} (${tierRebateInfo[tierId]}% rebate)`}
                </span>
              </p>
              <button className="transparent-btn" onClick={open}>
                <FiPlus /> <span className="ml-small">Create</span>
              </button>
            </div>
          }
        >
          <div className="table-wrapper">
            <table className="referral-table">
              <thead>
                <tr>
                  <th className="table-head" scope="col">
                    Referral Code
                  </th>
                  <th className="table-head" scope="col">
                    Total Volume
                  </th>
                  <th className="table-head" scope="col">
                    Traders Referred
                  </th>
                  <th className="table-head" scope="col">
                    Total Rebates
                  </th>
                </tr>
              </thead>
              <tbody>
                {finalReferrerTotalStats.map((stat, index) => {
                  const ownerOnOtherChain = stat?.ownerOnOtherChain;
                  let referrerRebate = bigNumberify(0);
                  if (stat && stat.totalRebateUsd && stat.totalRebateUsd.sub && stat.discountUsd) {
                    referrerRebate = stat.totalRebateUsd.sub(stat.discountUsd);
                  }
                  return (
                    <tr key={index}>
                      <td data-label="Referral Code">
                        <div className="table-referral-code">
                          <div
                            onClick={() => {
                              copyToClipboard(`https://gmx.io?${REFERRAL_CODE_QUERY_PARAMS}=${stat.referralCode}`);
                              helperToast.success("Referral link copied to your clipboard");
                            }}
                            className="referral-code copy-icon"
                          >
                            <span>{stat.referralCode}</span>
                            <BiCopy />
                          </div>
                          {ownerOnOtherChain && !ownerOnOtherChain?.isTaken && (
                            <div className="info">
                              <Tooltip
                                position="right"
                                handle={<IoWarningOutline color="#ffba0e" size={16} />}
                                renderContent={() => (
                                  <div>
                                    This code is not yet registered on{" "}
                                    {chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}, you will not receive rebates
                                    there.
                                    <br />
                                    <br />
                                    Switch your network to create this code on{" "}
                                    {chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}.
                                  </div>
                                )}
                              />
                            </div>
                          )}
                          {ownerOnOtherChain && ownerOnOtherChain?.isTaken && !ownerOnOtherChain?.isTakenByCurrentUser && (
                            <div className="info">
                              <Tooltip
                                position="right"
                                handle={<BiErrorCircle color="#e82e56" size={16} />}
                                renderContent={() => (
                                  <div>
                                    This code has been taken by someone else on{" "}
                                    {chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}, you will not receive rebates
                                    from traders using this code on {chainId === AVALANCHE ? "Arbitrum" : "Avalanche"}.
                                  </div>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td data-label="Total Volume">{getUSDValue(stat.volume)}</td>
                      <td data-label="Traders Referred">{stat.registeredReferralsCount}</td>
                      <td data-label="Total Rebates">{getUSDValue(referrerRebate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      {rebateDistributions?.length > 0 ? (
        <div className="reward-history">
          <Card title="Rebates Distribution History" tooltipText="Rebates are airdropped weekly.">
            <div className="table-wrapper">
              <table className="referral-table">
                <thead>
                  <tr>
                    <th className="table-head" scope="col">
                      Date
                    </th>
                    <th className="table-head" scope="col">
                      Amount
                    </th>
                    <th className="table-head" scope="col">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rebateDistributions.map((rebate, index) => {
                    let tokenInfo;
                    try {
                      tokenInfo = getToken(chainId, rebate.token);
                    } catch {
                      tokenInfo = getNativeToken(chainId);
                    }
                    const explorerURL = getExplorerUrl(chainId);
                    return (
                      <tr key={index}>
                        <td className="table-head" data-label="Date">
                          {formatDate(rebate.timestamp)}
                        </td>
                        <td className="table-head" data-label="Amount">
                          {formatAmount(rebate.amount, tokenInfo.decimals, 4, true)} {tokenInfo.symbol}
                        </td>
                        <td className="table-head" data-label="Transaction">
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href={explorerURL + `tx/${rebate.transactionHash}`}
                          >
                            {shortenAddress(rebate.transactionHash, 13)}
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
      ) : (
        <EmptyMessage tooltipText="Rebates are airdropped weekly." message="No rebates distribution history yet." />
      )}
    </div>
  );
}

function TradersInfo({
  account,
  referralsData,
  traderTier,
  chainId,
  library,
  referralCodeInString,
  setPendingTxns,
  pendingTxns,
}) {
  const { referralTotalStats, discountDistributions } = referralsData;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [referralCodeExists, setReferralCodeExists] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [editReferralCode, setEditReferralCode] = useState("");
  const [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  const [error, setError] = useState("");
  const editModalRef = useRef(null);
  const debouncedEditReferralCode = useDebounce(editReferralCode, 300);

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
      account,
      successMsg: `Referral code updated!`,
      failMsg: "Referral code updated failed.",
      setPendingTxns,
      pendingTxns,
    })
      .then(() => {
        setIsEditModalOpen(false);
      })
      .finally(() => {
        setIsUpdateSubmitting(false);
      });
  }
  function getPrimaryText() {
    if (editReferralCode === referralCodeInString) {
      return "Referral Code is same";
    }
    if (isUpdateSubmitting) {
      return "Updating...";
    }
    if (debouncedEditReferralCode === "") {
      return "Enter Referral Code";
    }
    if (isValidating) {
      return `Checking code...`;
    }
    if (!referralCodeExists) {
      return `Referral Code does not exist`;
    }

    return "Update";
  }
  function isPrimaryEnabled() {
    if (
      debouncedEditReferralCode === "" ||
      isUpdateSubmitting ||
      isValidating ||
      !referralCodeExists ||
      editReferralCode === referralCodeInString
    ) {
      return false;
    }
    return true;
  }

  useEffect(() => {
    let cancelled = false;
    async function checkReferralCode() {
      if (debouncedEditReferralCode === "" || !CODE_REGEX.test(debouncedEditReferralCode)) {
        setIsValidating(false);
        setReferralCodeExists(false);
        return;
      }

      setIsValidating(true);
      const codeExists = await validateReferralCodeExists(debouncedEditReferralCode, chainId);
      if (!cancelled) {
        setReferralCodeExists(codeExists);
        setIsValidating(false);
      }
    }
    checkReferralCode();
    return () => {
      cancelled = true;
    };
  }, [debouncedEditReferralCode, chainId]);

  return (
    <div className="rebate-container">
      <div className="referral-stats">
        <InfoCard
          label="Total Trading Volume"
          tooltipText="Volume traded by this account with an active referral code."
          data={getUSDValue(referralTotalStats?.volume)}
        />
        <InfoCard
          label="Total Rebates"
          tooltipText="Rebates earned by this account as a trader."
          data={getUSDValue(referralTotalStats?.discountUsd)}
        />
        <InfoCard
          label="Active Referral Code"
          data={
            <div className="active-referral-code">
              <div className="edit">
                <span>{referralCodeInString}</span>
                <BiEditAlt onClick={open} />
              </div>
              {traderTier && (
                <div className="tier">
                  <Tooltip
                    handle={`Tier ${getTierIdDisplay(traderTier)} (${tierDiscountInfo[traderTier]}% discount)`}
                    position="right-bottom"
                    renderContent={() =>
                      `You will receive a ${tierDiscountInfo[traderTier]}% discount on your opening and closing fees, this discount will be airdropped to your account every Wednesday`
                    }
                  />
                </div>
              )}
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
                placeholder="Enter referral code"
                className={`text-input ${!error && "mb-sm"}`}
                value={editReferralCode}
                onChange={({ target }) => {
                  const { value } = target;
                  setEditReferralCode(value);
                  setError(getCodeError(value));
                }}
              />
              {error && <p className="error">{error}</p>}
              <button type="submit" className="App-cta Exchange-swap-button" disabled={!isPrimaryEnabled()}>
                {getPrimaryText()}
              </button>
            </form>
          </div>
        </Modal>
      </div>
      {discountDistributions.length > 0 ? (
        <div className="reward-history">
          <Card title="Rebates Distribution History" tooltipText="Rebates are airdropped weekly.">
            <div className="table-wrapper">
              <table className="referral-table">
                <thead>
                  <tr>
                    <th className="table-head" scope="col">
                      Date
                    </th>
                    <th className="table-head" scope="col">
                      Amount
                    </th>
                    <th className="table-head" scope="col">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {discountDistributions.map((rebate, index) => {
                    let tokenInfo;
                    try {
                      tokenInfo = getToken(chainId, rebate.token);
                    } catch {
                      tokenInfo = getNativeToken(chainId);
                    }
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
      ) : (
        <EmptyMessage message="No rebates distribution history yet." tooltipText="Rebates are airdropped weekly." />
      )}
    </div>
  );
}

function JoinReferralCode({
  isWalletConnected,
  account,
  chainId,
  library,
  connectWallet,
  setPendingTxns,
  pendingTxns,
}) {
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
      account,
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
    <div className="referral-card section-center mt-medium">
      <h2 className="title">Enter Referral Code</h2>
      <p className="sub-title">Please input a referral code to benefit from fee discounts.</p>
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
                setError(getCodeError(value));
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

function InfoCard({ label, data, tooltipText, toolTipPosition = "left-bottom" }) {
  return (
    <div className="info-card">
      <div className="card-details">
        <h3 className="label">
          {tooltipText ? (
            <Tooltip handle={label} position={toolTipPosition} renderContent={() => tooltipText} />
          ) : (
            label
          )}
        </h3>
        <div className="data">{data}</div>
      </div>
    </div>
  );
}

function EmptyMessage({ message = "", tooltipText }) {
  return (
    <div className="empty-message">
      {tooltipText ? (
        <Tooltip handle={<p>{message}</p>} position="center-bottom" renderContent={() => tooltipText} />
      ) : (
        <p>{message}</p>
      )}
    </div>
  );
}

export default Referrals;
