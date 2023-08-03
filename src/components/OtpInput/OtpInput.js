import React, { useState, useRef, useEffect } from "react";
import { Trans } from "@lingui/macro";
import cx from "classnames";
import "./OtpInput.css";
import { helperToast } from "lib/helperToast";

function OtpInput({ onOtpEntered, generatedOtp, resendHandler }) {
  const [inputValues, setInputValues] = useState(Array(4).fill(""));
  const [wrongOTP, setWrongOTP] = useState(false);
  const inputRefs = useRef([]);

  const handleInputChange = (event, index) => {
    const newValues = [...inputValues];
    newValues[index] = event.target.value;
    setInputValues(newValues);
    setWrongOTP(false);

    if (event.target.value && index < inputValues.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace") {
      if (inputValues[index]) {
        const newValues = [...inputValues];
        newValues[index] = "";
        setInputValues(newValues);
      } else if (index !== 0) {
        const newValues = [...inputValues];
        newValues[index - 1] = "";
        setInputValues(newValues);
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData("text");

    if (pastedData.match(/^\d{4}$/)) {
      const newValues = pastedData.split("");
      setInputValues(newValues);
    } else {
      helperToast.error("Wrong OTP, please try again.");
      setWrongOTP(true);
    }
  };

  useEffect(() => {
    if (inputValues.join("").length === 4) {
      const otpIsValid = inputValues.join("") === generatedOtp;
      setWrongOTP(!otpIsValid);
      if (otpIsValid) {
        onOtpEntered(inputValues.join(""));
      }
    }
  }, [inputValues, generatedOtp, onOtpEntered]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, inputValues.length);
    inputRefs.current[0].focus();
  }, [inputValues.length]);

  return (
    <div className="input-container">
      <Trans id="Enter Code" render={({ translation }) => <div className="trans-title">{translation}</div>} />
      <Trans
        id={!wrongOTP ? "Check your email address for the OTP" : "OTP Verification Failed, Try Again"}
        render={({ translation }) => <div className="trans-subtitle">{translation}</div>}
      />
      <div className="inputs-wrapper">
        {inputValues.map((value, index) => (
          <input
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            type="number"
            value={value}
            className={cx("input-box", { "input-error": wrongOTP })}
            onChange={(e) => handleInputChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            maxLength={1}
            onPaste={index === 0 ? handlePaste : null}
          />
        ))}
      </div>
      <button className="resend-code" onClick={resendHandler}>
        <Trans id="Resend Code" />
      </button>
    </div>
  );
}

export default OtpInput;
