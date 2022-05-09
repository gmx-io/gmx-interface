import { useEffect, useRef, useState } from "react";
import { BiEditAlt } from "react-icons/bi";
import cx from "classnames";
import Card from "../../components/Common/Card";
import Modal from "../../components/Modal/Modal";
import Tooltip from "../../components/Tooltip/Tooltip";
import { getNativeToken, getToken } from "../../data/Tokens";
import { formatAmount, formatDate, getExplorerUrl, shortenAddress, useDebounce } from "../../Helpers";
import EmptyMessage from "./EmptyMessage";
import InfoCard from "./InfoCard";
import { CODE_REGEX, getCodeError, getTierIdDisplay, getUSDValue, tierDiscountInfo } from "./ReferralsHelper";
import { encodeReferralCode, setTraderReferralCodeByUser, validateReferralCodeExists } from "../../Api/referrals";
import { JoinReferralCodeForm } from "./JoinReferralCode";

function TradersStats({
  account,
  referralsData,
  traderTier,
  chainId,
  library,
  userReferralCodeString,
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
    return setTraderReferralCodeByUser(chainId, referralCodeHex, library, {
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
    if (editReferralCode === userReferralCodeString) {
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
      editReferralCode === userReferralCodeString
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
                <span>{userReferralCodeString}</span>
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
            <JoinReferralCodeForm
              userReferralCodeString={userReferralCodeString}
              setPendingTxns={setPendingTxns}
              pendingTxns={pendingTxns}
              type="edit"
              afterSuccess={() => setIsEditModalOpen(false)}
            />
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
                          {formatAmount(rebate.amount, tokenInfo.decimals, 6, true)} {tokenInfo.symbol}
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

export default TradersStats;
