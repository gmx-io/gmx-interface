import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'

import { useWeb3React } from '@web3-react/core'
import useSWR from 'swr'
import { ethers } from 'ethers'

import { getToken, getTokens, getWhitelistedTokens, getWrappedToken, getNativeToken } from '../../data/Tokens'
import { getContract } from '../../Addresses'
import {
  helperToast,
  useLocalStorageByChainId,
  getInfoTokens,
  getTokenInfo,
  getChainName,
  useChainId,
  expandDecimals,
  fetcher,
  bigNumberify,
  formatAmount,
  formatAmountFree,
  formatKeyAmount,
  formatDateTime,
  getBuyGlpToAmount,
  getBuyGlpFromAmount,
  getSellGlpFromAmount,
  getSellGlpToAmount,
  parseValue,
  approveTokens,
  getUsd,
  adjustForDecimals,
  GLP_DECIMALS,
  USD_DECIMALS,
  BASIS_POINTS_DIVISOR,
  GLP_COOLDOWN_DURATION,
  SECONDS_PER_YEAR,
  USDG_DECIMALS,
  DEFAULT_MAX_USDG_AMOUNT
} from '../../Helpers'

import { callContract, useGmxPrice } from '../../Api'

import TokenSelector from '../Exchange/TokenSelector'
import InputSection from "../InputSection/InputSection"
import Tooltip from '../Tooltip/Tooltip'
import Footer from "../../Footer"
import Modal from '../Modal/Modal'

import ReaderV2 from '../../abis/ReaderV2.json'
import RewardReader from '../../abis/RewardReader.json'
import VaultV2 from '../../abis/VaultV2.json'
import GlpManager from '../../abis/GlpManager.json'
import RewardTracker from '../../abis/RewardTracker.json'
import Vester from '../../abis/Vester.json'
import RewardRouter from '../../abis/RewardRouter.json'
import Token from '../../abis/Token.json'

import { FaAngleDown } from 'react-icons/fa'

import "./GlpSwap.css"

const { AddressZero } = ethers.constants

