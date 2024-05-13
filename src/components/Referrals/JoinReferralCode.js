import { useEffect, useRef, useState } from "react";
import { Trans, t } from "@lingui/macro";
import { setTraderReferralCodeByUser, validateReferralCodeExists } from "domain/referrals/hooks";
import { REFERRAL_CODE_REGEX } from "./referralsHelper";
import { useDebounce } from "lib/useDebounce";
import Button from "components/Button/Button";
import useWallet from "lib/wallets/useWallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { usePendingTxns } from "lib/usePendingTxns";

function JoinReferralCode({ active }) {
  const { openConnectModal } = useConnectModal();
  return (
    <div className="referral-card section-center mt-medium">
      <h2 className="title">
        <Trans>Enter Referral Code</Trans>
      </h2>
      <p className="sub-title">
        <Trans>Please input a referral code to benefit from fee discounts.</Trans>
      </p>
      <div className="card-action">
        {active ? (
          <ReferralCodeForm />
        ) : (
          <Button variant="primary-action" className="w-full" type="submit" onClick={openConnectModal}>
            <Trans>Connect Wallet</Trans>
          </Button>
        )}
      </div>
    </div>
  );
}

export function ReferralCodeForm({ callAfterSuccess, userReferralCodeString = "", type = "join" }) {
  const { account, signer, chainId } = useWallet();
  const [referralCode, setReferralCode] = useState("");
  const inputRef = useRef("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCodeExists, setReferralCodeExists] = useState(true);
  const [pendingTxns, setPendingTxns] = usePendingTxns();
  const debouncedReferralCode = useDebounce(referralCode, 300);

  function getPrimaryText() {
    const isEdit = type === "edit";
    if (isEdit && debouncedReferralCode === userReferralCodeString) {
      return t`Same as current active code`;
    }
    if (isEdit && isSubmitting) {
      return t`Updating...`;
    }

    if (isSubmitting) {
      return t`Adding...`;
    }
    if (debouncedReferralCode === "") {
      return t`Enter Referral Code`;
    }
    if (isValidating) {
      return t`Checking code...`;
    }
    if (!referralCodeExists) {
      return t`Referral Code does not exist`;
    }

    return isEdit ? t`Update` : t`Submit`;
  }
  function isPrimaryEnabled() {
    if (
      debouncedReferralCode === "" ||
      isSubmitting ||
      isValidating ||
      !referralCodeExists ||
      debouncedReferralCode === userReferralCodeString
    ) {
      return false;
    }
    return true;
  }

  async function handleSubmit(event) {
    const isEdit = type === "edit";
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const tx = await setTraderReferralCodeByUser(chainId, referralCode, signer, {
        account,
        successMsg: isEdit ? t`Referral code updated!` : t`Referral code added!`,
        failMsg: isEdit ? t`Referral code updated failed.` : t`Adding referral code failed.`,
        setPendingTxns,
        pendingTxns,
      });
      if (callAfterSuccess) {
        callAfterSuccess();
      }
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setReferralCode("");
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function checkReferralCode() {
      if (debouncedReferralCode === "" || !REFERRAL_CODE_REGEX.test(debouncedReferralCode)) {
        setIsValidating(false);
        setReferralCodeExists(false);
        return;
      }

      setIsValidating(true);
      const codeExists = await validateReferralCodeExists(debouncedReferralCode, chainId);
      if (!cancelled) {
        setReferralCodeExists(codeExists);
        setIsValidating(false);
      }
    }
    checkReferralCode();
    return () => {
      cancelled = true;
    };
  }, [debouncedReferralCode, chainId]);

  useEffect(() => {
    inputRef.current.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        disabled={isSubmitting}
        type="text"
        placeholder="Enter referral code"
        className="text-input mb-15"
        value={referralCode}
        onChange={({ target }) => {
          const { value } = target;
          setReferralCode(value);
        }}
      />
      <Button
        variant="primary-action"
        type="submit"
        className="App-cta Exchange-swap-button"
        disabled={!isPrimaryEnabled()}
      >
        {getPrimaryText()}
      </Button>
    </form>
  );
}
export default JoinReferralCode;
