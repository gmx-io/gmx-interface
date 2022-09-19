import { useWeb3React } from "@web3-react/core"
import { utils } from "ethers"
import { useEffect, useState } from "react"
import { FiCheck } from "react-icons/fi"
import { approveJoinRequest, getAccountJoinRequest } from "../../domain/leaderboard/contracts"
import { Competition, Team } from "../../domain/leaderboard/types"
import "./TeamManagementApproveRequest.css";

type Props = {
  team: Team,
  competition: Competition,
  pendingTxns: any,
  setPendingTxns: any,
}

export default function TeamManagementApproveRequest({ team, competition, pendingTxns, setPendingTxns }: Props) {
  const { chainId, library } = useWeb3React()
  const [value, setValue] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [inputError, setInputError] = useState<string|null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [allAddresses, setAllAddresses] = useState<string[]>([]);

  const getButtonText = () => {
    if (isApproving) {
      return "Approving member"+(allAddresses.length>1?"s":"")+"..."
    }

    if (isChecking) {
      return "Checking address..."
    }

    if (inputError !== null) {
      return inputError
    }

    return "Add address"
  }

  useEffect(() => {
    async function main() {
      if (team.members.length + allAddresses.length > competition.maxTeamSize - 1) {
        setInputError("Your team reached maximum size");
        setIsChecking(false)
        return
      }

      if ( ! utils.isAddress(value)) {
        setInputError("Please enter a valid address")
        setIsChecking(false)
        return
      }

      const addr = utils.getAddress(value)
      if (allAddresses.indexOf(addr) !== -1) {
        setInputError("Address already added")
        setIsChecking(false)
        return
      }

      setIsChecking(true)
      const accountJoinRequest = await getAccountJoinRequest(chainId, library, competition.index, addr)
      setInputError(accountJoinRequest !== null ? null : "No join request found with this address")
      setIsChecking(false)
    }

    main()
  }, [chainId, library, competition.index, value, allAddresses, team, competition.maxTeamSize])

  const isInputValid = () => inputError === null && isChecking === false && isApproving === false

  const handleInput = ({ target }) => {
    setValue(target.value)
  }

  const handleAddAnotherClick = async ({ target }) => {
    setAllAddresses(addresses => [...addresses, value])
    setValue("")
    setInputError(null)
    target.focus()
  }

  const handleApproveClick = async () => {
    setIsApproving(true)

    try {
      const tx = await approveJoinRequest(chainId, library, competition.index, allAddresses.length > 0 ? allAddresses : [value], {
        successMsg: "Join request"+(allAddresses.length>1?"s":"")+" approved!",
        sentMsg: "Approval submitted!",
        failMsg: "Approval failed.",
        pendingTxns,
        setPendingTxns,
      })

      await tx.wait()

      setAllAddresses([])
      setValue("")
    } catch (err) {
      console.error(err)
    } finally {
      setIsApproving(false)
      setValue("")
    }
  }

  return (
    <div className="info-card approve-request-card">
      <div className="card-details">
        <h3 className="label">2. Approve Join Requests</h3>
        <div className="approve-input">
          <input className="text-input" value={value} onInput={handleInput} placeholder="Member address" />
          {isInputValid() && <FiCheck size={20}/>}
        </div>
        <div className="approve-btn-container">
          <button className="default-btn" onClick={handleAddAnotherClick} disabled={!isInputValid()}>
            {getButtonText()}
          </button>
          {allAddresses.length > 0 && !isApproving && (
            <button className="default-btn" onClick={() => handleApproveClick()}>
              Approve {allAddresses.length > 0 ? (allAddresses.length+" ") : ""}member{allAddresses.length > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
