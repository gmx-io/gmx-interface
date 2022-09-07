import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { checkTeamName, createTeam } from "../../domain/leaderboard/contracts";
import { getTeamUrl } from "../../domain/leaderboard/urls";
import { useDebounce } from "../../lib/legacy";
import "./TeamCreationForm.css";

export default function TeamCreationForm({ competitionIndex, times, connectWallet, pendingTxns, setPendingTxns }) {
  const history = useHistory();
  const { active, chainId, library, account } = useWeb3React();
  const [isProcessing, setIsProcessing] = useState(false)
  const [name, setName] = useState("");
  const debouncedName = useDebounce(name, 300);
  const [nameAlreadyUsed, setNameAlreadyUsed] = useState(false);
  const [validatingName, setValidatingName] = useState(false);

  if (!times.registrationActive) {
    history.replace("/leaderboard");
  }

  const getButtonText = () => {
    if (validatingName) {
      return "Checking team name...";
    }

    if (debouncedName === "") {
      return "Enter Team Name";
    }

    if (nameAlreadyUsed) {
      return "Team name already registered";
    }

    if (isProcessing) {
      return "Creating the team...";
    }

    return "Register your team";
  };

  const isFormValid = () => {
    return (
      debouncedName !== "" &&
      !nameAlreadyUsed &&
      !validatingName
    );
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault()
    setIsProcessing(true)

    try {
      const tx = await createTeam(chainId, library, competitionIndex, debouncedName, {
        successMsg: "Team created!",
        sentMsg: "Team creation submitted!",
        failMsg: "Team creation failed.",
        pendingTxns,
        setPendingTxns
      })

      const receipt = await tx.wait()

      if (receipt.status === 1) {
        return history.replace(getTeamUrl(account))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Team name check
  useEffect(() => {
    async function checkName() {
      if (debouncedName === "") {
        setValidatingName(false);
        return;
      }

      setValidatingName(true);

      const teamNameValid = await checkTeamName(chainId, library, debouncedName, competitionIndex);
      setNameAlreadyUsed(!teamNameValid);

      setValidatingName(false);
    }

    checkName();
  }, [setValidatingName, setNameAlreadyUsed, debouncedName, chainId, competitionIndex, library]);

  // Referral
  // useEffect(() => {
  //   async function checkCode() {
  //     if (debouncedCode === "") {
  //       setValidatingCode(false);
  //       return;
  //     }

  //     setValidatingCode(true);
  //     setCodeDoesntExist(true);
  //     setValidatingCode(false);
  //   }

  //   checkCode();
  // }, [setValidatingCode, setNameAlreadyUsed, debouncedCode]);

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
          <form onSubmit={handleFormSubmit}>
            <input
              value={name}
              onChange={({ target }) => setName(target.value)}
              placeholder="Team name"
              className="text-input mb-sm"
            />
            {/* <input
              value={code}
              onChange={({ target }) => setCode(target.value)}
              placeholder="Referral code"
              className="text-input mb-sm"
            /> */}
            <button type="submit" className="App-cta Exchange-swap-button" disabled={!isFormValid()}>
              {getButtonText()}
            </button>
            {/* <div onClick={() => handleCreateReferralClick()} className="create-new-referral-link">
              Create a new referral code
            </div> */}
          </form>
        </div>
      )}
    </div>
  );
}
