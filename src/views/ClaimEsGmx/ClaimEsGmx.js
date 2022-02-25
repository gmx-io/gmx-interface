import React, { useState, useEffect } from 'react'
import useSWR from 'swr'
// import { ethers } from 'ethers'
import { useWeb3React } from '@web3-react/core'
import {
  ARBITRUM,
  useChainId,
  fetcher,
  formatAmount
} from '../../Helpers'

import { getContract } from '../../Addresses'

// import { callContract } from '../../Api'

import Token from '../../abis/Token.json'

import Checkbox from '../../components/Checkbox/Checkbox'

import "./ClaimEsGmx.css"

import arbitrumIcon from '../../img/ic_arbitrum_96.svg'
import avaIcon from '../../img/ic_avalanche_96.svg'

const VEST_WITH_GMX_ARB = "VEST_WITH_GMX_ARB"
const VEST_WITH_GLP_ARB = "VEST_WITH_GLP_ARB"
const VEST_WITH_GMX_AVAX = "VEST_WITH_GMX_AVAX"
const VEST_WITH_GLP_AVAX = "VEST_WITH_GLP_AVAX"


export default function ClaimEsGmx() {
  const { active, account, library } = useWeb3React()
  const { chainId } = useChainId()
  const [selectedOption, setSelectedOption] = useState("")

  const isArbitrum = chainId === ARBITRUM

  const esGmxIouAddress = getContract(chainId, "ES_GMX_IOU")

  const { data: esGmxIouBalance, mutate: updateEsGmxIouBalance } = useSWR(isArbitrum && [`ClaimEsGmx:esGmxIouBalance:${active}`, chainId, esGmxIouAddress, "balanceOf", account], {
    fetcher: fetcher(library, Token),
  })

  useEffect(() => {
    if (active) {
      library.on('block', () => {
        updateEsGmxIouBalance(undefined, true)
      })
      return () => {
        library.removeAllListeners('block')
      }
    }
  }, [active, library, updateEsGmxIouBalance])

  return(
    <div className="ClaimEsGmx Page page-layout">
      <div className="Page-title-section mt-0">
        <div className="Page-title">Claim esGMX</div>
        {!isArbitrum && <div className="Page-description">
          Please switch your network to Arbitrum.
        </div>}
        {isArbitrum && <div>
          <div className="Page-description">
            You have {formatAmount(esGmxIouBalance, 18, 2, true)} esGMX (IOU) tokens.<br/>
            <br/>
            The address of the esGMX (IOU) token is {esGmxIouAddress}.<br/>
            The esGMX (IOU) token is transferrable. You can add the token to your wallet and send it to another address to claim if you'd like.<br/>
            <br/>
            Select your vesting option below then click "Claim".<br/>
            After claiming, the esGMX tokens will be airdropped to your account on the selected network within 7 days.
          </div>
          <br/>
          <div className="ClaimEsGmx-vesting-options">
            <Checkbox className="arbitrum" isChecked={selectedOption === VEST_WITH_GMX_ARB} setIsChecked={() => setSelectedOption(VEST_WITH_GMX_ARB)}>
              <div className="ClaimEsGmx-option-label">Vest with GMX on Arbitrum</div>
              <img src={arbitrumIcon} alt="arbitrum" />
            </Checkbox>
            <Checkbox className="arbitrum" isChecked={selectedOption === VEST_WITH_GLP_ARB} setIsChecked={() => setSelectedOption(VEST_WITH_GLP_ARB)}>
              <div className="ClaimEsGmx-option-label">Vest with GLP on Arbitrum</div>
              <img src={arbitrumIcon} alt="arbitrum" />
            </Checkbox>
            <Checkbox className="avalanche" isChecked={selectedOption === VEST_WITH_GMX_AVAX} setIsChecked={() => setSelectedOption(VEST_WITH_GMX_AVAX)}>
              <div className="ClaimEsGmx-option-label">Vest with GMX on Avalanche</div>
              <img src={avaIcon} alt="avalanche" />
            </Checkbox>
            <Checkbox className="avalanche" isChecked={selectedOption === VEST_WITH_GLP_AVAX} setIsChecked={() => setSelectedOption(VEST_WITH_GLP_AVAX)}>
              <div className="ClaimEsGmx-option-label avalanche">Vest with GLP on Avalanche</div>
              <img src={avaIcon} alt="avalanche" />
            </Checkbox>
          </div>
        </div>}
      </div>
    </div>
  )
}
