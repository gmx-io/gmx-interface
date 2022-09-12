import { useWeb3React } from "@web3-react/core";
import { useEffect, useState } from "react";
import { Team } from "../../domain/leaderboard/types";
import "./TeamManagement.css";
import TeamManagementJoinRequest from "./TeamManagementJoinRequest";
import TeamManagementInviteLink from "./TeamManagementInviteLink";
import TeamManagementApproveRequest from "./TeamManagementApproveRequest";

type Props = {
  team: Team,
  competitionIndex: number,
  pendingTxns: any,
  setPendingTxns: any,
}

export default function TeamManagement({ team, competitionIndex, pendingTxns, setPendingTxns }: Props) {
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
              competitionIndex={competitionIndex}
              pendingTxns={pendingTxns}
              setPendingTxns={setPendingTxns}
            />
          </>
        )}
        {!isTeamLeader && (
          <TeamManagementJoinRequest
            team={team}
            competitionIndex={competitionIndex}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
          />
        )}
      </div>
    </div>
  )
}
