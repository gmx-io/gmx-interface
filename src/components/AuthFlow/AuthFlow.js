import Button from "components/Button/Button";
import { createOtp } from "config/tool";
import sendOtp from "external/sendOtp";
import { updateUserEmail } from "external/supabase/supabaseFns";
import { helperToast } from "lib/helperToast";
import { useState } from "react";
import Confetti from "react-confetti";
import OTPInput from "react-otp-input";
import { useHistory } from "react-router-dom";

const newUserFlow = [1, 2, 3, 4, 5];
const existingUserFlow = [2, 3, 4, 5];
const existingUserWithEmail = [2];
const AuthFlow = ({ account, setModalVisible, isNewUser, emailExists }) => {
  const history = useHistory();

  const flow = [];
  if (isNewUser) flow.push(...newUserFlow);
  else if (emailExists) flow.push(...existingUserWithEmail);
  else flow.push(...existingUserFlow);

  const [authStep, setAuthStep] = useState(flow[0]);
  const [emailText, setEmailText] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState(0);
  //const { deactivate } = useWeb3React();

  const handleEmailEntered = (email) => {
    // Regular expression for email validation
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    return Boolean(emailRegex.test(email));
  };

  const handleSkip = () => {
    history.push("/trade");
    setModalVisible(false);
  };

  const handleWalletDisconnect = () => {
    //deactivate();
    setModalVisible(false);
  };

  const regenerateOtp = async () => {
    const otp = createOtp();
    setGeneratedOtp(otp);
    return await sendOtp(emailText, otp);
  };

  const handleEmailSubmit = async (email) => {
    if (handleEmailEntered(email.trim())) {
      setEmailText(email.trim());
      // generate new otp
      const otp = createOtp();
      setGeneratedOtp(otp);

      const otpSentSuccessfully = await sendOtp(email, otp);
      if (otpSentSuccessfully) {
        return true;
      }
    } else {
      helperToast.error("Invalid Email Address.");
      return false;
    }
  };

  const verifyOtp = async (enteredOtp) => {
    if (enteredOtp === generatedOtp) {
      const updateEmail = await updateUserEmail(account, emailText);
      if (updateEmail) {
        return true;
      } else {
        helperToast.error("Error updating email.");
      }
    } else {
      helperToast.error("OTP entered is incorrect.");
    }
  };

  const handleAuthFlow = (currentStep) => {
    const index = flow.indexOf(currentStep);
    if (flow.length - 1 === index) {
      history.push("/trade");
      setModalVisible(false);
      // last step. close the modal.
    } else {
      setAuthStep(flow[index + 1]);
    }
  };

  return (
    <>
      {authStep === 1 && <ReferralModal handleAuthFlow={handleAuthFlow} />}
      {authStep === 2 && (
        <SignMessageModal handleAuthFlow={handleAuthFlow} handleWalletDisconnect={handleWalletDisconnect} />
      )}
      {authStep === 3 && (
        <VerifyEmailModal
          handleAuthFlow={handleAuthFlow}
          handleEmailSubmit={handleEmailSubmit}
          handleSkip={handleSkip}
        />
      )}
      {authStep === 4 && (
        <VerifyOtpModal handleAuthFlow={handleAuthFlow} verifyOtp={verifyOtp} regenerateOtp={regenerateOtp} />
      )}
      {authStep === 5 && <OtpSuccessModal handleAuthFlow={handleAuthFlow} />}
    </>
  );
};

const SignMessageModal = ({ handleAuthFlow, handleWalletDisconnect }) => {
  const [loading, setLoading] = useState(false);

  const signMessage = async () => {
    setLoading(true);

    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const account = accounts[0];

    const signature = await window.ethereum.request({
      method: "personal_sign",
      params: [`Sign to verify your wallet ${account}`, account],
    });
    if (signature) handleAuthFlow(2);
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", textAlign: "center" }}>
        <div style={{ padding: "12px" }}>
          <label className="connect-wallet-title">Sign the message in your wallet to continue</label>
        </div>
        <label style={{ fontSize: "15px" }} className="connect-wallet-description">
          By connecting your wallet and using T3, You agree to our{" "}
          <a className="t3-anchor" href="https://t3.finance">
            Terms and Conditions
          </a>{" "}
          and{" "}
          <a className="t3-anchor" href="https://t3.finance">
            Privacy Policy
          </a>
          .
        </label>
      </div>
      <div className="Modal-content-wrapper">
        <div className="Email-input-section">
          <Button className={`${loading ? "btn-loading" : ""}`} onClick={signMessage}>{`${
            loading ? "Waiting for Signature..." : "Continue"
          }`}</Button>
          <button onClick={handleWalletDisconnect} className="referral-skip-btn">{`Disconnect`}</button>
        </div>
      </div>
    </>
  );
};

