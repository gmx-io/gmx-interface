import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { useLocalStorage } from "react-use";
import { checkTeamName } from "../../domain/leaderboard/contracts";
import { REFERRALS_SELECTED_TAB_KEY, useDebounce } from "../../lib/legacy";
import { AFFILIATES_TAB } from "../../domain/referrals";
import "./../../pages/Referrals/Referrals.css";
import "./TeamRegistrationForm.css";

export default function TeamRegistrationForm({ competitionIndex, times, connectWallet }) {
  const history = useHistory();
  const { active, chainId, library } = useWeb3React();
  const [referralActiveTab, setReferralActiveTab] = useLocalStorage(REFERRALS_SELECTED_TAB_KEY, AFFILIATES_TAB);

  // Name
  const [name, setName] = useState("");
  const debouncedName = useDebounce(name, 300);
  const [nameAlreadyUsed, setNameAlreadyUsed] = useState(false);
  const [validatingName, setValidatingName] = useState(false);

  // Code
  const [code, setCode] = useState("");
  const debouncedCode = useDebounce(code, 300);
  const [codeDoesntExist, setCodeDoesntExist] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);

  if (!times.registrationActive) {
    history.replace("/leaderboard");
  }

  const getButtonText = () => {
    if (validatingName) {
      return "Checking team name...";
    }

    if (validatingCode) {
      return "Checking referral code...";
    }

    if (debouncedName === "") {
      return "Enter Team Name";
    }

    if (nameAlreadyUsed) {
      return "Team name already registered";
    }

    if (debouncedCode === "") {
      return "Enter Referral Code";
    }

    if (codeDoesntExist) {
      return "This referral code does not exist";
    }

    return "Register your team";
  };

  const handleCreateReferralClick = () => {
    if (referralActiveTab !== AFFILIATES_TAB) {
      setReferralActiveTab(AFFILIATES_TAB);
    }

    history.push("/referrals");
  };

  const isFormValid = () => {
    return (
      debouncedName !== "" &&
      !nameAlreadyUsed &&
      debouncedCode !== "" &&
      !codeDoesntExist &&
      !validatingCode &&
      !validatingName
    );
  };

  // Team name check
  useEffect(() => {
    async function checkName() {
      if (debouncedName === "") {
        setValidatingName(false);
        return;
      }

      setValidatingName(true);

      const teamNameValid = await checkTeamName(chainId, library, name, competitionIndex);
      setNameAlreadyUsed(!teamNameValid);

      setValidatingName(false);
    }

    checkName();
  }, [setValidatingName, setNameAlreadyUsed, debouncedName, chainId, competitionIndex, library, name]);

  // Referral
  useEffect(() => {
    async function checkCode() {
      if (debouncedCode === "") {
        setValidatingCode(false);
        return;
      }

      setValidatingCode(true);
      setCodeDoesntExist(true);
      setValidatingCode(false);
    }

    checkCode();
  }, [setValidatingCode, setNameAlreadyUsed, debouncedCode]);

  return (
    <div className="referral-card section-center mt-medium">
      <h2 className="title">Register Your Team</h2>
      <p className="sub-title">Please input a referral code to benefit from fee discounts.</p>
      {active || (
        <button onClick={connectWallet} className="App-cta Exchange-swap-button">
          Connect Wallet
        </button>
      )}
      {active && (
        <div className="card-action">
          <form>
            <input
              value={name}
              onChange={({ target }) => setName(target.value)}
              placeholder="Team name"
              className="text-input mb-sm"
            />
            <input
              value={code}
              onChange={({ target }) => setCode(target.value)}
              placeholder="Referral code"
              className="text-input mb-sm"
            />
            <button type="submit" className="App-cta Exchange-swap-button" disabled={!isFormValid()}>
              {getButtonText()}
            </button>
            <div onClick={() => handleCreateReferralClick()} className="create-new-referral-link">
              Create a new referral code
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
