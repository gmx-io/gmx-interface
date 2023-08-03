import { useState, useEffect } from "react";
import { Trans } from "@lingui/macro";
import StepIndicator from "../StepIndicator/StepIndicator";
import "./UserOnboardSection.css";
import arrowIcn from "img/arrow_icn.svg";
import stepDone from "img/icn_stepdone.svg";

const UserOnboardSection = ({ step, text, handleClick, disabled, isActive }) => {
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsCompleted(true);
    }
  }, [isActive]);
  return (
    <button className="Wallet-btn-approve" onClick={handleClick} disabled={disabled}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <StepIndicator digit={step} />
        <Trans>{text}</Trans>
      </div>
      <img src={isCompleted ? stepDone : arrowIcn} alt={isCompleted ? "Step done" : "Next step"} />
    </button>
  );
};

export default UserOnboardSection;
