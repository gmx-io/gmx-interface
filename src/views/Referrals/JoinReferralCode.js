import { useState } from "react";
import cx from "classnames";
import { encodeReferralCode, setTraderReferralCodeByUser } from "../../Api/referrals";
import Loader from "../../components/Common/Loader";
import { getCodeError } from "./ReferralsHelper";

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
      .then(() => {
        setIsJoined(true);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

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
export default JoinReferralCode;
