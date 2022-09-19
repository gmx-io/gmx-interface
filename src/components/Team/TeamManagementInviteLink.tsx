import { useState } from "react"
import { useCopyToClipboard } from "react-use"
import { Team } from "../../domain/leaderboard/types"
import { getTeamUrl } from "../../domain/leaderboard/urls"
import { helperToast } from "../../lib/legacy"
import "./TeamManagementInviteLink.css"

type Props = {
  team: Team
}

export default function TeamManagementInviteLink({ team }: Props) {
  const [useReferralCode, setUseReferralCode] = useState(false)
  const [, copyToClipboard] = useCopyToClipboard()
  const [referralCode] = useState("")

  const referralLink = () => {
    let link = new URL(window.location.host).toString() + "/#" + getTeamUrl(team.leaderAddress)
    if (useReferralCode && referralCode !== "") {
      link += "?referral=" + referralCode
    }
    return link
  }

  const copyInviteLink = () => {
    copyToClipboard(referralLink())
    helperToast.success("Invite link copied to clipboard!")
  }

  return (
    <div className="info-card invite-link-card">
      <div className="card-details">
        <h3 className="label">1. Share Invite Link</h3>
        {referralCode && (
          <div>
            <span>Include Referral Code {referralCode}</span>
            <input type="checkbox" onChange={() => setUseReferralCode(v => !v)}/>
          </div>
        )}
        <button className="default-btn" onClick={copyInviteLink}>Copy invite link to clipboard</button>
      </div>
    </div>
  )
}
