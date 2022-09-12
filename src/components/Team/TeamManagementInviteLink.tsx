import { useState } from "react"
import { FiCopy } from "react-icons/fi"
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
  const [referralCode] = useState("ABCD")

  const referralLink = () => {
    let link = new URL(window.location.host).toString() + "#/" + getTeamUrl(team.leaderAddress)
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
    <div className="info-card">
      <div className="card-details">
        <h3 className="label">1. Share Invite Link</h3>
        {referralCode && (
          <div>
            <span>Include Referral Code {referralCode}</span>
            <input type="checkbox" onChange={() => setUseReferralCode(v => !v)}/>
          </div>
        )}
        <div className="invite-link-input" onClick={copyInviteLink}>
          <input className="text-input w-2/3" disabled value={referralLink()} />
          <FiCopy />
        </div>
      </div>
    </div>
  )
}
