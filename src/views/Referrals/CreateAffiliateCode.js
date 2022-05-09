import { useEffect, useState } from "react";
import cx from "classnames";
import { ARBITRUM, AVALANCHE, helperToast, useDebounce } from "../../Helpers";
import { getCodeError, getReferralCodeTakenStatus, getSampleReferrarStat } from "./ReferralsHelper";
import Checkbox from "../../components/Checkbox/Checkbox";

function CreateAffiliateCode({
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
              className={cx("text-input", { "mb-sm": !error })}
              placeholder="Enter a code"
              onChange={({ target }) => {
                const { value } = target;
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

export default CreateAffiliateCode;
