import { empty } from "@apollo/client";
import { useState } from "react";

function useReferralInput() {
  let [value, setValue] = useState("");
  let [isProcessing, setIsProcessing] = useState(false);
  let [error, setError] = useState("");
  function doesContainSpace(value) {
    let invalid = /\s/;
    return invalid.test(value);
  }

  function isInputValid(value) {
    setError("");
    if (!String(value).trim()) {
      setError(`Input can't be empty.`);
    }
    if (doesContainSpace(value)) {
      setError("The referral code can't be empty or contain spaces.");
    }
    return !String(value).trim() || doesContainSpace(value);
  }

  return {
    value,
    setValue,
    isInputValid,
    isProcessing,
    setIsProcessing,
    error,
  };
}

export default useReferralInput;
