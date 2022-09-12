import { useWeb3React } from "@web3-react/core"
import { utils } from "ethers"
import { useEffect, useState } from "react"
import { approveJoinRequest, getAccountJoinRequest } from "../../domain/leaderboard/contracts"
import { useDebounce } from "../../lib/legacy"

type Props = {
  competitionIndex: number,
  pendingTxns: any,
  setPendingTxns: any,
}

export default function TeamManagementApproveRequest({ competitionIndex, pendingTxns, setPendingTxns }: Props) {
  const { chainId, library } = useWeb3React()
  const [value, setValue] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [isAddressValid, setIsAddressValid] = useState(false)
  const [isKnownAddress, setIsKnownAddress] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const debouncedValue = useDebounce(value, 300)

  useEffect(() => {
    async function main() {
      if ( ! utils.isAddress(debouncedValue)) {
        setIsAddressValid(false)
        setIsChecking(false)
        setIsKnownAddress(true)
        return
      }

      setIsChecking(true)
      const accountJoinRequest = await getAccountJoinRequest(chainId, library, competitionIndex, utils.getAddress(debouncedValue))
      setIsAddressValid(true)
      setIsChecking(false)
      setIsKnownAddress(accountJoinRequest !== null)
    }

    main()
  }, [chainId, library, competitionIndex, debouncedValue])

  const isValid = () => isKnownAddress && isAddressValid

  const handleInput = ({ target }) => {
    setValue(target.value)
  }

  const handleApproveClick = async () => {
    setIsApproving(true)

    try {
      const tx = await approveJoinRequest(chainId, library, competitionIndex, debouncedValue, {
        successMsg: "Join request approved!",
        sentMsg: "Approval submitted!",
        failMsg: "Approval failed.",
        pendingTxns,
        setPendingTxns,
      })

      await tx.wait()
    } catch (err) {
      console.error(err)
    } finally {
      setIsApproving(false)
      setValue("")
    }
  }

  const getButtonText = () => {
    if (isChecking) {
      return "Checking address..."
    }

    if (!debouncedValue) {
      return "Enter the member address"
    }

    if (!isAddressValid) {
      return "Address is invalid"
    }

    if (!isKnownAddress) {
      return "No join request found"
    }

    if (isApproving) {
      return "Approving member..."
    }

    return "Approve member"
  }

  return (
    <div className="info-card">
      <div className="card-details">
        <h3 className="label">2. Approve Join Request</h3>
        <div>
          <input className="text-input" value={value} onInput={handleInput} placeholder="Member address" />
          <button className="default-btn" onClick={() => handleApproveClick()} disabled={!isValid}>{getButtonText()}</button>
        </div>
      </div>
    </div>
  )
}
