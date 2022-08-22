import { useWeb3React } from "@web3-react/core"
import { useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import { useLocalStorage } from "react-use"
import { registerTeam } from "../../Api/competition"
import { encodeReferralCode, getReferralCodeOwner } from "../../Api/referrals"
import { isAddressZero, REFERRALS_SELECTED_TAB_KEY, useDebounce } from "../../Helpers"
import { AFFILIATES } from "../../views/Referrals/Referrals"
import { REFERRAL_CODE_REGEX } from "../Referrals/referralsHelper"

export function RegisterTeamForm ({ chainId, library, account, setPendingTxns })
{
  const history = useHistory()
  const [activeReferralTab,setActiveReferralTab] = useLocalStorage(REFERRALS_SELECTED_TAB_KEY, AFFILIATES)

  const [name, setName] = useState("")

  const [code, setCode] = useState("")
  const debouncedCode = useDebounce(code, 300)
  const [codeDoesntExist, setCodeDoesntExist] = useState(false)
  const [codeIsNotOwned, setCodeIsNotOwned] = useState(false)
  const [validatingCode, setValidatingCode] = useState(false)

  const getButtonText = () => {
    if (debouncedCode === "") {
      return "Enter team details";
    }

    if (validatingCode) {
      return "Checking referral code..."
    }

    if (codeDoesntExist) {
      return "This referral code does not exist"
    }

    if (codeIsNotOwned) {
      return "You must own the referral code"
    }

    return "Create Team"
  }

  // Code validation
  useEffect(async () => {
    setValidatingCode(true)

    if (debouncedCode === "" || !REFERRAL_CODE_REGEX.test(debouncedCode)) {
      setCodeDoesntExist(true)
    } else {
      const owner = await getReferralCodeOwner(chainId, encodeReferralCode(debouncedCode))
      setCodeDoesntExist(isAddressZero(owner))
      setCodeIsNotOwned(owner !== account);
    }

    setValidatingCode(false)
  }, [debouncedCode])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const tx = await registerTeam(chainId, library, name, code, { setPendingTxns })
  }

  const handleCreateCodeClick = () => {
    if (activeReferralTab !== AFFILIATES) {
      setActiveReferralTab(AFFILIATES)
    }
    history.push("/referrals")
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="title">Register you team</h2>
      <p className="subtitle">Register you team by submiting the details,<br/>you will be able to share the invite link after.</p>
      <div className="mt-large">
        <div>
          <input autoFocus className="input" onChange={({ target }) => setName(target.value)} placeholder="Team name"/>
        </div>
        <div>
          <input className="input" onChange={({ target }) => setCode(target.value)} placeholder="Referral code"/>
        </div>
      </div>
      <button type="submit" className="App-cta Exchange-swap-button mt-medium">
        {getButtonText()}
      </button>
      <div className="mt-medium">
        <div className="create-code-link" onClick={handleCreateCodeClick}>Create a referral code</div>
      </div>
    </form>
  )
}
