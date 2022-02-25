import React, { useState, useEffect } from 'react'
import useSWR from 'swr'
// import { ethers } from 'ethers'
import { useWeb3React } from '@web3-react/core'
import {
  ARBITRUM,
  PLACEHOLDER_ACCOUNT,
  useChainId,
  fetcher,
  formatAmount
} from '../../Helpers'

import { getContract } from '../../Addresses'

// import { callContract } from '../../Api'

import Token from '../../abis/Token.json'
import RewardReader from '../../abis/RewardReader.json'

import Checkbox from '../../components/Checkbox/Checkbox'

import "./ClaimEsGmx.css"

import arbitrumIcon from '../../img/ic_arbitrum_96.svg'
import avaIcon from '../../img/ic_avalanche_96.svg'

const VEST_WITH_GMX_ARB = "VEST_WITH_GMX_ARB"
const VEST_WITH_GLP_ARB = "VEST_WITH_GLP_ARB"
const VEST_WITH_GMX_AVAX = "VEST_WITH_GMX_AVAX"
const VEST_WITH_GLP_AVAX = "VEST_WITH_GLP_AVAX"

export function getVestingDataV2(vestingInfo) {
  if (!vestingInfo || vestingInfo.length === 0) {
    return;
  }

  const keys = ["gmxVester", "glpVester"];
  const data = {};
  const propsLength = 12;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      pairAmount: vestingInfo[i * propsLength],
      vestedAmount: vestingInfo[i * propsLength + 1],
      escrowedBalance: vestingInfo[i * propsLength + 2],
      claimedAmounts: vestingInfo[i * propsLength + 3],
      claimable: vestingInfo[i * propsLength + 4],
      maxVestableAmount: vestingInfo[i * propsLength + 5],
      combinedAverageStakedAmount: vestingInfo[i * propsLength + 6],
      cumulativeReward: vestingInfo[i * propsLength + 7],
      transferredCumulativeReward: vestingInfo[i * propsLength + 8],
      bonusReward: vestingInfo[i * propsLength + 9],
      averageStakedAmount: vestingInfo[i * propsLength + 10],
      transferredAverageStakedAmount: vestingInfo[i * propsLength + 11]
    };

    data[key + "PairAmount"] = data[key].pairAmount;
    data[key + "VestedAmount"] = data[key].vestedAmount;
    data[key + "EscrowedBalance"] = data[key].escrowedBalance;
    data[key + "ClaimSum"] = data[key].claimedAmounts.add(data[key].claimable);
    data[key + "Claimable"] = data[key].claimable;
    data[key + "MaxVestableAmount"] = data[key].maxVestableAmount;
    data[key + "CombinedAverageStakedAmount"] = data[key].combinedAverageStakedAmount;
    data[key + "CumulativeReward"] = data[key].cumulativeReward;
    data[key + "TransferredCumulativeReward"] = data[key].transferredCumulativeReward;
    data[key + "BonusReward"] = data[key].bonusReward;
    data[key + "AverageStakedAmount"] = data[key].averageStakedAmount;
    data[key + "TransferredAverageStakedAmount"] = data[key].transferredAverageStakedAmount;
  }

  return data;
}