function getStakingData(stakingInfo) {
  if (!stakingInfo || stakingInfo.length === 0) {
    return
  }

  const keys = ["stakedGlpTracker", "feeGlpTracker"]
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

export default function GlpSwap(props) {
  const { savedSlippageAmount, isBuying, setPendingTxns, connectWallet } = props
  const swapLabel = isBuying ? "BuyGlp" : "SellGlp"
  const { active, library, account } = useWeb3React()
  const { chainId } = useChainId()
  const chainName = getChainName(chainId)
  const tokens = getTokens(chainId)
  const whitelistedTokens = getWhitelistedTokens(chainId)
  const tokenList = whitelistedTokens.filter(t => !t.isWrapped)
  const [swapValue, setSwapValue] = useState("")
  const [glpValue, setGlpValue] = useState("")
  const [swapTokenAddress, setSwapTokenAddress] = useLocalStorageByChainId(chainId, `${swapLabel}-swap-token-address`, AddressZero)
  const [isApproving, setIsApproving] = useState(false)
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [anchorOnSwapAmount, setAnchorOnSwapAmount] = useState(true)
  const [feeBasisPoints, setFeeBasisPoints] = useState("")
  const [modalError, setModalError] = useState(false)

  const readerAddress = getContract(chainId, "Reader")
  const rewardReaderAddress = getContract(chainId, "RewardReader")
  const vaultAddress = getContract(chainId, "Vault")
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN")
  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker")
  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker")
  const usdgAddress = getContract(chainId, "USDG")
  const glpManagerAddress = getContract(chainId, "GlpManager")
  const rewardRouterAddress = getContract(chainId, "RewardRouter")
  const tokensForBalanceAndSupplyQuery = [stakedGlpTrackerAddress, usdgAddress]

  const whitelistedTokenAddresses = whitelistedTokens.map(token => token.address)
  const { data: vaultTokenInfo, mutate: updateVaultTokenInfo } = useSWR([`GlpSwap:getVaultTokenInfo:${active}`, chainId, readerAddress, "getFullVaultTokenInfo"], {
    fetcher: fetcher(library, ReaderV2, [vaultAddress, nativeTokenAddress, expandDecimals(1, 18), whitelistedTokenAddresses]),
  })

  const tokenAddresses = tokens.map(token => token.address)
  const { data: tokenBalances, mutate: updateTokenBalances } = useSWR([`GlpSwap:getTokenBalances:${active}`, chainId, readerAddress, "getTokenBalances", account || AddressZero], {
    fetcher: fetcher(library, ReaderV2, [tokenAddresses]),
  })

  const { data: balancesAndSupplies, mutate: updateBalancesAndSupplies } = useSWR([`GlpSwap:getTokenBalancesWithSupplies:${active}`, chainId, readerAddress, "getTokenBalancesWithSupplies", account || AddressZero], {
    fetcher: fetcher(library, ReaderV2, [tokensForBalanceAndSupplyQuery]),
  })

  const { data: aums, mutate: updateAums } = useSWR([`GlpSwap:getAums:${active}`, chainId, glpManagerAddress, "getAums"], {
    fetcher: fetcher(library, GlpManager),
  })

  const { data: totalTokenWeights, mutate: updateTotalTokenWeights } = useSWR([`GlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"], {
    fetcher: fetcher(library, VaultV2),
  })

  const tokenAllowanceAddress = swapTokenAddress === AddressZero ? nativeTokenAddress : swapTokenAddress
  const { data: tokenAllowance, mutate: updateTokenAllowance } = useSWR([active, chainId, tokenAllowanceAddress, "allowance", account || AddressZero, glpManagerAddress], {
    fetcher: fetcher(library, Token),
  })

  const { data: lastPurchaseTime, mutate: updateLastPurchaseTime } = useSWR([`GlpSwap:lastPurchaseTime:${active}`, chainId, glpManagerAddress, "lastAddedAt", account || AddressZero], {
    fetcher: fetcher(library, GlpManager),
  })

  const { data: glpBalance, mutate: updateGlpBalance } = useSWR([`GlpSwap:glpBalance:${active}`, chainId, feeGlpTrackerAddress, "stakedAmounts", account || AddressZero], {
    fetcher: fetcher(library, RewardTracker),
  })

  const glpVesterAddress = getContract(chainId, "GlpVester")
  const { data: reservedAmount, mutate: updateReservedAmount } = useSWR([`GlpSwap:reservedAmount:${active}`, chainId, glpVesterAddress, "pairAmounts", account || AddressZero], {
    fetcher: fetcher(library, Vester),
  })

  const { data: gmxPrice, mutate: updateGmxPrice } = useGmxPrice()

  const rewardTrackersForStakingInfo = [
    stakedGlpTrackerAddress,
    feeGlpTrackerAddress
  ]
  const { data: stakingInfo, mutate: updateStakingInfo } = useSWR([`GlpSwap:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", account || AddressZero], {
    fetcher: fetcher(library, RewardReader, [rewardTrackersForStakingInfo]),
  })

  const stakingData = getStakingData(stakingInfo)

  const redemptionTime = lastPurchaseTime ? lastPurchaseTime.add(GLP_COOLDOWN_DURATION) : undefined
  const inCooldownWindow = redemptionTime && parseInt(Date.now() / 1000) < redemptionTime

  const glpSupply = balancesAndSupplies ? balancesAndSupplies[1] : bigNumberify(0)
  const usdgSupply = balancesAndSupplies ? balancesAndSupplies[3] : bigNumberify(0)
  let aum
  if (aums && aums.length > 0) {
    aum = isBuying ? aums[0] : aums[1]
  }
  const glpPrice = (aum && aum.gt(0) && glpSupply.gt(0)) ? aum.mul(expandDecimals(1, GLP_DECIMALS)).div(glpSupply) : expandDecimals(1, USD_DECIMALS)
  let glpBalanceUsd
  if (glpBalance) {
    glpBalanceUsd = glpBalance.mul(glpPrice).div(expandDecimals(1, GLP_DECIMALS))
  }
  const glpSupplyUsd = glpSupply.mul(glpPrice).div(expandDecimals(1, GLP_DECIMALS))

  let reserveAmountUsd
  if (reservedAmount) {
    reserveAmountUsd = reservedAmount.mul(glpPrice).div(expandDecimals(1, GLP_DECIMALS))
  }

  const infoTokens = getInfoTokens(tokens, tokenBalances, whitelistedTokens, vaultTokenInfo, undefined)
  const swapToken = getToken(chainId, swapTokenAddress)
  const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress)

  const swapTokenBalance = (swapTokenInfo && swapTokenInfo.balance) ? swapTokenInfo.balance : bigNumberify(0)

  const swapAmount = parseValue(swapValue, swapToken && swapToken.decimals)
  const glpAmount = parseValue(glpValue, GLP_DECIMALS)

  const needApproval = isBuying && swapTokenAddress !== AddressZero && tokenAllowance && swapAmount && swapAmount.gt(tokenAllowance)

  const swapUsdMin = getUsd(swapAmount, swapTokenAddress, false, infoTokens)
  const glpUsdMax = (glpAmount && glpPrice) ? glpAmount.mul(glpPrice).div(expandDecimals(1, GLP_DECIMALS)) : undefined

  const onSwapValueChange = (e) => {
    setAnchorOnSwapAmount(true)
    setSwapValue(e.target.value)
  }

  const onGlpValueChange = (e) => {
    setAnchorOnSwapAmount(false)
    setGlpValue(e.target.value)
  }

  const onSelectSwapToken = (token) => {
    setSwapTokenAddress(token.address)
    setIsWaitingForApproval(false)
  }

  const nativeToken = getTokenInfo(infoTokens, AddressZero)

  let totalApr = bigNumberify(0)

  let feeGlpTrackerAnnualRewardsUsd
  let feeGlpTrackerApr
  if (stakingData && stakingData.feeGlpTracker && stakingData.feeGlpTracker.tokensPerInterval && nativeToken && nativeToken.minPrice && glpSupplyUsd && glpSupplyUsd.gt(0)) {
    feeGlpTrackerAnnualRewardsUsd = stakingData.feeGlpTracker.tokensPerInterval.mul(SECONDS_PER_YEAR).mul(nativeToken.minPrice).div(expandDecimals(1, 18))
    feeGlpTrackerApr = feeGlpTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(glpSupplyUsd)
    totalApr = totalApr.add(feeGlpTrackerApr)
  }

  let stakedGlpTrackerAnnualRewardsUsd
  let stakedGlpTrackerApr

  if (gmxPrice && stakingData && stakingData.stakedGlpTracker && stakingData.stakedGlpTracker.tokensPerInterval && glpSupplyUsd && glpSupplyUsd.gt(0)) {
    stakedGlpTrackerAnnualRewardsUsd = stakingData.stakedGlpTracker.tokensPerInterval.mul(SECONDS_PER_YEAR).mul(gmxPrice).div(expandDecimals(1, 18))
    stakedGlpTrackerApr = stakedGlpTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(glpSupplyUsd)
    totalApr = totalApr.add(stakedGlpTrackerApr)
  }

  useEffect(() => {
    if (active) {
      library.on('block', () => {
        updateVaultTokenInfo(undefined, true)
        updateTokenBalances(undefined, true)
        updateBalancesAndSupplies(undefined, true)
        updateAums(undefined, true)
        updateTotalTokenWeights(undefined, true)
        updateTokenAllowance(undefined, true)
        updateLastPurchaseTime(undefined, true)
        updateStakingInfo(undefined, true)
        updateGmxPrice(undefined, true)
        updateReservedAmount(undefined, true)
        updateGlpBalance(undefined, true)
      })
      return () => {
        library.removeAllListeners('block')
      }
    }
  }, [active, library,  chainId,
      updateVaultTokenInfo, updateTokenBalances, updateBalancesAndSupplies,
      updateAums, updateTotalTokenWeights, updateTokenAllowance,
      updateLastPurchaseTime, updateStakingInfo, updateGmxPrice,
      updateReservedAmount, updateGlpBalance])

  useEffect(() => {
    const updateSwapAmounts = () => {
      if (anchorOnSwapAmount) {
        if (!swapAmount) {
          setGlpValue("")
          setFeeBasisPoints("")
          return
        }

        if (isBuying) {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getBuyGlpToAmount(swapAmount, swapTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights)
          const nextValue = formatAmountFree(nextAmount, GLP_DECIMALS, GLP_DECIMALS)
          setGlpValue(nextValue)
          setFeeBasisPoints(feeBps)
        } else {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getSellGlpFromAmount(swapAmount, swapTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights)
          const nextValue = formatAmountFree(nextAmount, GLP_DECIMALS, GLP_DECIMALS)
          setGlpValue(nextValue)
          setFeeBasisPoints(feeBps)
        }

        return
      }

      if (!glpAmount) {
        setSwapValue("")
        setFeeBasisPoints("")
        return
      }

      if(swapToken) {
        if (isBuying) {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getBuyGlpFromAmount(glpAmount, swapTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights)
          const nextValue = formatAmountFree(nextAmount, swapToken.decimals, swapToken.decimals)
          setSwapValue(nextValue)
          setFeeBasisPoints(feeBps)
        } else {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getSellGlpToAmount(glpAmount, swapTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights, true)

          const nextValue = formatAmountFree(nextAmount, swapToken.decimals, swapToken.decimals)
          setSwapValue(nextValue)
          setFeeBasisPoints(feeBps)
        }
      }
    }

    updateSwapAmounts()
  }, [isBuying, anchorOnSwapAmount, swapAmount,
      glpAmount, swapToken, swapTokenAddress,
      infoTokens, glpPrice, usdgSupply,
      totalTokenWeights])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const fillMaxAmount = () => {
    if (isBuying) {
      setAnchorOnSwapAmount(true)
      setSwapValue(formatAmountFree(swapTokenBalance, swapToken.decimals, swapToken.decimals))
      return
    }

    setAnchorOnSwapAmount(false)
    setGlpValue(formatAmountFree(maxSellAmount, GLP_DECIMALS, GLP_DECIMALS))
  }

  const getError = () => {
    if (!isBuying && inCooldownWindow) {
        return [`Redemption time not yet reached`]
    }

    if (!swapAmount || swapAmount.eq(0)) { return ["Enter an amount"] }
    if (!glpAmount || glpAmount.eq(0)) { return ["Enter an amount"] }

    if (isBuying) {
      const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress)
      if (swapTokenInfo && swapTokenInfo.balance && swapAmount && swapAmount.gt(swapTokenInfo.balance)) {
        return [`Insufficient ${swapTokenInfo.symbol} balance`]
      }

      if (swapTokenInfo.maxUsdgAmount && swapTokenInfo.usdgAmount && swapUsdMin) {
        const usdgFromAmount = adjustForDecimals(swapUsdMin, USD_DECIMALS, USDG_DECIMALS)
        const nextUsdgAmount = swapTokenInfo.usdgAmount.add(usdgFromAmount)
        if (swapTokenInfo.maxUsdgAmount.gt(0) && nextUsdgAmount.gt(swapTokenInfo.maxUsdgAmount)) {
          return [`${swapTokenInfo.symbol} pool exceeded, try different token`, true]
        }
      }
    }

    if (!isBuying) {
      if (maxSellAmount && glpAmount && glpAmount.gt(maxSellAmount)) {
        return [`Insufficient GLP balance`]
      }

      const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress)
      if (swapTokenInfo && swapTokenInfo.availableAmount && swapAmount && swapAmount.gt(swapTokenInfo.availableAmount)) {
        return [`Insufficient liquidity`]
      }
    }

    return [false]
  }

  const renderErrorModal = useCallback(() => {
    const inputCurrency = swapToken.address
    const uniswapUrl = `https://app.uniswap.org/#/swap?inputCurrency=${inputCurrency}`
    const label = `${swapToken.symbol} Capacity Reached`
    return (
      <Modal isVisible={!!modalError} setIsVisible={setModalError} label={label} className="Error-modal">
        <p>
          The pool's capacity has been reached for {swapToken.symbol}. Please use another token to buy GLP.
        </p>
        <p>
          Check the "Save on Fees" section for tokens with the lowest fees.
        </p>
        <p>
          <a href={uniswapUrl} target="_blank" rel="noreferrer">Swap on Uniswap</a>
        </p>
      </Modal>
    )
  }, [modalError, setModalError, swapToken.symbol, swapToken.address])

  const isPrimaryEnabled = () => {
    if (!active) { return true }
    const [error, modal] = getError()
    if (error && !modal) { return false }
    if ((needApproval && isWaitingForApproval) || isApproving) { return false }
    if (isApproving) { return false }
    if (isSubmitting) { return false }

    return true
  }

  const getPrimaryText = () => {
    if (!active) { return "Connect Wallet" }
    const [error, modal] = getError()
    if (error && !modal) { return error }

    if (needApproval && isWaitingForApproval) { return "Waiting for Approval" }
    if (isApproving) { return `Approving ${swapToken.symbol}...` }
    if (needApproval) { return `Approve ${swapToken.symbol}` }

    if (isSubmitting) { return isBuying ? `Buying...` : `Selling...` }

    return isBuying ? "Buy GLP" : "Sell GLP"
  }

  const approveFromToken = () => {
    approveTokens({
      setIsApproving,
      library,
      tokenAddress: swapToken.address,
      spender: glpManagerAddress,
      chainId: chainId,
      onApproveSubmitted: () => {
        setIsWaitingForApproval(true)
      },
      infoTokens,
      getTokenInfo
    })
  }

  const buyGlp = () => {
    setIsSubmitting(true)

    const minGlp = glpAmount.mul(BASIS_POINTS_DIVISOR - savedSlippageAmount).div(BASIS_POINTS_DIVISOR)

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner())
    const method = swapTokenAddress === AddressZero ? "mintAndStakeGlpETH" : "mintAndStakeGlp"
    const params = swapTokenAddress === AddressZero ? [0, minGlp] : [swapTokenAddress, swapAmount, 0, minGlp]
    const value = swapTokenAddress === AddressZero ? swapAmount : 0

    callContract(chainId, contract, method, params, {
      value,
      sentMsg: "Buy submitted!",
      failMsg: "Buy failed.",
      successMsg: `${formatAmount(glpAmount, 18, 4, true)} GLP bought with ${formatAmount(swapAmount, swapTokenInfo.decimals, 4, true)} ${swapTokenInfo.symbol}.`,
      setPendingTxns
    })
    .then(async () => {
    })
    .finally(() => {
      setIsSubmitting(false)
    })
  }

  const sellGlp = () => {
    setIsSubmitting(true)

    const minOut = swapAmount.mul(BASIS_POINTS_DIVISOR - savedSlippageAmount).div(BASIS_POINTS_DIVISOR)

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner())
    const method = swapTokenAddress === AddressZero ? "unstakeAndRedeemGlpETH" : "unstakeAndRedeemGlp"
    const params = swapTokenAddress === AddressZero ? [glpAmount, minOut, account] : [swapTokenAddress, glpAmount, minOut, account]

    callContract(chainId, contract, method, params, {
      sentMsg: "Sell submitted!",
      failMsg: "Sell failed.",
      successMsg: `${formatAmount(glpAmount, 18, 4, true)} GLP sold for ${formatAmount(swapAmount, swapTokenInfo.decimals, 4, true)} ${swapTokenInfo.symbol}.`,
      setPendingTxns
    })
    .then(async () => {
    })
    .finally(() => {
      setIsSubmitting(false)
    })
  }

  const onClickPrimary = () => {
    if (!active) {
      connectWallet()
      return
    }

    if (needApproval) {
      approveFromToken()
      return
    }

    const [, modal] = getError()

    if (modal) {
      setModalError(true)
      return
    }

    if (isBuying) {
      buyGlp()
    } else {
      sellGlp()
    }
  }

  let payLabel = "Pay"
  let receiveLabel = "Receive"
  if (isBuying) {
    if (swapUsdMin) {
      payLabel = `Pay: ${formatAmount(swapUsdMin, USD_DECIMALS, 2, true)} USD`
    }
    if (glpUsdMax) {
      receiveLabel = `Receive: ${formatAmount(glpUsdMax, USD_DECIMALS, 2, true)} USD`
    }
  } else {
    if (glpUsdMax) {
      payLabel = `Pay: ${formatAmount(glpUsdMax, USD_DECIMALS, 2, true)} USD`
    }
    if (swapUsdMin) {
      receiveLabel = `Receive: ${formatAmount(swapUsdMin, USD_DECIMALS, 2, true)} USD`
    }
  }

  const selectToken = (token) => {
    setAnchorOnSwapAmount(false)
    setSwapTokenAddress(token.address)
    helperToast.success(`${token.symbol} selected in order form`)
  }

  let feePercentageText = formatAmount(feeBasisPoints, 2, 2, true, "-")
  if (feeBasisPoints !== undefined && feeBasisPoints.toString().length > 0) {
    feePercentageText += "%"
  }

  let maxSellAmount = glpBalance
  if (glpBalance && reservedAmount) {
    maxSellAmount = glpBalance.sub(reservedAmount)
  }

  const wrappedTokenSymbol = getWrappedToken(chainId).symbol
  const nativeTokenSymbol = getNativeToken(chainId).symbol

  return (
    <div className="GlpSwap Page">
      {renderErrorModal()}
      <div className="Page-title-section">
        <div className="Page-title">{isBuying ? "Buy GLP" : "Sell GLP"}</div>
        {isBuying && <div className="Page-description">
          Purchase <a href="https://gmxio.gitbook.io/gmx/glp" target="_blank" rel="noopener noreferrer">GLP tokens</a> to earn {nativeTokenSymbol} fees from swaps and leverage trading.<br/>
          Note that there is a minimum holding time of 15 minutes after a purchase.<br/>
          <div>View <Link to="/earn">staking</Link> page.</div>
        </div>}
        {!isBuying && <div className="Page-description">
          Redeem your GLP tokens for any supported asset.
          {inCooldownWindow && <div>
            GLP tokens can only be redeemed 15 minutes after your most recent purchase.<br/>
            Your last purchase was at {formatDateTime(lastPurchaseTime)}, you can redeem GLP tokens after {formatDateTime(redemptionTime)}.<br/>
          </div>}
          <div>View <Link to="/earn">staking</Link> page.</div>
        </div>}
      </div>
      <div className="GlpSwap-content">
        <div className="App-card GlpSwap-stats-card">
          <div className="App-card-title">GLP ({chainName})</div>
          <div className="App-card-divider"></div>
          <div className="App-card-content">
            <div className="App-card-row">
              <div className="label">Price</div>
              <div>
                ${formatAmount(glpPrice, USD_DECIMALS, 2, true)}
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">Wallet</div>
              <div>
                {formatAmount(glpBalance, GLP_DECIMALS, 4, true)} GLP (${formatAmount(glpBalanceUsd, USD_DECIMALS, 2, true)})
              </div>
            </div>
            {!isBuying && <div className="App-card-row">
              <div className="label">Reserved</div>
              <div>
                <Tooltip
                  handle={`${formatAmount(reservedAmount, 18, 4, true)} GLP ($${formatAmount(reserveAmountUsd, USD_DECIMALS, 2, true)})`}
                  position="right-bottom"
                  renderContent={() => `${formatAmount(reservedAmount, 18, 4, true)} GLP have been reserved for vesting.`}
                />
              </div>
            </div>}
            <div className="App-card-divider"></div>
            <div className="App-card-row">
              <div className="label">APR</div>
              <div>
                <Tooltip handle={`${formatAmount(totalApr, 2, 2, true)}%`} position="right-bottom" renderContent={() => {
                  return <>
                    <div className="Tooltip-row">
                      <span className="label">{nativeTokenSymbol} ({wrappedTokenSymbol}) APR</span>
                      <span>{formatAmount(feeGlpTrackerApr, 2, 2, false)}%</span>
                    </div>
                    <div className="Tooltip-row">
                      <span className="label">Escrowed GMX APR</span>
                      <span>{formatAmount(stakedGlpTrackerApr, 2, 2, false)}%</span>
                    </div>
                  </>
                }} />
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">Total Supply</div>
              <div>
                {formatAmount(glpSupply, GLP_DECIMALS, 4, true)} GLP (${formatAmount(glpSupplyUsd, USD_DECIMALS, 2, true)})
              </div>
            </div>
          </div>
        </div>
        <div className="GlpSwap-box App-box">
          <div className="App-card-title">Order</div>

          {isBuying && <InputSection
            topLeftLabel={payLabel}
            topRightLabel={`Balance: ${formatAmount(swapTokenBalance, swapToken.decimals, 4, true)}`}
            inputValue={swapValue}
            onInputValueChange={onSwapValueChange}
            showMaxButton={swapValue !== formatAmountFree(swapTokenBalance, swapToken.decimals, swapToken.decimals)}
            onClickTopRightLabel={fillMaxAmount}
            onClickMax={fillMaxAmount}
          >
            <TokenSelector
              label="Pay"
              chainId={chainId}
              tokenAddress={swapTokenAddress}
              onSelectToken={onSelectSwapToken}
              tokens={whitelistedTokens}
              infoTokens={infoTokens}
              className="right"
            />
          </InputSection>}

          {!isBuying && <InputSection
            topLeftLabel={payLabel}
            topRightLabel={`Available: ${formatAmount(maxSellAmount, GLP_DECIMALS, 4, true)}`}
            inputValue={glpValue}
            onInputValueChange={onGlpValueChange}
            showMaxButton={glpValue !== formatAmountFree(maxSellAmount, GLP_DECIMALS, GLP_DECIMALS)}
            onClickTopRightLabel={fillMaxAmount}
            onClickMax={fillMaxAmount}
          >
            GLP
          </InputSection>}

          <div className="AppOrder-ball-container">
            <div className="AppOrder-ball">
              <FaAngleDown className="AppOrder-ball-icon" />
            </div>
          </div>

          {isBuying && <InputSection
            topLeftLabel={receiveLabel}
            topRightLabel={`Balance: ${formatAmount(glpBalance, GLP_DECIMALS, 4, true)}`}
            inputValue={glpValue}
            onInputValueChange={onGlpValueChange}
          >
            GLP
          </InputSection>}

          {!isBuying && <InputSection
            topLeftLabel={receiveLabel}
            topRightLabel={`Balance: ${formatAmount(swapTokenBalance, swapToken.decimals, 4, true)}`}
            inputValue={swapValue}
            onInputValueChange={onSwapValueChange}
          >
            <TokenSelector
              label="Receive"
              chainId={chainId}
              tokenAddress={swapTokenAddress}
              onSelectToken={onSelectSwapToken}
              tokens={whitelistedTokens}
              infoTokens={infoTokens}
              className="right"
            />
          </InputSection>}
          <div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                {feeBasisPoints > 50 ? "WARNING: High Fees" : "Fees"}
              </div>
              <div className="align-right">
                {isBuying && <Tooltip handle={feePercentageText} position="right-bottom" renderContent={() => {
                  return <>
                    {feeBasisPoints > 50 && <div>To reduce fees, select a different asset to pay with.</div>}
                    Check the "Save on Fees" section below to get the lowest fee percentages.
                  </>
                }} />}
                {!isBuying && <Tooltip handle={feePercentageText} position="right-bottom" renderContent={() => {
                  return <>
                    {feeBasisPoints > 50 && <div>To reduce fees, select a different asset to receive.</div>}
                    Check the "Save on Fees" section below to get the lowest fee percentages.
                  </>
                }} />}
              </div>
            </div>
          </div>
          <div className="GlpSwap-cta Exchange-swap-button-container">
            <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
              {getPrimaryText()}
            </button>
          </div>
        </div>
      </div>
      <div className="Page-title-section">
        <div className="Page-title">Save on Fees</div>
        {isBuying && <div className="Page-description">
          Fees may vary depending on which asset you use to buy GLP.<br/>
          Enter the amount of GLP you want to purchase in the order form, then check here to compare fees.
        </div>}
        {!isBuying && <div className="Page-description">
          Fees may vary depending on which asset sell GLP for.<br/>
          Enter the amount of GLP you want to purchase in the order form, then check here to compare fees.
        </div>}
      </div>
      <div className="GlpSwap-token-list">
        {tokenList.map((token) => {
          let tokenFeeBps
          if (isBuying) {
            const { feeBasisPoints: feeBps } = getBuyGlpFromAmount(glpAmount, token.address, infoTokens, glpPrice, usdgSupply, totalTokenWeights)
            tokenFeeBps = feeBps
          } else {
            const { feeBasisPoints: feeBps } = getSellGlpToAmount(glpAmount, token.address, infoTokens, glpPrice, usdgSupply, totalTokenWeights)
            tokenFeeBps = feeBps
          }
          const tokenInfo = getTokenInfo(infoTokens, token.address)
          let managedUsd
          if (tokenInfo && tokenInfo.managedUsd) {
            managedUsd = tokenInfo.managedUsd
          }
          let availableAmountUsd
          if (tokenInfo && tokenInfo.minPrice && tokenInfo.availableAmount) {
            availableAmountUsd = tokenInfo.availableAmount.mul(tokenInfo.minPrice).div(expandDecimals(1, token.decimals))
          }
          let balanceUsd
          if (tokenInfo && tokenInfo.minPrice && tokenInfo.balance) {
            balanceUsd = tokenInfo.balance.mul(tokenInfo.minPrice).div(expandDecimals(1, token.decimals))
          }

          let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT
          if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
            maxUsdgAmount = tokenInfo.maxUsdgAmount
          }

          return (
            <div className="App-card" key={token.symbol}>
              <div className="App-card-title">{token.name}</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">Price</div>
                  <div>
                    ${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">Wallet</div>
                  <div>
                    {formatKeyAmount(tokenInfo, "balance", tokenInfo.decimals, 2, true)} {tokenInfo.symbol} (${formatAmount(balanceUsd, USD_DECIMALS, 2, true)})
                  </div>
                </div>
                {isBuying && <div className="App-card-row">
                  <div className="label">Pool</div>
                  <div>
                    <Tooltip
                      handle={`$${formatAmount(managedUsd, USD_DECIMALS, 2, true)}`}
                      position="right-bottom"
                      renderContent={() => {
                        return <>
                          Pool Amount: {formatKeyAmount(tokenInfo, "poolAmount", token.decimals, 2, true)} {token.symbol}<br/>
                          <br/>
                          Max {tokenInfo.symbol} Capacity: ${formatAmount(maxUsdgAmount, 18, 0, true)}
                        </>
                      }}
                    />
                  </div>
                </div>}
                {!isBuying && <div className="App-card-row">
                  <div className="label">Available</div>
                  <div>
                    {formatKeyAmount(tokenInfo, "availableAmount", token.decimals, 2, true)} {token.symbol} (${formatAmount(availableAmountUsd, USD_DECIMALS, 2, true)})
                  </div>
                </div>}
                <div className="App-card-row">
                  <div className="label">
                    {tokenFeeBps
                      ? "Fees"
                      : <Tooltip
                        handle={`Fees`}
                        renderContent={() => `Please enter an amount to see fee percentages`}
                      />
                    }
                  </div>
                  <div>
                    {formatAmount(tokenFeeBps, 2, 2, true, "-")}{(tokenFeeBps !== undefined && tokenFeeBps.toString().length > 0) ? "%" : ""}
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-options">
                  {isBuying && <button className="App-button-option App-card-option" onClick={() => selectToken(token)}>
                    Buy with {token.symbol}
                  </button>}
                  {!isBuying && <button className="App-button-option App-card-option" onClick={() => selectToken(token)}>
                    Sell for {token.symbol}
                  </button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <Footer />
    </div>
  )
}
