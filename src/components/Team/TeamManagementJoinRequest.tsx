import { useWeb3React } from "@web3-react/core"
import { useState } from "react"
import { FiClock } from "react-icons/fi"
import { cancelJoinRequest, createJoinRequest, useAccountJoinRequest } from "../../domain/leaderboard/contracts"
import { Team } from "../../domain/leaderboard/types"
import useRouteQuery from "../../lib/useRouteQuery"

type Props = {
  competitionIndex: number,
  team: Team,
  pendingTxns: any,
  setPendingTxns: any
}

export default function TeamManagementJoinRequest({ competitionIndex, team, pendingTxns, setPendingTxns }: Props) {
  const { chainId, library, account } = useWeb3React()
  const query = useRouteQuery()
  const [isCreating, setIsCreating] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const { data: joinRequest } = useAccountJoinRequest(chainId, library, competitionIndex, account)

  const referralCode = query.get("referral") ?? ""

  const view = () => {
    return joinRequest.leaderAddress === team.leaderAddress ? 1 : 0;
  }

  const handleCreateClick = async () => {
    setIsCreating(true)

    try {
      const tx = await createJoinRequest(chainId, library, competitionIndex, team.leaderAddress, referralCode, {
        successMsg: "Join request created!",
        sentMsg: "Join request submitted!",
        failMsg: "Join request failed.",
        pendingTxns,
        setPendingTxns,
      })

      await tx.wait()
    } catch (err) {
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancelClick = async () => {
    setIsCanceling(true)

    try {
      const tx = await cancelJoinRequest(chainId, library, competitionIndex, {
        successMsg: "Join request canceled!",
        sentMsg: "Cancelation submitted!",
        failMsg: "Cancelation failed.",
        pendingTxns,
        setPendingTxns,
      })

      await tx.wait()
    } catch (err) {
      console.error(err)
    } finally {
      setIsCanceling(false)
    }
  }

  return (
    <>
      {view() === 0 && (
        <div className="info-card">
          <div className="card-details card-details-pending-request">
            <h3 className="label">
              <span>Create Join Request</span>
            </h3>
            <p>The team leader have to accept your request.</p>
            {referralCode && <input className="text-input" readOnly type="text" value={referralCode}/>}
            <button className="default-btn" onClick={() => handleCreateClick()} disabled={isCreating}>
              {isCreating ? "Creating join request..." : "Create Join Request"}
            </button>
          </div>
        </div>
      )}
      {view() === 1 && (
        <div className="info-card">
          <div className="card-details card-details-pending-request">
            <h3 className="label">
              <FiClock />
              <span>Pending Join Request</span>
            </h3>
            <p>The team leader have to accept your request.</p>
            <button className="default-btn" disabled={isCanceling} onClick={() => handleCancelClick()}>
              {isCanceling ? "Canceling join request..." : "Cancel Join Request"}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