export default function ClaimEsGmx() {
  const { active, account, library } = useWeb3React()
  const { chainId } = useChainId()
  const [selectedOption, setSelectedOption] = useState("")

  const isArbitrum = chainId === ARBITRUM

  const esGmxIouAddress = getContract(chainId, "ES_GMX_IOU")

  const { data: esGmxIouBalance, mutate: updateEsGmxIouBalance } = useSWR(isArbitrum && [`ClaimEsGmx:esGmxIouBalance:${active}`, chainId, esGmxIouAddress, "balanceOf", account || PLACEHOLDER_ACCOUNT], {
    fetcher: fetcher(library, Token),
  })

  const arbRewardReaderAddress = getContract(ARBITRUM, "RewardReader")
  const arbVesterAdddresses = [getContract(ARBITRUM, "GmxVester"), getContract(ARBITRUM, "GlpVester")]

  const { data: arbVestingInfo, mutate: updateArbVestingInfo } = useSWR([`StakeV2:vestingInfo:${active}`, ARBITRUM, arbRewardReaderAddress, "getVestingInfoV2", account || PLACEHOLDER_ACCOUNT], {
    fetcher: fetcher(library, RewardReader, [arbVesterAdddresses]),
  })

  const arbVestingData = getVestingDataV2(arbVestingInfo)
  console.log("arbVestingData", arbVestingData)

  useEffect(() => {
    if (active) {
      library.on('block', () => {
        updateEsGmxIouBalance(undefined, true)
        updateArbVestingInfo(undefined, true)
      })
      return () => {
        library.removeAllListeners('block')
      }
    }
  }, [active, library, updateEsGmxIouBalance, updateArbVestingInfo])

  let currentMaxVestableEsGmx
  let currentRatio

  let nextMaxVestableEsGmx
  let nextRatio

  const ratioMultiplier = 10000

  if (selectedOption === VEST_WITH_GMX_ARB && arbVestingData && arbVestingData.gmxVester && esGmxIouBalance) {
    const amount = esGmxIouBalance
    currentMaxVestableEsGmx = arbVestingData.gmxVester.maxVestableAmount
    nextMaxVestableEsGmx = currentMaxVestableEsGmx.add(amount)

    const combinedAverageStakedAmount = arbVestingData.gmxVester.combinedAverageStakedAmount
    currentRatio = combinedAverageStakedAmount.mul(ratioMultiplier).div(currentMaxVestableEsGmx)

    const stakeAmount = amount.mul(4)
    const transferredAverageStakedAmount = arbVestingData.gmxVester.transferredAverageStakedAmount
    const transferredCumulativeReward = arbVestingData.gmxVester.transferredCumulativeReward
    const nextTransferredCumulativeReward = transferredCumulativeReward.add(amount)

    let nextTransferredAverageStakedAmount = transferredAverageStakedAmount.mul(arbVestingData.gmxVester.transferredCumulativeReward).div(nextTransferredCumulativeReward)
    nextTransferredAverageStakedAmount = nextTransferredAverageStakedAmount.add(stakeAmount.mul(amount).div(nextTransferredCumulativeReward))

    const cumulativeReward = arbVestingData.gmxVester.cumulativeReward
    const nextTotalCumulativeReward = cumulativeReward.add(nextTransferredCumulativeReward)
    const averageStakedAmount = arbVestingData.gmxVester.averageStakedAmount
    let nextCombinedAverageStakedAmount = averageStakedAmount.mul(cumulativeReward).div(nextTotalCumulativeReward)
    nextCombinedAverageStakedAmount = nextCombinedAverageStakedAmount.add(nextTransferredAverageStakedAmount.mul(nextTransferredCumulativeReward).div(nextTotalCumulativeReward))

    nextRatio = nextCombinedAverageStakedAmount.mul(ratioMultiplier).div(nextMaxVestableEsGmx)
  }

  return(
    <div className="ClaimEsGmx Page page-layout">
      <div className="Page-title-section mt-0">
        <div className="Page-title">Claim esGMX</div>
        {!isArbitrum && <div className="Page-description">
          <br/>
          Please switch your network to Arbitrum.
        </div>}
        {isArbitrum && <div>
          <div className="Page-description">
            <br/>
            You have {formatAmount(esGmxIouBalance, 18, 2, true)} esGMX (IOU) tokens.<br/>
            <br/>
            The address of the esGMX (IOU) token is {esGmxIouAddress}.<br/>
            The esGMX (IOU) token is transferrable. You can add the token to your wallet and send it to another address to claim if you'd like.<br/>
            If you'd like to split the tokens across multiple vesting options, you could temporarily send the esGMX (IOU) tokens to a different account, claim, then transfer the tokens back.
            <br/>
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
          <br/>
          <div className="muted">
            You can currently vest a maximum of {formatAmount(currentMaxVestableEsGmx, 18, 2, true)} esGMX tokens at a ratio of {formatAmount(currentRatio, 4, 2, true)} staked GMX to 1 esGMX.<br/>
            After claiming you will be able to vest a maximum of {formatAmount(nextMaxVestableEsGmx, 18, 2, true)} esGMX at a ratio of {formatAmount(nextRatio, 4, 2, true)} staked GMX to 1 esGMX.
          </div>
          <br/>
          <div>
            <button className="App-cta Exchange-swap-button">
              Claim
            </button>
          </div>
        </div>}
      </div>
    </div>
  )
}
