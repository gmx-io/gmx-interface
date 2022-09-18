import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { Competition, Team } from "../../domain/leaderboard/types";
import "./TeamManagement.css";
import TeamManagementJoinRequest from "./TeamManagementJoinRequest";
import TeamManagementInviteLink from "./TeamManagementInviteLink";
import TeamManagementApproveRequest from "./TeamManagementApproveRequest";

type Props = {
  team: Team,
  competition: Competition,
  pendingTxns: any,
  setPendingTxns: any,
}

export default function TeamManagement({ team, competition, pendingTxns, setPendingTxns }: Props) {
  const { account } = useWeb3React()
  const [isTeamLeader, setIsTeamLeader] = useState(false)

  useEffect(() => {
    setIsTeamLeader(team.leaderAddress === account)
  }, [team, account])

  return (
    <div>
      <div className="Tab-title-section">
        <div className="Page-title">
          Join requests
        </div>
        <div className="Page-description">Platform and GLP index tokens.</div>
      </div>
      <div className="referral-stats">
        {isTeamLeader && (
          <>
            <TeamManagementInviteLink team={team}/>
            <TeamManagementApproveRequest
              team={team}
              competition={competition}
              pendingTxns={pendingTxns}
              setPendingTxns={setPendingTxns}
            />
          </>
        )}
        {!isTeamLeader && (
          <TeamManagementJoinRequest
            team={team}
            competition={competition}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
          />
        )}
      </div>
    </div>
  )
}
