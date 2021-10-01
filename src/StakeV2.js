import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useWeb3React } from '@web3-react/core'
import { Pool } from '@uniswap/v3-sdk'
import { Token as UniToken } from '@uniswap/sdk-core'

import Modal from './components/Modal/Modal'
import Tooltip from './components/Tooltip/Tooltip'
import Footer from "./Footer"

import Vault from './abis/Vault.json'
import Reader from './abis/Reader.json'
import RewardRouter from './abis/RewardRouter.json'
import RewardReader from './abis/RewardReader.json'
import Token from './abis/Token.json'
import MintableBaseToken from './abis/MintableBaseToken.json'
import GlpManager from './abis/GlpManager.json'
import UniPool from './abis/UniPool.json'

import { ethers } from 'ethers'
import {
  bigNumberify,
  fetcher,
  formatAmount,
  formatKeyAmount,
  formatAmountFree,
  expandDecimals,
  parseValue,
  approveTokens,
  getConnectWalletHandler,
  switchNetwork,
  ARBITRUM,
  GLP_DECIMALS,
  USD_DECIMALS,
  BASIS_POINTS_DIVISOR,
  SECONDS_PER_YEAR
} from './Helpers'
import { callContract } from './Api'
import { BONUS_LIST, GLP_LIST } from "./data/BonusEsGmx"

import useSWR from 'swr'

import { getContract } from './Addresses'

import './StakeV2.css';

const { AddressZero } = ethers.constants

function getBalanceAndSupplyData(balances) {
  if (!balances || balances.length === 0) {
    return {}
  }

  const keys = ["gmx", "esGmx", "glp", "stakedGmxTracker"]
  const balanceData = {}
  const supplyData = {}
  const propsLength = 2

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    balanceData[key] = balances[i * propsLength]
    supplyData[key] = balances[i * propsLength + 1]
  }

  return { balanceData, supplyData }
}

function getDepositBalanceData(depositBalances) {
  if (!depositBalances || depositBalances.length === 0) {
    return
  }

  const keys = ["gmxInStakedGmx", "esGmxInStakedGmx", "stakedGmxInBonusGmx", "bonusGmxInFeeGmx", "bnGmxInFeeGmx", "glpInStakedGlp"]
  const data = {}

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    data[key] = depositBalances[i]
  }

  return data
}

function getStakingData(stakingInfo) {
  if (!stakingInfo || stakingInfo.length === 0) {
    return
  }

  const keys = ["stakedGmxTracker", "bonusGmxTracker", "feeGmxTracker", "stakedGlpTracker", "feeGlpTracker"]
  const data = {}
  const propsLength = 5

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    data[key] = {
      claimable: stakingInfo[i * propsLength],
      tokensPerInterval: stakingInfo[i * propsLength + 1],
      averageStakedAmounts: stakingInfo[i * propsLength + 2],
      cumulativeRewards: stakingInfo[i * propsLength + 3],
      totalSupply: stakingInfo[i * propsLength + 4]
    }
  }

  return data
}

