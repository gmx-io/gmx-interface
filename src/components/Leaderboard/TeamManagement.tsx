import { useEffect, useState } from "react";
import { FiClock, FiCopy } from "react-icons/fi";
import "./TeamManagement.css";

export default function TeamManagement({ team, account }) {
  const [isTeamLeader, setIsTeamLeader] = useState(false)

  useEffect(() => {
    setIsTeamLeader(team.leaderAddress === account)
  }, [team, account])

  return (
    <div>
      <div className="Tab-title-section">
        <div className="Page-title">
          Team requests
        </div>
        <div className="Page-description">Platform and GLP index tokens.</div>
      </div>
      <div className="referral-stats">
        {isTeamLeader && (
          <>
            <div className="info-card">
              <div className="card-details">
                <h3 className="label">1. Share Invite Link</h3>
                <div>
                  <span>Include Referral Code</span>
                  <input type="checkbox" />
                </div>
                <div className="invite-link-input">
                  <input className="text-input w-2/3" disabled value="https://app.gmx.io/leaderboard/teams/invite" />
                  <FiCopy />
                </div>
              </div>
            </div>
            <div className="info-card">
              <div className="card-details">
                <h3 className="label">2. Approve Join Request</h3>
                <div>
                  <input className="text-input" placeholder="Member address" />
                  <button className="default-btn">Approve</button>
                </div>
              </div>
            </div>
          </>
        )}
        {!isTeamLeader && (
          <>
            <div className="info-card">
              <div className="card-details card-details-pending-request">
                <h3 className="label">
                  <span>Create Join Request</span>
                </h3>
                <p>The team leader have to accept your request.</p>
                {/* <button className="default-btn">Cancel Join Request</button> */}
              </div>
            </div>
            <div className="info-card">
              <div className="card-details card-details-pending-request">
                <h3 className="label">
                  <FiClock />
                  <span>Pending Join Request</span>
                </h3>
                <p>The team leader have to accept your request.</p>
                <button className="default-btn">Cancel Join Request</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
