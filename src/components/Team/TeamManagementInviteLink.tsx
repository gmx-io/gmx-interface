import { useWeb3React } from "@web3-react/core"
import { useState } from "react"
import { FiCopy } from "react-icons/fi"
import { useCopyToClipboard } from "react-use"
import { Team } from "../../domain/leaderboard/types"
import { useUserReferralCode } from "../../domain/referrals"
import { helperToast } from "../../lib/legacy"
import "./TeamManagementInviteLink.css"

type Props = {
  team: Team
}

export default function TeamManagementInviteLink({ team }: Props) {
  const { chainId, library, account } = useWeb3React()
  const [useReferralCode, setUseReferralCode] = useState(false)
  const [_, copyToClipboard] = useCopyToClipboard()
  let { userReferralCodeString } = useUserReferralCode(library, chainId, account)


  userReferralCodeString = "ABCD"

  const referralLink = () => {
    const link = new URL(window.location.href)
    if (useReferralCode && userReferralCodeString !== undefined) {
      link.searchParams.set("referral", userReferralCodeString)
    }
    return link.toString()
  }

  const copyInviteLink = () => {
    copyToClipboard(referralLink())
    helperToast.success("Invite link copied to clipboard!")
  }

  return (
    <div className="info-card">
      <div className="card-details">
        <h3 className="label">1. Share Invite Link</h3>
        {userReferralCodeString && (
          <div>
            <span>Include Referral Code {userReferralCodeString}</span>
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
