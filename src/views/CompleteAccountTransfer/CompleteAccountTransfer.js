import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ethers } from 'ethers'
import { useWeb3React } from '@web3-react/core'

import { getContract } from '../../Addresses'
import { callContract } from '../../Api'
import { useChainId } from '../../Helpers'

import Modal from '../../components/Modal/Modal'
import Footer from "../../Footer"

import RewardRouter from '../../abis/RewardRouter.json'

import "./CompleteAccountTransfer.css"

export default function CompleteAccountTransfer(props) {
  const { sender, receiver } = useParams()
  const { setPendingTxns } = props
  const { library, account } = useWeb3React()
  const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false)

  const { chainId } = useChainId()

  const [isConfirming, setIsConfirming] = useState(false)
  const isLoggedIn = (account || "").toString().toLowerCase() === (receiver || "").toString().toLowerCase()

  const rewardRouterAddress = getContract(chainId, "RewardRouter")

  const getError = () => {
    if (!isLoggedIn) {
      return "Incorrect Account"
    }
  }

  const isPrimaryEnabled = () => {
    const error = getError()
    if (error) {
      return false
    }
    if (isConfirming) {
      return false
    }
    return true
  }

  const getPrimaryText = () => {
    const error = getError()
    if (error) {
      return error
    }
    return "Complete Transfer"
  }

  const onClickPrimary = () => {
    setIsConfirming(true)

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner())

    callContract(chainId, contract, "acceptTransfer", [sender], {
      sentMsg: "Transfer submitted!",
      failMsg: "Transfer failed.",
      setPendingTxns
    })
    .then(async (res) => {
      setIsTransferSubmittedModalVisible(true)
    })
    .finally(() => {
      setIsConfirming(false)
    })
  }

  return (
    <div className="CompleteAccountTransfer Page page-layout">
      <Modal isVisible={isTransferSubmittedModalVisible} setIsVisible={setIsTransferSubmittedModalVisible} label="Transfer Completed">
        Your transfer has been completed.<br/>
        <br/>
        <Link className="App-cta" to="/earn">Continue</Link>
      </Modal>
      <div className="Page-title-section">
        <div className="Page-title">Complete Account Transfer</div>
        {!isLoggedIn && <div className="Page-description">
          You have a pending transfer from {sender}.<br/>
          Please connect your wallet to {receiver} to accept the transfer.
        </div>}
        {isLoggedIn && <div className="Page-description">
          You have a pending transfer from {sender}.<br/>
        </div>}
      </div>
      <div className="Page-content">
        <div className="input-form">
          <div className="input-row">
            <button className="App-cta Exchange-swap-button" disabled={!isPrimaryEnabled()} onClick={onClickPrimary}>
              {getPrimaryText()}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