function getProcessedData(balanceData, supplyData, depositBalanceData, stakingData, aum, nativeTokenPrice, stakedGmxSupply, gmxPrice) {
  if (!balanceData || !supplyData || !depositBalanceData || !stakingData || !aum || !nativeTokenPrice || !stakedGmxSupply || !gmxPrice) {
    return {}
  }


  const data = {}

  data.gmxBalance = balanceData.gmx
  data.gmxBalanceUsd = balanceData.gmx.mul(gmxPrice).div(expandDecimals(1, 18))

  let gmxSupply = bigNumberify("6500429318655280000000001")
  data.gmxSupply = gmxSupply

  data.gmxSupplyUsd = supplyData.gmx.mul(gmxPrice).div(expandDecimals(1, 18))
  data.stakedGmxSupply = stakedGmxSupply
  data.stakedGmxSupplyUsd = stakedGmxSupply.mul(gmxPrice).div(expandDecimals(1, 18))
  data.gmxInStakedGmx = depositBalanceData.gmxInStakedGmx
  data.gmxInStakedGmxUsd = depositBalanceData.gmxInStakedGmx.mul(gmxPrice).div(expandDecimals(1, 18))

  data.esGmxBalance = balanceData.esGmx
  data.esGmxBalanceUsd = balanceData.esGmx.mul(gmxPrice).div(expandDecimals(1, 18))

  data.stakedGmxTrackerSupply = supplyData.stakedGmxTracker
  data.stakedEsGmxSupply = data.stakedGmxTrackerSupply.sub(data.stakedGmxSupply)
  data.stakedEsGmxSupplyUsd = data.stakedEsGmxSupply.mul(gmxPrice).div(expandDecimals(1, 18))

  data.esGmxInStakedGmx = depositBalanceData.esGmxInStakedGmx
  data.esGmxInStakedGmxUsd = depositBalanceData.esGmxInStakedGmx.mul(gmxPrice).div(expandDecimals(1, 18))

  data.bnGmxInFeeGmx = depositBalanceData.bnGmxInFeeGmx
  data.bonusGmxInFeeGmx = depositBalanceData.bonusGmxInFeeGmx
  data.feeGmxSupply = stakingData.feeGmxTracker.totalSupply
  data.feeGmxSupplyUsd = data.feeGmxSupply.mul(gmxPrice).div(expandDecimals(1, 18))

  data.stakedGmxTrackerRewards = stakingData.stakedGmxTracker.claimable
  data.stakedGmxTrackerRewardsUsd = stakingData.stakedGmxTracker.claimable.mul(gmxPrice).div(expandDecimals(1, 18))

  data.bonusGmxTrackerRewards = stakingData.bonusGmxTracker.claimable

  data.feeGmxTrackerRewards = stakingData.feeGmxTracker.claimable
  data.feeGmxTrackerRewardsUsd = stakingData.feeGmxTracker.claimable.mul(nativeTokenPrice).div(expandDecimals(1, 18))

  data.stakedGmxTrackerAnnualRewardsUsd = stakingData.stakedGmxTracker.tokensPerInterval.mul(SECONDS_PER_YEAR).mul(gmxPrice).div(expandDecimals(1, 18))
  data.gmxAprForEsGmx = data.stakedGmxTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(data.stakedGmxSupplyUsd)
  data.feeGmxTrackerAnnualRewardsUsd = stakingData.feeGmxTracker.tokensPerInterval.mul(SECONDS_PER_YEAR).mul(nativeTokenPrice).div(expandDecimals(1, 18))
  data.gmxAprForETH = data.feeGmxTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(data.feeGmxSupplyUsd)
  data.gmxAprTotal = data.gmxAprForETH.add(data.gmxAprForEsGmx)

  data.totalGmxRewardsUsd = data.stakedGmxTrackerRewardsUsd.add(data.feeGmxTrackerRewardsUsd)

  data.glpSupply = supplyData.glp
  data.glpPrice = aum.mul(expandDecimals(1, GLP_DECIMALS)).div(data.glpSupply)
  data.glpSupplyUsd = supplyData.glp.mul(data.glpPrice).div(expandDecimals(1, 18))

  data.glpBalance = depositBalanceData.glpInStakedGlp
  data.glpBalanceUsd = depositBalanceData.glpInStakedGlp.mul(data.glpPrice).div(expandDecimals(1, GLP_DECIMALS))

  data.stakedGlpTrackerRewards  = stakingData.stakedGlpTracker.claimable
  data.stakedGlpTrackerRewardsUsd = stakingData.stakedGlpTracker.claimable.mul(gmxPrice).div(expandDecimals(1, 18))

  data.feeGlpTrackerRewards = stakingData.feeGlpTracker.claimable
  data.feeGlpTrackerRewardsUsd = stakingData.feeGlpTracker.claimable.mul(nativeTokenPrice).div(expandDecimals(1, 18))

  data.stakedGlpTrackerAnnualRewardsUsd = stakingData.stakedGlpTracker.tokensPerInterval.mul(SECONDS_PER_YEAR).mul(gmxPrice).div(expandDecimals(1, 18))
  data.glpAprForEsGmx = data.stakedGlpTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(data.glpSupplyUsd)
  data.feeGlpTrackerAnnualRewardsUsd = stakingData.feeGlpTracker.tokensPerInterval.mul(SECONDS_PER_YEAR).mul(nativeTokenPrice).div(expandDecimals(1, 18))
  data.glpAprForETH = data.feeGlpTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(data.glpSupplyUsd)
  data.glpAprTotal = data.glpAprForETH.add(data.glpAprForEsGmx)

  data.totalGlpRewardsUsd = data.stakedGlpTrackerRewardsUsd.add(data.feeGlpTrackerRewardsUsd)

  data.totalEsGmxRewards = data.stakedGmxTrackerRewards.add(data.stakedGlpTrackerRewards)
  data.totalEsGmxRewardsUsd = data.stakedGmxTrackerRewardsUsd.add(data.stakedGlpTrackerRewardsUsd)

  data.totalETHRewards = data.feeGmxTrackerRewards.add(data.feeGlpTrackerRewards)
  data.totalETHRewardsUsd = data.feeGmxTrackerRewardsUsd.add(data.feeGlpTrackerRewardsUsd)

  data.totalRewardsUsd = data.totalEsGmxRewardsUsd.add(data.totalETHRewardsUsd)

  return data
}

