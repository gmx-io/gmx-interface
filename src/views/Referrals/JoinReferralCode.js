import { useEffect, useRef, useState } from "react";
import { encodeReferralCode, setTraderReferralCodeByUser, validateReferralCodeExists } from "../../Api/referrals";
import Loader from "../../components/Common/Loader";
import { CODE_REGEX } from "./ReferralsHelper";
import { useDebounce } from "../../Helpers";
import { useWeb3React } from "@web3-react/core";

function JoinReferralCode({ setPendingTxns, pendingTxns }) {
  const [isJoined, setIsJoined] = useState(false);
  if (isJoined) return <Loader />;
  return (
    <div className="referral-card section-center mt-medium">
      <h2 className="title">Enter Referral Code</h2>
      <p className="sub-title">Please input a referral code to benefit from fee discounts.</p>
      <div className="card-action">
        <JoinReferralCodeForm
          afterSuccess={() => setIsJoined(true)}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
        />
      </div>
    </div>
  );
}

export function JoinReferralCodeForm({
  setPendingTxns,
  pendingTxns,
  userReferralCodeString = "",
  type = "join",
  afterSuccess,
}) {
  const { account, library, chainId } = useWeb3React();
  const [referralCode, setReferralCode] = useState("");
  const inputRef = useRef("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCodeExists, setReferralCodeExists] = useState(true);
  const debouncedEditReferralCode = useDebounce(referralCode, 300);

  function getPrimaryText() {
    const isEdit = type === "edit";
    if (isEdit && referralCode === userReferralCodeString) {
      return "Referral Code is same";
    }
    if (isEdit && isSubmitting) {
      return "Updating...";
    }

    if (isSubmitting) {
      return "Adding...";
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

    return isEdit ? "Update" : "Submit";
  }
  function isPrimaryEnabled() {
    if (
      debouncedEditReferralCode === "" ||
      isSubmitting ||
      isValidating ||
      !referralCodeExists ||
      referralCode === userReferralCodeString
    ) {
      return false;
    }
    return true;
  }

  function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    const referralCodeHex = encodeReferralCode(referralCode);
    return setTraderReferralCodeByUser(chainId, referralCodeHex, library, {
      account,
      successMsg: `Referral code updated!`,
      failMsg: "Referral code updated failed.",
      setPendingTxns,
      pendingTxns,
    })
      .then(() => {
        if (afterSuccess) {
          afterSuccess();
        }
      })
      .finally(() => {
        setIsSubmitting(false);
      });
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
        className="text-input mb-sm"
        value={referralCode}
        onChange={({ target }) => {
          const { value } = target;
          setReferralCode(value);
        }}
      />
      <button type="submit" className="App-cta Exchange-swap-button" disabled={!isPrimaryEnabled()}>
        {getPrimaryText()}
      </button>
    </form>
  );
}
export default JoinReferralCode;
