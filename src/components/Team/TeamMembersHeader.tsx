import { Competition, Team } from "../../domain/leaderboard/types";
import "./TeamMembersHeader.css";
import { CHAIN_ID_QUERY_PARAM, helperToast, useChainId } from "../../lib/legacy";
import { getTeamUrl } from "../../domain/leaderboard/urls";
import { useCopyToClipboard } from "react-use";
import useRouteQuery from "../../lib/useRouteQuery";
import Modal from "../Modal/Modal";
import { useEffect, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import { ethers } from "ethers";
import { approveJoinRequest, cancelJoinRequest, createJoinRequest, getAccountJoinRequest, useAccountJoinRequest } from "../../domain/leaderboard/contracts";

type InviteButtonprops = {
  team: Team,
}

function InviteButton({ team }: InviteButtonprops) {
  const { chainId } = useChainId()
  const query = useRouteQuery()
  const [,copyToClipboard] = useCopyToClipboard()

  const referralLink = () => {
    let link = new URL(window.location.host).toString() + "/#" + getTeamUrl(team.leaderAddress)
    link += `?${CHAIN_ID_QUERY_PARAM}=${chainId}`
    if (query.has("referral") && query.get("referral") !== "") {
      link += "&referral=" + query.get("referral")
    }
    return link
  }

  const copyInviteLink = () => {
    copyToClipboard(referralLink())
    helperToast.success("Invite link copied to clipboard!")
  }

  return (
    <button className="default-btn" onClick={copyInviteLink}>
      Copy Invite Link
    </button>
  )
}

type ApproveButtonProps = {
  team: Team,
  pendingTxns: any,
  setPendingTxns: any,
}

function ApproveButton({ team, pendingTxns, setPendingTxns }: ApproveButtonProps) {
  const { chainId, library, account } = useWeb3React()
  const [value, setValue] = useState("")
  const [open, setOpen] = useState(false)
  const [inputError, setInputError] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function main() {
      setIsChecking(true)

      if (value === "") {
        setInputError("")
        setIsChecking(false)
        return
      }

      if (!ethers.utils.isAddress(value)) {
        setInputError("Please enter a valid address")
        setIsChecking(false)
        return
      }

      // const joinRequest = await getAccountJoinRequest(chainId, library, team.competitionIndex, account)
      // if (joinRequest === null) {
      //   setInputError("Please enter a valid address")
      //   setIsChecking(false)
      //   return
      // }

      // if (joinRequest.leaderAddress !== team.leaderAddress) {
      //   setInputError("Please enter a valid address")
      //   setIsChecking(false)
      // }

      setInputError("")
      setIsChecking(false)
    }

    main()
  }, [account, chainId, library, team.competitionIndex, value, team.leaderAddress])

  const getMainButtonText = () => {
    if (value === "") {
      return "Enter member address"
    }

    if (processing) {
      return "Approving..."
    }

    if (isChecking) {
      return "Checking address..."
    }

    if (inputError) {
      return inputError
    }

    return "Approve member"
  }

  const handleInput = ({ target }) => {
    setValue(target.value.trim())
  }

  const sendTransaction = async () => {
    setProcessing(true)

    try {
      const tx = await approveJoinRequest(chainId, library, team.competitionIndex, [value], {
        successMsg: "User approved!",
        sentMsg: "User approval submitted!",
        failMsg: "User approval failed.",
        pendingTxns,
        setPendingTxns,
      })

      const receipt = await tx.wait()

      if (receipt.status === 1) {
        setOpen(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setValue("")
      setProcessing(false)
    }
  }

  return (
    <>
      <button className="transparent-btn" onClick={() => setOpen(true)}>
        {processing ? "Approving..." : "Approve members"}
      </button>
      <Modal label="Approve members" isVisible={open} setIsVisible={setOpen}>
        <div className="team-modal-content">
          <p>Lorem ipsum dolor, sit amet consectetur adipisicing elit.</p>
          <input disabled={processing} placeholder="Member address" className="text-input text-input-approve" type="text" value={value} onInput={handleInput}/>
          <div className="divider"></div>
          <button
            className="default-btn"
            disabled={value === "" || inputError || processing ? true : false}
            onClick={() => sendTransaction()}
          >
            {getMainButtonText()}
          </button>
        </div>
      </Modal>
    </>
  )
}

type CreateJoinRequestProps = {
  team: Team,
  pendingTxns: any,
  setPendingTxns: any,
}

function CreateJoinRequest({ team, pendingTxns, setPendingTxns }: CreateJoinRequestProps) {
  const { chainId, library } = useWeb3React()
  const query = useRouteQuery()
  const [open, setOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [referralCode, setReferralCode] = useState("")

  useEffect(() => {
    const code = query.get("referral")
    if (code !== null && code !== "") {
      setReferralCode(code)
    }
  }, [query])

  const handleButtonClick = () => {
    if (referralCode === "") {
      return sendTransaction()
    }

    setOpen(true)
  }

  const sendTransaction = async () => {
    setProcessing(true)

    try {
      const tx = await createJoinRequest(chainId, library, team.competitionIndex, team.leaderAddress, referralCode, {
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
      setProcessing(false)
    }
  }

  return (
    <>
      <button className="default-btn" disabled={processing} onClick={() => handleButtonClick()}>{processing ? "Creating join request..." : "Create Join Request"}</button>
      <Modal label="Create Join Request" isVisible={open} setIsVisible={setOpen}>
        <div className="team-modal-content">
          <p>By creating this join request you accept to use the team leader's referral code: </p>
          <p className="team-modal-referral-code">{referralCode}</p>
          <div className="divider"></div>
          <button className="default-btn" onClick={sendTransaction}>Create join request</button>
        </div>
      </Modal>
    </>
  )
}

type CancelJoinRequestProps = {
  team: Team,
  pendingTxns: any,
  setPendingTxns: any,
}

function CancelJoinRequest({ team, pendingTxns, setPendingTxns }: CancelJoinRequestProps) {
  const { chainId, library } = useWeb3React()
  const [processing, setProcessing] = useState(false)

  const sendTransaction = async () => {
    setProcessing(true)

    try {
      const tx = await cancelJoinRequest(chainId, library, team.competitionIndex, {
        successMsg: "Join request canceled!",
        sentMsg: "Join request cancelation submitted!",
        failMsg: "Join request cancelation failed.",
        pendingTxns,
        setPendingTxns,
      })

      await tx.wait()
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <button className="transparent-btn" onClick={() => sendTransaction()}>
      {processing ? "Canceling join request..." : "Cancel Join Request"}
    </button>
  )
}

type TeamMemberHeaderProps = {
  team: Team,
  pendingTxns: any,
  setPendingTxns: any,
}

export default function TeamMembersHeader({ team, pendingTxns, setPendingTxns }: TeamMemberHeaderProps) {
  const { chainId, library, account } = useWeb3React()
  const { exists } = useAccountJoinRequest(chainId, library, team.competitionIndex, account)

  const isLeader = () => account === team.leaderAddress

  return (
    <div className="simple-table-top-header simple-table-top-header-right">
      {isLeader() ? (
        <>
          <InviteButton team={team}/>
          <ApproveButton team={team} setPendingTxns={setPendingTxns} pendingTxns={pendingTxns}/>
        </>
      ) : (
        <>
          {!exists && <CreateJoinRequest team={team} setPendingTxns={setPendingTxns} pendingTxns={pendingTxns}/>}
          {exists && <CancelJoinRequest team={team} setPendingTxns={setPendingTxns} pendingTxns={pendingTxns}/>}
        </>
      )}
    </div>
  )
}