function StakeModal(props) {
  const { isVisible, setIsVisible, chainId, title, maxAmount, value, setValue,
    active, account, library, stakingTokenSymbol, stakingTokenAddress,
    farmAddress, rewardRouterAddress, stakeMethodName, setPendingTxns } = props
  const [isStaking, setIsStaking] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  const { data: tokenAllowance, mutate: updateTokenAllowance } = useSWR([active, chainId, stakingTokenAddress, "allowance", account, farmAddress], {
    fetcher: fetcher(library, Token),
  })

  useEffect(() => {
    if (active) {
      library.on('block', () => {
        updateTokenAllowance(undefined, true)
      })
      return () => {
        library.removeAllListeners('block')
      }
    }
  }, [active, library, updateTokenAllowance])

  let amount = parseValue(value, 18)
  const needApproval = farmAddress !== AddressZero && tokenAllowance && amount && amount.gt(tokenAllowance)

  const getError = () => {
    if (!amount || amount.eq(0)) { return "Enter an amount" }
    if (maxAmount && amount.gt(maxAmount)) {
      return "Max amount exceeded"
    }
  }

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: stakingTokenAddress,
        spender: farmAddress,
        chainId
      })
      return
    }

    setIsStaking(true)
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner())

    callContract(chainId, contract, stakeMethodName, [amount], {
      sentMsg: "Stake submitted!",
      failMsg: "Stake failed.",
      setPendingTxns
    })
    .then(async (res) => {
      setIsVisible(false)
    })
    .finally(() => {
      setIsStaking(false)
    })
  }

  const isPrimaryEnabled = () => {
    const error = getError()
    if (error) { return false }
    if (isApproving) { return false }
    if (isStaking) { return false }
    return true
  }

  const getPrimaryText = () => {
    const error = getError()
    if (error) { return error }
    if (isApproving) { return `Approving ${stakingTokenSymbol}...` }
    if (needApproval) { return `Approve ${stakingTokenSymbol}` }
    if (isStaking) { return "Staking..." }
    return "Stake"
  }

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">
                Stake
              </div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}>Max: {formatAmount(maxAmount, 18, 4, true)}</div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input type="number" placeholder="0.0" className="Exchange-swap-input" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div className="PositionEditor-token-symbol">
              {stakingTokenSymbol}
            </div>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={ onClickPrimary } disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function UnstakeModal(props) {
  const { isVisible, setIsVisible, chainId, title,
    maxAmount, value, setValue, library, unstakingTokenSymbol,
    rewardRouterAddress, unstakeMethodName, multiplierPointsAmount,
    bonusGmxInFeeGmx, setPendingTxns } = props
  const [isUnstaking, setIsUnstaking] = useState(false)

  let amount = parseValue(value, 18)
  let burnAmount

  if (multiplierPointsAmount && multiplierPointsAmount.gt(0) && amount && amount.gt(0) && bonusGmxInFeeGmx && bonusGmxInFeeGmx.gt(0)) {
    burnAmount = multiplierPointsAmount.mul(amount).div(bonusGmxInFeeGmx)
  }

  const shouldShowReductionAmount = true
  let rewardReductionBasisPoints
  if (burnAmount && bonusGmxInFeeGmx) {
    rewardReductionBasisPoints = burnAmount.mul(BASIS_POINTS_DIVISOR).div(bonusGmxInFeeGmx)
  }

  const getError = () => {
    if (!amount) { return "Enter an amount" }
    if (amount.gt(maxAmount)) {
      return "Max amount exceeded"
    }
  }

  const onClickPrimary = () => {
    setIsUnstaking(true)
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner())
    callContract(chainId, contract, unstakeMethodName, [amount], {
      sentMsg: "Unstake submitted!",
      failMsg: "Unstake failed.",
      successMsg: "Unstake completed.",
      setPendingTxns
    })
    .then(async (res) => {
      setIsVisible(false)
    })
    .finally(() => {
      setIsUnstaking(false)
    })
  }

  const isPrimaryEnabled = () => {
    const error = getError()
    if (error) { return false }
    if (isUnstaking) { return false }
    return true
  }

  const getPrimaryText = () => {
    const error = getError()
    if (error) { return error }
    if (isUnstaking) { return "Unstaking..." }
    return "Unstake"
  }

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">
                Unstake
              </div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}>Max: {formatAmount(maxAmount, 18, 4, true)}</div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input type="number" placeholder="0.0" className="Exchange-swap-input" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div className="PositionEditor-token-symbol">
              {unstakingTokenSymbol}
            </div>
          </div>
        </div>
        {(burnAmount && burnAmount.gt(0) && rewardReductionBasisPoints && rewardReductionBasisPoints.gt(0)) && <div className="Modal-note">
          Unstaking will burn&nbsp;
          <a href="https://gmxio.gitbook.io/gmx/rewards" target="_blank" rel="noopener noreferrer">{formatAmount(burnAmount, 18, 4, true)} Multiplier Points</a>.&nbsp;
          {shouldShowReductionAmount && <span>Boost Percentage: -{formatAmount(rewardReductionBasisPoints, 2, 2)}%.</span>}
        </div>}
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={ onClickPrimary } disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function CompoundModal(props) {
  const { isVisible, setIsVisible, rewardRouterAddress, library, chainId, setPendingTxns } = props
  const [isCompounding, setIsCompounding] = useState(false)

  const isPrimaryEnabled = () => {
    return !isCompounding
  }

  const onClickPrimary = () => {
    setIsCompounding(true)

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner())
    callContract(chainId, contract, "compound", {
      sentMsg: "Compound submitted!",
      failMsg: "Compound failed.",
      successMsg: "Compound completed.",
      setPendingTxns
    })
    .then(async (res) => {
      setIsVisible(false)
    })
    .finally(() => {
      setIsCompounding(false)
    })
  }

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label="Compound Rewards">
        <div className="Modal-note">
          Compounding will claim and stake your Escrowed GMX and Multiplier Point rewards.<br/>
          <br/>
          If you do not wish to stake your Escrowed GMX rewards, you should click "Claim" first then "Compound".
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={ onClickPrimary } disabled={!isPrimaryEnabled()}>
            Confirm
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default function StakeV2({ setPendingTxns }) {
  const { active, library, account, activate } = useWeb3React()
  const chainId = 42161 // set chain to Arbitrum

  const bonusEsGmx = account ? BONUS_LIST[account.toLowerCase()] : undefined
  let glpForBonusEsGmx = account ? GLP_LIST[account.toLowerCase()] : undefined
  if (glpForBonusEsGmx) {
    glpForBonusEsGmx = parseFloat(glpForBonusEsGmx)
    if (glpForBonusEsGmx > 1.1) {
      glpForBonusEsGmx = glpForBonusEsGmx - 1
    }
  }

  const connectWallet = getConnectWalletHandler(activate)

  const [isBuyGmxModalVisible, setIsBuyGmxModalVisible] = useState(false)
  const [isStakeModalVisible, setIsStakeModalVisible] = useState(false)
  const [stakeModalTitle, setStakeModalTitle] = useState("")
  const [stakeModalMaxAmount, setStakeModalMaxAmount] = useState(undefined)
  const [stakeValue, setStakeValue] = useState("")
  const [stakingTokenSymbol, setStakingTokenSymbol] = useState("")
  const [stakingTokenAddress, setStakingTokenAddress] = useState("")
  const [stakingFarmAddress, setStakingFarmAddress] = useState("")
  const [stakeMethodName, setStakeMethodName] = useState("")

  const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false)
  const [unstakeModalTitle, setUnstakeModalTitle] = useState("")
  const [unstakeModalMaxAmount, setUnstakeModalMaxAmount] = useState(undefined)
  const [unstakeValue, setUnstakeValue] = useState("")
  const [unstakingTokenSymbol, setUnstakingTokenSymbol] = useState("")
  const [unstakeMethodName, setUnstakeMethodName] = useState("")

  const [isCompoundModalVisible, setIsCompoundModalVisible] = useState(false)

  const rewardRouterAddress = getContract(chainId, "RewardRouter")
  const rewardReaderAddress = getContract(chainId, "RewardReader")
  const readerAddress = getContract(chainId, "Reader")

  const vaultAddress = getContract(chainId, "Vault")
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN")
  const gmxAddress = getContract(chainId, "GMX")
  const esGmxAddress = getContract(chainId, "ES_GMX")
  const bnGmxAddress = getContract(chainId, "BN_GMX")
  const glpAddress = getContract(chainId, "GLP")

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker")
  const bonusGmxTrackerAddress = getContract(chainId, "BonusGmxTracker")
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker")

  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker")
  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker")

  const glpManagerAddress = getContract(chainId, "GlpManager")

  const stakedGmxDistributorAddress = getContract(chainId, "StakedGmxDistributor")
  const stakedGlpDistributorAddress = getContract(chainId, "StakedGlpDistributor")
  const excludedEsGmxAccounts = [stakedGmxDistributorAddress, stakedGlpDistributorAddress]

  const walletTokens = [gmxAddress, esGmxAddress, glpAddress, stakedGmxTrackerAddress]
  const depositTokens = [
    gmxAddress,
    esGmxAddress,
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    bnGmxAddress,
    glpAddress
  ]
  const rewardTrackersForDepositBalances = [
    stakedGmxTrackerAddress,
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    feeGmxTrackerAddress,
    feeGmxTrackerAddress,
    feeGlpTrackerAddress
  ]
  const rewardTrackersForStakingInfo = [
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    feeGmxTrackerAddress,
    stakedGlpTrackerAddress,
    feeGlpTrackerAddress
  ]

  const { data: walletBalances, mutate: updateWalletBalances } = useSWR(["StakeV2:walletBalances", chainId, readerAddress, "getTokenBalancesWithSupplies", account || AddressZero], {
    fetcher: fetcher(library, Reader, [walletTokens]),
  })

  const { data: depositBalances, mutate: updateDepositBalances } = useSWR(["StakeV2:depositBalances", chainId, rewardReaderAddress, "getDepositBalances", account || AddressZero], {
    fetcher: fetcher(library, RewardReader, [depositTokens, rewardTrackersForDepositBalances]),
  })

  const { data: stakingInfo, mutate: updateStakingInfo } = useSWR(["StakeV2:stakingInfo", chainId, rewardReaderAddress, "getStakingInfo", account || AddressZero], {
    fetcher: fetcher(library, RewardReader, [rewardTrackersForStakingInfo]),
  })

  const { data: stakedGmxSupply, mutate: updateStakedGmxSupply } = useSWR(["StakeV2:stakedGmxSupply", chainId, gmxAddress, "balanceOf", stakedGmxTrackerAddress], {
    fetcher: fetcher(library, Token),
  })

  const { data: aums, mutate: updateAums } = useSWR([`StakeV2:getAums:${active}`, chainId, glpManagerAddress, "getAums"], {
    fetcher: fetcher(library, GlpManager),
  })

  const { data: nativeTokenPrice, mutate: updateNativeTokenPrice } = useSWR([`StakeV2:nativeTokenPrice:${active}`, chainId, vaultAddress, "getMinPrice", nativeTokenAddress], {
    fetcher: fetcher(library, Vault),
  })

  const { data: esGmxSupply, mutate: updateEsGmxSupply } = useSWR([`StakeV2:esGmxSupply:${active}`, chainId, readerAddress, "getTokenSupply", esGmxAddress], {
    fetcher: fetcher(library, Reader, [excludedEsGmxAccounts]),
  })

  const poolAddress = "0x80A9ae39310abf666A87C743d6ebBD0E8C42158E" // GMX/WETH

  const { data: uniPoolSlot0, mutate: updateUniPoolSlot0 } = useSWR([`StakeV2:uniPoolSlot0:${active}`, chainId, poolAddress, "slot0"], {
    fetcher: fetcher(library, UniPool),
  })

  const { data: isGmxInPrivateTransferMode, mutate: updateIsGmxInPrivateTransferMode } = useSWR([`StakeV2:isGmxInPrivateTransferMode:${active}`, chainId, gmxAddress, "inPrivateTransferMode"], {
    fetcher: fetcher(library, MintableBaseToken),
  })

  const isGmxTransferEnabled = isGmxInPrivateTransferMode === false

  let gmxPrice
  if (isGmxTransferEnabled) {
    if (uniPoolSlot0 && nativeTokenPrice) {
      const tokenA = new UniToken(chainId, nativeTokenAddress, 18, "SYMBOL", "NAME")
      const tokenB = new UniToken(chainId, gmxAddress, 18, "SYMBOL", "NAME")

      const pool = new Pool(
        tokenA, // tokenA
        tokenB, // tokenB
        10000, // fee
        uniPoolSlot0.sqrtPriceX96, // sqrtRatioX96
        1, // liquidity
        uniPoolSlot0.tick, // tickCurrent
        []
      )

      const poolTokenPrice = pool.priceOf(tokenB).toSignificant(6)
      const poolTokenPriceAmount = parseValue(poolTokenPrice, 18)
      gmxPrice = poolTokenPriceAmount.mul(nativeTokenPrice).div(expandDecimals(1, 18))
    }
  }

  let esGmxSupplyUsd
  if (esGmxSupply && gmxPrice) {
    esGmxSupplyUsd = esGmxSupply.mul(gmxPrice).div(expandDecimals(1, 18))
  }

  let aum
  if (aums && aums.length > 0) {
    aum = aums[0].add(aums[1]).div(2)
  }

  const { balanceData, supplyData } = getBalanceAndSupplyData(walletBalances)
  const depositBalanceData = getDepositBalanceData(depositBalances)
  const stakingData = getStakingData(stakingInfo)
  const processedData = getProcessedData(balanceData, supplyData, depositBalanceData, stakingData, aum, nativeTokenPrice, stakedGmxSupply, gmxPrice)

  let hasMultiplierPoints = false
  let multiplierPointsAmount
  if (processedData && processedData.bonusGmxTrackerRewards && processedData.bnGmxInFeeGmx) {
    multiplierPointsAmount = processedData.bonusGmxTrackerRewards.add(processedData.bnGmxInFeeGmx)
    if (multiplierPointsAmount.gt(0)) {
      hasMultiplierPoints = true
    }
  }
  let totalRewardTokens
  if (processedData && processedData.bnGmxInFeeGmx && processedData.bonusGmxInFeeGmx) {
    totalRewardTokens = processedData.bnGmxInFeeGmx.add(processedData.bonusGmxInFeeGmx)
  }

  let totalRewardTokensAndGlp
  if (totalRewardTokens && processedData && processedData.glpBalance) {
    totalRewardTokensAndGlp = totalRewardTokens.add(processedData.glpBalance)
  }

  const bonusGmxInFeeGmx = processedData ? processedData.bonusGmxInFeeGmx : undefined

  let boostBasisPoints = bigNumberify(0)
  if (processedData && processedData.bnGmxInFeeGmx && processedData.bonusGmxInFeeGmx && processedData.bonusGmxInFeeGmx.gt(0)) {
    boostBasisPoints = processedData.bnGmxInFeeGmx.mul(BASIS_POINTS_DIVISOR).div(processedData.bonusGmxInFeeGmx)
  }

  let stakedGmxSupplyUsd
  if (stakedGmxSupply && gmxPrice) {
    stakedGmxSupplyUsd = stakedGmxSupply.mul(gmxPrice).div(expandDecimals(1, 18))
  }

  useEffect(() => {
    if (active) {
      library.on('block', () => {
        updateWalletBalances(undefined, true)
        updateDepositBalances(undefined, true)
        updateStakingInfo(undefined, true)
        updateAums(undefined, true)
        updateNativeTokenPrice(undefined, true)
        updateStakedGmxSupply(undefined, true)
        updateEsGmxSupply(undefined, true)
        updateUniPoolSlot0(undefined, true)
        updateIsGmxInPrivateTransferMode(undefined, true)
      })
      return () => {
        library.removeAllListeners('block')
      }
    }
  }, [library, active, updateWalletBalances, updateDepositBalances,
      updateStakingInfo, updateAums, updateNativeTokenPrice,
      updateStakedGmxSupply, updateEsGmxSupply, updateUniPoolSlot0,
      updateIsGmxInPrivateTransferMode])

  const showStakeGmxModal = () => {
    if (!isGmxTransferEnabled) {
      toast.error("GMX transfers not yet enabled")
      return
    }

    setIsStakeModalVisible(true)
    setStakeModalTitle("Stake GMX")
    setStakeModalMaxAmount(processedData.gmxBalance)
    setStakeValue("")
    setStakingTokenSymbol("GMX")
    setStakingTokenAddress(gmxAddress)
    setStakingFarmAddress(stakedGmxTrackerAddress)
    setStakeMethodName("stakeGmx")
  }

  const showStakeEsGmxModal = () => {
    setIsStakeModalVisible(true)
    setStakeModalTitle("Stake esGMX")
    setStakeModalMaxAmount(processedData.esGmxBalance)
    setStakeValue("")
    setStakingTokenSymbol("esGMX")
    setStakingTokenAddress(esGmxAddress)
    setStakingFarmAddress(AddressZero)
    setStakeMethodName("stakeEsGmx")
  }

  const showUnstakeGmxModal = () => {
    if (!isGmxTransferEnabled) {
      toast.error("GMX transfers not yet enabled")
      return
    }
    setIsUnstakeModalVisible(true)
    setUnstakeModalTitle("Unstake GMX")
    setUnstakeModalMaxAmount(processedData.gmxInStakedGmx)
    setUnstakeValue("")
    setUnstakingTokenSymbol("GMX")
    setUnstakeMethodName("unstakeGmx")
  }

  const showUnstakeEsGmxModal = () => {
    setIsUnstakeModalVisible(true)
    setUnstakeModalTitle("Unstake esGMX")
    setUnstakeModalMaxAmount(processedData.esGmxInStakedGmx)
    setUnstakeValue("")
    setUnstakingTokenSymbol("esGMX")
    setUnstakeMethodName("unstakeEsGmx")
  }

  const renderMultiplierPointsLabel = useCallback(() => {
    return "Multiplier Points APR"
  }, [])

  const renderMultiplierPointsValue = useCallback(() => {
    return (
      <Tooltip handle={`100.00%`} position="right-bottom">
        Boost your rewards with Multiplier Points.&nbsp;
        <a href="https://gmxio.gitbook.io/gmx/rewards#multiplier-points" rel="noreferrer" target="_blank">More info</a>.
      </Tooltip>
    )
  }, [])

  const claim = () => {
    if (!active || !account) {
      toast.error("Wallet not connected")
      return
    }
    if (!processedData || !processedData.totalRewardsUsd || processedData.totalRewardsUsd.eq(0)) {
      toast.error("No rewards to claim yet")
      return
    }

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner())
    callContract(chainId, contract, "claim", {
      sentMsg: "Claim submitted!",
      failMsg: "Claim failed.",
      successMsg: "Claim completed.",
      setPendingTxns
    })
  }

  let earnMsg
  if (totalRewardTokens && totalRewardTokens.gt(0)) {
    let gmxAmountStr
    if (processedData.gmxInStakedGmx && processedData.gmxInStakedGmx.gt(0)) {
      gmxAmountStr = formatAmount(processedData.gmxInStakedGmx, 18, 2, true) + " GMX"
    }
    let esGmxAmountStr
    if (processedData.esGmxInStakedGmx && processedData.esGmxInStakedGmx.gt(0)) {
      esGmxAmountStr = formatAmount(processedData.esGmxInStakedGmx, 18, 2, true) + " esGMX"
    }
    let mpAmountStr
    if (processedData.bonusGmxInFeeGmx && processedData.bnGmxInFeeGmx.gt(0)) {
      mpAmountStr = formatAmount(processedData.bnGmxInFeeGmx, 18, 2, true) + " MP"
    }
    let glpStr
    if (processedData.glpBalance && processedData.glpBalance.gt(0)) {
      glpStr = formatAmount(processedData.glpBalance, 18, 2, true) + " GLP"
    }
    const amountStr = [gmxAmountStr, esGmxAmountStr, mpAmountStr, glpStr].filter(s => s).join(", ")
    earnMsg = <div>You are earning ETH rewards with {formatAmount(totalRewardTokensAndGlp, 18, 2, true)} tokens.<br/>Tokens: {amountStr}.</div>
  }

  const onNetworkClick = evt => {
    evt.preventDefault()
    switchNetwork(ARBITRUM)
  }

  return (
    <div className="StakeV2 Page">
      <StakeModal
        isVisible={isStakeModalVisible}
        setIsVisible={setIsStakeModalVisible}
        chainId={chainId}
        title={stakeModalTitle}
        maxAmount={stakeModalMaxAmount}
        value={stakeValue}
        setValue={setStakeValue}
        active={active}
        account={account}
        library={library}
        stakingTokenSymbol={stakingTokenSymbol}
        stakingTokenAddress={stakingTokenAddress}
        farmAddress={stakingFarmAddress}
        rewardRouterAddress={rewardRouterAddress}
        stakeMethodName={stakeMethodName}
        hasMultiplierPoints={hasMultiplierPoints}
        setPendingTxns={setPendingTxns}
      />
      <UnstakeModal
        setPendingTxns={setPendingTxns}
        isVisible={isUnstakeModalVisible}
        setIsVisible={setIsUnstakeModalVisible}
        chainId={chainId}
        title={unstakeModalTitle}
        maxAmount={unstakeModalMaxAmount}
        value={unstakeValue}
        setValue={setUnstakeValue}
        library={library}
        unstakingTokenSymbol={unstakingTokenSymbol}
        rewardRouterAddress={rewardRouterAddress}
        unstakeMethodName={unstakeMethodName}
        multiplierPointsAmount={multiplierPointsAmount}
        bonusGmxInFeeGmx={bonusGmxInFeeGmx}
      />
      <CompoundModal
        setPendingTxns={setPendingTxns}
        isVisible={isCompoundModalVisible}
        setIsVisible={setIsCompoundModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        library={library}
        account={account}
        chainId={chainId}
      />
      <Modal isVisible={isBuyGmxModalVisible} setIsVisible={setIsBuyGmxModalVisible} className="StakeV2-buy-gmx-modal" label="To Buy GMX">
        <p>
          1. Transfer ETH to Arbitrum using the <a href="https://bridge.arbitrum.io/" target="_blank" rel="noreferrer">Arbitrum Bridge</a>.
        </p>
        <p>
          2. <a href="/" onClick={onNetworkClick}>Click here</a> to ensure your wallet is connected to the Arbitrum network.
        </p>
        <p>
          3. Buy GMX on <a href="https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" target="_blank" rel="noreferrer">Uniswap</a>.
        </p>
        <p>
          For more info: <a href="https://gmxio.gitbook.io/gmx/tokenomics" target="_blank" rel="noreferrer">https://gmxio.gitbook.io/gmx/tokenomics</a>.
        </p>
      </Modal>
      <div className="Page-title-section">
        <div className="Page-title">Earn</div>
        <div className="Page-description">
          Stake <a href="https://gmxio.gitbook.io/gmx/tokenomics" target="_blank" rel="noopener noreferrer">
            GMX
          </a> and <a href="https://gmxio.gitbook.io/gmx/glp" target="_blank" rel="noopener noreferrer">
            GLP
          </a> to earn rewards.
        </div>
        {earnMsg && <div className="Page-description">{earnMsg}</div>}
        {bonusEsGmx && <div className="Page-description">
          You have a pending bonus of&nbsp;
          <Tooltip handle={`${parseFloat(bonusEsGmx).toFixed(2)} Escrowed GMX`} position="right-bottom">
            To qualify for this bonus, you must hold {parseFloat(glpForBonusEsGmx).toFixed(2)} GLP or more in your account for at least 25 of the 30 days from 01 Sep 2021 to 30 Sep 2021.
          </Tooltip>.
        </div>}
      </div>
      <div className="StakeV2-content">
        <div className="StakeV2-cards">
          <div className="App-card StakeV2-gmx-card">
            <div className="App-card-title">GMX</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Price</div>
                <div>
                  ${formatAmount(gmxPrice, USD_DECIMALS, 2, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Wallet</div>
                <div>
                  {formatKeyAmount(processedData, "gmxBalance", 18, 2, true)} GMX (${formatKeyAmount(processedData, "gmxBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked</div>
                <div>
                  {formatKeyAmount(processedData, "gmxInStakedGmx", 18, 2, true)} GMX (${formatKeyAmount(processedData, "gmxInStakedGmxUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">APR</div>
                <div>
                  <Tooltip handle={`${formatKeyAmount(processedData, "gmxAprTotal", 2, 2, true)}%`} position="right-bottom">
                    <div className="Tooltip-row">
                      <span className="label">ETH (WETH) APR</span>
                      <span>{formatKeyAmount(processedData, "gmxAprForETH", 2, 2, true)}%</span>
                    </div>
                    <div className="Tooltip-row">
                      <span className="label">Escrowed GMX APR</span>
                      <span>{formatKeyAmount(processedData, "gmxAprForEsGmx", 2, 2, true)}%</span>
                    </div>
                  </Tooltip>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Rewards</div>
                <div>
                  <Tooltip handle={`$${formatKeyAmount(processedData, "totalGmxRewardsUsd", USD_DECIMALS, 2, true)}`} position="right-bottom">
                    <div className="Tooltip-row">
                      <span className="label">ETH (WETH)</span>
                      <span>{formatKeyAmount(processedData, "feeGmxTrackerRewards", 18, 4)} (${formatKeyAmount(processedData, "feeGmxTrackerRewardsUsd", USD_DECIMALS, 2, true)})</span>
                    </div>
                    <div className="Tooltip-row">
                      <span className="label">Escrowed GMX</span>
                      <span>{formatKeyAmount(processedData, "stakedGmxTrackerRewards", 18, 4)} (${formatKeyAmount(processedData, "stakedGmxTrackerRewardsUsd", USD_DECIMALS, 2, true)})</span>
                    </div>
                  </Tooltip>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  {renderMultiplierPointsLabel()}
                </div>
                <div>
                  {renderMultiplierPointsValue()}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  Boost Percentage
                </div>
                <div>
                  <Tooltip handle={`${formatAmount(boostBasisPoints, 2, 2, false)}%`} position="right-bottom">
                    You are earning {formatAmount(boostBasisPoints, 2, 2, false)}% more ETH rewards using {formatAmount(processedData.bnGmxInFeeGmx, 18, 4, 2, true)} Staked Multiplier Points.<br/>
                    <br/>
                    Use the "Compound" button to stake your Multiplier Points.
                  </Tooltip>
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">Total Staked</div>
                <div>
                  {formatAmount(stakedGmxSupply, 18, 0, true)} GMX (${formatAmount(stakedGmxSupplyUsd, USD_DECIMALS, 0, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Supply</div>
                <div>
                  {formatKeyAmount(processedData, "gmxSupply", 18, 0, true)} GMX (${formatKeyAmount(processedData, "gmxSupplyUsd", USD_DECIMALS, 0, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-options">
                <button className="App-button-option App-card-option" onClick={() => setIsBuyGmxModalVisible(true)}>Buy GMX</button>
                {active && <button className="App-button-option App-card-option" onClick={() => showStakeGmxModal()}>Stake</button>}
                {active && <button className="App-button-option App-card-option" onClick={() => showUnstakeGmxModal()}>Unstake</button>}
              </div>
            </div>
          </div>
          <div className="App-card primary StakeV2-total-rewards-card">
            <div className="App-card-title">Total Rewards</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">ETH (WETH)</div>
                <div>
                  {formatKeyAmount(processedData, "totalETHRewards", 18, 4, true)} (${formatKeyAmount(processedData, "totalETHRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Escrowed GMX</div>
                <div>
                  {formatKeyAmount(processedData, "totalEsGmxRewards", 18, 4, true)} (${formatKeyAmount(processedData, "totalEsGmxRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Multiplier Points</div>
                <div>
                  {formatKeyAmount(processedData, "bonusGmxTrackerRewards", 18, 4, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked Multiplier Points</div>
                <div>
                  {formatKeyAmount(processedData, "bnGmxInFeeGmx", 18, 4, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total</div>
                <div>
                  ${formatKeyAmount(processedData, "totalRewardsUsd", USD_DECIMALS, 2, true)}
                </div>
              </div>
              <div className="App-card-bottom-placeholder">
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {active && <button className="App-button-option App-card-option">Compound</button>}
                  {active && <button className="App-button-option App-card-option">Claim</button>}
                  {!active && <button className="App-button-option App-card-option">Connect Wallet</button>}
                </div>
              </div>
              <div className="App-card-bottom">
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {active && <button className="App-button-option App-card-option" onClick={() => setIsCompoundModalVisible(true)}>Compound</button>}
                  {active && <button className="App-button-option App-card-option" onClick={() => claim()}>Claim</button>}
                  {!active && <button className="App-button-option App-card-option" onClick={() => connectWallet()}>Connect Wallet</button>}
                </div>
              </div>
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">GLP</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Price</div>
                <div>
                  ${formatKeyAmount(processedData, "glpPrice", USD_DECIMALS, 2, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Wallet</div>
                <div>
                  {formatKeyAmount(processedData, "glpBalance", GLP_DECIMALS, 2, true)} GLP (${formatKeyAmount(processedData, "glpBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked</div>
                <div>
                  {formatKeyAmount(processedData, "glpBalance", GLP_DECIMALS, 2, true)} GLP (${formatKeyAmount(processedData, "glpBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">APR</div>
                <div>
                  <Tooltip handle={`${formatKeyAmount(processedData, "glpAprTotal", 2, 2, true)}%`} position="right-bottom">
                    <div className="Tooltip-row">
                      <span className="label">ETH (WETH) APR</span>
                      <span>{formatKeyAmount(processedData, "glpAprForETH", 2, 2, true)}%</span>
                    </div>
                    <div className="Tooltip-row">
                      <span className="label">Escrowed GMX APR</span>
                      <span>{formatKeyAmount(processedData, "glpAprForEsGmx", 2, 2, true)}%</span>
                    </div>
                  </Tooltip>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Rewards</div>
                <div>
                  <Tooltip handle={`$${formatKeyAmount(processedData, "totalGlpRewardsUsd", USD_DECIMALS, 2, true)}`} position="right-bottom">
                    <div className="Tooltip-row">
                      <span className="label">ETH (WETH)</span>
                      <span>{formatKeyAmount(processedData, "feeGlpTrackerRewards", 18, 4)} (${formatKeyAmount(processedData, "feeGlpTrackerRewardsUsd", USD_DECIMALS, 2, true)})</span>
                    </div>
                    <div className="Tooltip-row">
                      <span className="label">Escrowed GMX</span>
                      <span>{formatKeyAmount(processedData, "stakedGlpTrackerRewards", 18, 4)} (${formatKeyAmount(processedData, "stakedGlpTrackerRewardsUsd", USD_DECIMALS, 2, true)})</span>
                    </div>
                  </Tooltip>
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">Total Staked</div>
                <div>
                  {formatKeyAmount(processedData, "glpSupply", 18, 2, true)} GLP (${formatKeyAmount(processedData, "glpSupplyUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Supply</div>
                <div>
                  {formatKeyAmount(processedData, "glpSupply", 18, 2, true)} GLP (${formatKeyAmount(processedData, "glpSupplyUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-options">
                <Link className="App-button-option App-card-option" to="/buy_glp">Buy GLP</Link>
                <Link className="App-button-option App-card-option" to="/sell_glp">Sell GLP</Link>
              </div>
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">Escrowed GMX</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Price</div>
                <div>
                  ${formatAmount(gmxPrice, USD_DECIMALS, 2, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Wallet</div>
                <div>
                  {formatKeyAmount(processedData, "esGmxBalance", 18, 2, true)} esGMX (${formatKeyAmount(processedData, "esGmxBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Staked</div>
                <div>
                  {formatKeyAmount(processedData, "esGmxInStakedGmx", 18, 2, true)} esGMX (${formatKeyAmount(processedData, "esGmxInStakedGmxUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">APR</div>
                <div>
                  <div>
                    <Tooltip handle={`${formatKeyAmount(processedData, "gmxAprTotal", 2, 2, true)}%`} position="right-bottom">
                      <div className="Tooltip-row">
                        <span className="label">ETH (WETH) APR</span>
                        <span>{formatKeyAmount(processedData, "gmxAprForETH", 2, 2, true)}%</span>
                      </div>
                      <div className="Tooltip-row">
                        <span className="label">Escrowed GMX APR</span>
                        <span>{formatKeyAmount(processedData, "gmxAprForEsGmx", 2, 2, true)}%</span>
                      </div>
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  {renderMultiplierPointsLabel()}
                </div>
                <div>
                  {renderMultiplierPointsValue()}
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">Total Staked</div>
                <div>
                  {formatKeyAmount(processedData, "stakedEsGmxSupply", 18, 0, true)} esGMX (${formatKeyAmount(processedData, "stakedEsGmxSupplyUsd", USD_DECIMALS, 0, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Supply</div>
                <div>
                  {formatAmount(esGmxSupply, 18, 0, true)} esGMX (${formatAmount(esGmxSupplyUsd, USD_DECIMALS, 0, true)})
                </div>
              </div>

              <div className="App-card-divider"></div>
              <div className="App-card-options">
                {active && <button className="App-button-option App-card-option" onClick={() => showStakeEsGmxModal()}>Stake</button>}
                {active && <button className="App-button-option App-card-option" onClick={() => showUnstakeEsGmxModal()}>Unstake</button>}
                {!active && <button className="App-button-option App-card-option" onClick={() => connectWallet()}>Connect Wallet</button>}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
