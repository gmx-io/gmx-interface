import { useEffect, useRef, useState } from "react";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { getCodeError, getReferralCodeTakenStatus, getSampleReferrarStat } from "./referralsHelper";
import { useWeb3React } from "@web3-react/core";
import { ARBITRUM } from "config/chains";
import { helperToast } from "lib/helperToast";
import { useDebounce } from "lib/useDebounce";
import Button from "components/Button/Button";

function AddAffiliateCode({
  handleCreateReferralCode,
  active,
  connectWallet,
  setRecentlyAddedCodes,
  recentlyAddedCodes,
}) {
  return (
    <div className="referral-card section-center mt-medium">
      <h2 className="title">
        <Trans>Generate Referral Code</Trans>
      </h2>
      <p className="sub-title">
        <Trans>
          Looks like you don't have a referral code to share. <br /> Create one now and start earning rebates!
        </Trans>
      </p>
      <div className="card-action">
        {active ? (
          <AffiliateCodeForm
            handleCreateReferralCode={handleCreateReferralCode}
            recentlyAddedCodes={recentlyAddedCodes}
            setRecentlyAddedCodes={setRecentlyAddedCodes}
          />
        ) : (
          <Button variant="primary-action" className="w-full" onClick={connectWallet}>
            <Trans>Connect Wallet</Trans>
          </Button>
        )}
      </div>
    </div>
  );
}

export function AffiliateCodeForm({
  handleCreateReferralCode,
  recentlyAddedCodes,
  setRecentlyAddedCodes,
  callAfterSuccess,
}) {
  const [referralCode, setReferralCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef("");
  const [referralCodeCheckStatus, setReferralCodeCheckStatus] = useState("ok");
  const debouncedReferralCode = useDebounce(referralCode, 300);
  const { account, chainId } = useWeb3React();
  useEffect(() => {
    inputRef.current.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkCodeTakenStatus = async () => {
      if (error) {
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
    if (!debouncedReferralCode) {
      return t`Enter a code`;
    }
    if (referralCodeCheckStatus === "taken") {
      return t`Code already taken`;
    }
    if (referralCodeCheckStatus === "checking") {
      return t`Checking code...`;
    }

    return false;
  }

  const buttonError = getButtonError();

  function getPrimaryText() {
    if (buttonError) {
      return buttonError;
    }

    if (isProcessing) {
      return t`Creating...`;
    }

    return t`Create`;
  }
  function isPrimaryEnabled() {
    if (buttonError) {
      return false;
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
    if (["all", "current", "other"].includes(takenStatus)) {
      setIsProcessing(false);
    }

    if (takenStatus === "none" || takenStatus === "other") {
      const ownerOnOtherNetwork = takenInfo[chainId === ARBITRUM ? "ownerAvax" : "ownerArbitrum"];
      try {
        const tx = await handleCreateReferralCode(referralCode);
        if (callAfterSuccess) {
          callAfterSuccess();
        }
        const receipt = await tx.wait();
        if (receipt.status === 1) {
          recentlyAddedCodes.push(getSampleReferrarStat(referralCode, ownerOnOtherNetwork, account));

          helperToast.success(t`Referral code created!`);
          setRecentlyAddedCodes(recentlyAddedCodes);
          setReferralCode("");
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        ref={inputRef}
        value={referralCode}
        disabled={isProcessing}
        className={cx("text-input", { "mb-sm": !error })}
        placeholder={t`Enter a code`}
        onChange={({ target }) => {
          const { value } = target;
          setReferralCode(value);
          setError(getCodeError(value));
        }}
      />
      {error && <p className="error">{error}</p>}
      <Button variant="primary-action" className="w-full" type="submit" disabled={!isPrimaryEnabled()}>
        {getPrimaryText()}
      </Button>
    </form>
  );
}

export default AddAffiliateCode;
