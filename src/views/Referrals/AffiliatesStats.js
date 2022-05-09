import { useEffect, useRef, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useCopyToClipboard } from "react-use";
import { IoWarningOutline } from "react-icons/io5";

import { BiCopy, BiErrorCircle } from "react-icons/bi";
import cx from "classnames";
import Card from "../../components/Common/Card";
import Modal from "../../components/Modal/Modal";
import Tooltip from "../../components/Tooltip/Tooltip";
import { getNativeToken, getToken } from "../../data/Tokens";
import {
  ARBITRUM,
  AVALANCHE,
  bigNumberify,
  formatAmount,
  formatDate,
  getExplorerUrl,
  helperToast,
  REFERRAL_CODE_QUERY_PARAM,
  shortenAddress,
  useDebounce,
} from "../../Helpers";
import EmptyMessage from "./EmptyMessage";
import InfoCard from "./InfoCard";
import {
  getCodeError,
  getReferralCodeTakenStatus,
  getSampleReferrarStat,
  getTierIdDisplay,
  getUSDValue,
  isRecentReferralCodeNotExpired,
  tierRebateInfo,
} from "./ReferralsHelper";

import Checkbox from "../../components/Checkbox/Checkbox";

function AffiliatesStats({
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

  const { cumulativeStats, referrerTotalStats, rebateDistributions, referrerTierInfo } = referralsData;
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
                className={cx("text-input", { "mb-sm": !error })}
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
                              copyToClipboard(`https://gmx.io?${REFERRAL_CODE_QUERY_PARAM}=${stat.referralCode}`);
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
                          {formatAmount(rebate.amount, tokenInfo.decimals, 6, true)} {tokenInfo.symbol}
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

export default AffiliatesStats;