const VerifyEmailModal = ({ handleAuthFlow, handleEmailSubmit, handleSkip }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerateOtp = async () => {
    setLoading(true);
    const status = await handleEmailSubmit(email);
    setLoading(false);
    if (status) handleAuthFlow(3);
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", textAlign: "center" }}>
        <div style={{ padding: "12px" }}>
          <label className="connect-wallet-title">You are almost there!</label>
        </div>
        <label style={{ fontSize: "15px" }} className="connect-wallet-description">
          Connect email to receive notifications of important messages!
        </label>
      </div>
      <div className="Modal-content-wrapper">
        <div className="Email-input-section">
          <input
            className="referral-input"
            type="text"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button className={`${loading ? "btn-loading" : ""}`} onClick={handleGenerateOtp}>{`${
            loading ? "Sending OTP..." : "Continue"
          }`}</Button>
          {/* <Button variant="semi-clear" onClick={() => handleEmailSubmit(emailText)}>{`Skip`}</Button> */}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        <button onClick={handleSkip} className="referral-skip-btn">{`Skip`}</button>
        <button onClick={handleSkip} className="referral-skip-btn">{`Dismiss Forever`}</button>
      </div>
    </>
  );
};

const VerifyOtpModal = ({ handleAuthFlow, verifyOtp, regenerateOtp }) => {
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");

  const verifyEnteredOtp = async () => {
    setLoading(true);
    const status = await verifyOtp(otp);
    setLoading(false);
    if (status) handleAuthFlow(4);
  };

  const handleGenerateOtp = async () => {
    const status = await regenerateOtp();
    if (status) helperToast.success("OTP sent successfully");
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", textAlign: "center" }}>
        <div style={{ padding: "12px" }}>
          <label className="connect-wallet-title">Enter Code</label>
        </div>
        <label style={{ fontSize: "15px" }} className="connect-wallet-description">
          We sent OTP code to your email address
        </label>
      </div>
      <div className="Modal-content-wrapper">
        <div className="Email-input-section">
          <OTPInput
            inputStyle="otp-input"
            value={otp}
            onChange={setOtp}
            numInputs={4}
            renderSeparator={<span>-</span>}
            renderInput={(props) => <input {...props} />}
          />
          <Button className={`${loading ? "btn-loading" : ""}`} onClick={verifyEnteredOtp}>{`${
            loading ? "Vertifying OTP..." : "Continue"
          }`}</Button>
          <button onClick={handleGenerateOtp} className="referral-skip-btn">{`Resend Code`}</button>
        </div>
      </div>
    </>
  );
};

const OtpSuccessModal = ({ handleAuthFlow }) => {
  return (
    <>
      <Confetti recycle={false} width={600} height={1000} />
      <div style={{ display: "flex", flexDirection: "column", textAlign: "center" }}>
        <div style={{ padding: "12px" }}>
          <label className="connect-wallet-title">Congratulations! 🎉</label>
          <br />
          <label className="connect-wallet-title">You have successfully added your email</label>
        </div>
      </div>
      <div className="Modal-content-wrapper">
        <div className="Email-input-section">
          <Button onClick={() => handleAuthFlow(5)}>{`Back to app`}</Button>
        </div>
      </div>
    </>
  );
};

const ReferralModal = ({ handleAuthFlow }) => {
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", textAlign: "center" }}>
        <div style={{ padding: "12px" }}>
          <label className="connect-wallet-title">Referral Code</label>
        </div>
        <label style={{ fontSize: "15px" }} className="connect-wallet-description">
          Enter your referral code to get special benefits.
        </label>
      </div>
      <div className="Modal-content-wrapper">
        <div className="Email-input-section">
          {/* <label>Your email</label> */}
          {/* <img src={emailIcn} alt="Email icon" /> */}
          <input
            className="referral-input"
            type="text"
            placeholder="Enter referral Code (Optional)"
            // value={emailText}
            // onChange={(e) => setEmailText(e.target.value)}
          />
          <Button>{`Verify`}</Button>

          <button onClick={() => handleAuthFlow(1)} className="referral-skip-btn">{`Skip`}</button>
        </div>
      </div>
    </>
  );
};

export default AuthFlow;
