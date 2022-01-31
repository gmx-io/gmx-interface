import React from 'react'

import useSWR from 'swr'

import {
  getServerUrl,
  fetcher,
  formatKeyAmount,
  getBalanceAndSupplyData,
  getDepositBalanceData,
  getVestingData,
  getStakingData,
  getProcessedData
} from '../../Helpers'

import Vault from '../../abis/Vault.json'
import ReaderV2 from '../../abis/ReaderV2.json'
import RewardReader from '../../abis/RewardReader.json'
import Token from '../../abis/Token.json'
import GlpManager from '../../abis/GlpManager.json'

import { useWeb3React } from '@web3-react/core'

import { useGmxPrice } from "../../Api"

import { getContract } from '../../Addresses'

import { ethers } from 'ethers'
const { AddressZero } = ethers.constants

export default function APRLabel ({chainId, label}) {
  const { library } = useWeb3React()

  const active = false
  const account = undefined

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

  const gmxVesterAddress = getContract(chainId, "GmxVester")
  const glpVesterAddress = getContract(chainId, "GlpVester")

  const vesterAddresses = [gmxVesterAddress, glpVesterAddress]

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

  const { data: walletBalances } = useSWR(["StakeV2:walletBalances", chainId, readerAddress, "getTokenBalancesWithSupplies", account || AddressZero], {
    fetcher: fetcher(library, ReaderV2, [walletTokens]),
  })

  const { data: depositBalances } = useSWR(["StakeV2:depositBalances", chainId, rewardReaderAddress, "getDepositBalances", account || AddressZero], {
    fetcher: fetcher(library, RewardReader, [depositTokens, rewardTrackersForDepositBalances]),
  })

  const { data: stakingInfo } = useSWR(["StakeV2:stakingInfo", chainId, rewardReaderAddress, "getStakingInfo", account || AddressZero], {
    fetcher: fetcher(library, RewardReader, [rewardTrackersForStakingInfo]),
  })

  const { data: stakedGmxSupply } = useSWR(["StakeV2:stakedGmxSupply", chainId, gmxAddress, "balanceOf", stakedGmxTrackerAddress], {
    fetcher: fetcher(library, Token),
  })

  const { data: aums } = useSWR([`StakeV2:getAums:${active}`, chainId, glpManagerAddress, "getAums"], {
    fetcher: fetcher(library, GlpManager),
  })

  const { data: nativeTokenPrice } = useSWR([`StakeV2:nativeTokenPrice:${active}`, chainId, vaultAddress, "getMinPrice", nativeTokenAddress], {
    fetcher: fetcher(library, Vault),
  })

  const { data: vestingInfo } = useSWR([`StakeV2:vestingInfo:${active}`, chainId, readerAddress, "getVestingInfo", account || AddressZero], {
    fetcher: fetcher(library, ReaderV2, [vesterAddresses]),
  })

  const { gmxPrice } = useGmxPrice(chainId)

  const gmxSupplyUrl = getServerUrl(chainId, "/gmx_supply")
  const { data: gmxSupply } = useSWR([gmxSupplyUrl], {
    fetcher: (...args) => fetch(...args).then(res => res.text())
  })

  let aum
  if (aums && aums.length > 0) {
    aum = aums[0].add(aums[1]).div(2)
  }

  const { balanceData, supplyData } = getBalanceAndSupplyData(walletBalances)
  const depositBalanceData = getDepositBalanceData(depositBalances)
  const stakingData = getStakingData(stakingInfo)
  const vestingData = getVestingData(vestingInfo)

  const processedData = getProcessedData(balanceData, supplyData, depositBalanceData, stakingData, vestingData, aum, nativeTokenPrice, stakedGmxSupply, gmxPrice, gmxSupply)

  return <>{`${formatKeyAmount(processedData, label, 2, 2, true)}%`}</>
}