import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWeb3React } from '@web3-react/core'
import useSWR from 'swr'
import { Pool } from '@uniswap/v3-sdk'
import { Token as UniToken } from '@uniswap/sdk-core'
import Tooltip from '../../components/Tooltip/Tooltip'

import { ethers } from 'ethers'

import { getTokens, getWhitelistedTokens } from '../../data/Tokens'
import { getFeeHistory } from '../../data/Fees'

import {
  fetcher,
  formatAmount,
  formatKeyAmount,
  parseValue,
  getInfoTokens,
  expandDecimals,
  bigNumberify,
  numberWithCommas,
  formatDate,
  getServerUrl,
  USD_DECIMALS,
  GMX_DECIMALS,
  GLP_DECIMALS,
  BASIS_POINTS_DIVISOR,
  DEFAULT_MAX_USDG_AMOUNT
} from '../../Helpers'

import { getContract } from '../../Addresses'

import VaultV2 from '../../abis/VaultV2.json'
import ReaderV2 from '../../abis/ReaderV2.json'
import GlpManager from '../../abis/GlpManager.json'
import UniPool from '../../abis/UniPool.json'
import Token from '../../abis/Token.json'

import Footer from "../../Footer"

import "./DashboardV2.css"

import statsBigIcon from '../../img/ic_stats_big.svg'
import tokensBigIcon from '../../img/ic_tokens.svg'
import communityBigIcon from '../../img/ic-communityproject.svg'

import gmxSmallIcon from '../../img/ic_gmx_40.svg'
import glpSmallIcon from '../../img/ic_glp_40.svg'

import arbitrumXSIcon from '../../img/ic_arbitrum_hover_16.svg'
import coingeckoXSIcon from '../../img/ic_coingecko_hover_16.svg'
import metamaskXSIcon from '../../img/ic_metamask_hover_16.svg'

const { AddressZero } = ethers.constants

function getTotalVolumeSum(volumes) {
  if (!volumes || volumes.length === 0) {
    return
  }

  let volume = bigNumberify(0)
  for (let i = 0; i < volumes.length; i++) {
    volume = volume.add(volumes[i].data.volume)
  }

  return volume
}

function getVolumeInfo(dailyVolume) {
  if (!dailyVolume || dailyVolume.length === 0) {
    return {}
  }

  const timestamp = dailyVolume[0].data.timestamp

  const info = {}
  let totalVolume = bigNumberify(0)
  for (let i = 0; i < dailyVolume.length; i++) {
    const item = dailyVolume[i].data
    if (item.timestamp !== timestamp) {
      break
    }

    if (!info[item.token]) {
      info[item.token] = bigNumberify(0)
    }

    info[item.token] = info[item.token].add(item.volume)
    totalVolume = totalVolume.add(item.volume)
  }

  info.totalVolume = totalVolume

  return info
}

function getCurrentFeesUsd(tokenAddresses, fees, infoTokens) {
  if (!fees || !infoTokens) {
    return bigNumberify(0)
  }

  let currentFeesUsd = bigNumberify(0)
  for (let i = 0; i < tokenAddresses.length; i++) {
    const tokenAddress = tokenAddresses[i]
    const tokenInfo = infoTokens[tokenAddress]
    if (!tokenInfo || !tokenInfo.minPrice) {
      continue
    }

    const feeUsd = fees[i].mul(tokenInfo.minPrice).div(expandDecimals(1, tokenInfo.decimals))
    currentFeesUsd = currentFeesUsd.add(feeUsd)
  }

  return currentFeesUsd
}

export default function DashboardV2() {
  const { active, library } = useWeb3React()
  const chainId = 42161 // set chain to Arbitrum

  const positionStatsUrl = getServerUrl(chainId, "/position_stats")
  const { data: positionStats, mutate: updatePositionStats } = useSWR([positionStatsUrl], {
    fetcher: (...args) => fetch(...args).then(res => res.json())
  })

  const dailyVolumeUrl = getServerUrl(chainId, "/daily_volume")
  const { data: dailyVolume, mutate: updateDailyVolume } = useSWR([dailyVolumeUrl], {
    fetcher: (...args) => fetch(...args).then(res => res.json())
  })

  const totalVolumeUrl = getServerUrl(chainId, "/total_volume")
  const { data: totalVolume, mutate: updateTotalVolume } = useSWR([totalVolumeUrl], {
    fetcher: (...args) => fetch(...args).then(res => res.json())
  })

  const gmxSupplyUrl = getServerUrl(chainId, "/gmx_supply")
  const { data: gmxSupply, mutate: updateGmxSupply } = useSWR([gmxSupplyUrl], {
    fetcher: (...args) => fetch(...args).then(res => res.text())
  })

  let totalLongPositionSizes
  let totalShortPositionSizes
  if (positionStats && positionStats.totalLongPositionSizes && positionStats.totalShortPositionSizes) {
    totalLongPositionSizes = bigNumberify(positionStats.totalLongPositionSizes)
    totalShortPositionSizes = bigNumberify(positionStats.totalShortPositionSizes)
  }

  const volumeInfo = getVolumeInfo(dailyVolume)

  const totalVolumeSum = getTotalVolumeSum(totalVolume)

  const tokens = getTokens(chainId)
  const whitelistedTokens = getWhitelistedTokens(chainId)
  const whitelistedTokenAddresses = whitelistedTokens.map(token => token.address)
  const tokenList = whitelistedTokens.filter(t => !t.isWrapped)

  const readerAddress = getContract(chainId, "Reader")
  const vaultAddress = getContract(chainId, "Vault")
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN")
  const glpManagerAddress = getContract(chainId, "GlpManager")

  const gmxAddress = getContract(chainId, "GMX")
  const glpAddress = getContract(chainId, "GLP")
  const usdgAddress = getContract(chainId, "USDG")

  const tokensForSupplyQuery = [gmxAddress, glpAddress, usdgAddress]

  const { data: aums, mutate: updateAums } = useSWR([`Dashboard:getAums:${active}`, chainId, glpManagerAddress, "getAums"], {
    fetcher: fetcher(library, GlpManager),
  })

  const { data: vaultTokenInfo, mutate: updateVaultTokenInfo } = useSWR([`Dashboard:vaultTokenInfo:${active}`, chainId, readerAddress, "getFullVaultTokenInfo"], {
    fetcher: fetcher(library, ReaderV2, [vaultAddress, nativeTokenAddress, expandDecimals(1, 18), whitelistedTokenAddresses]),
  })

  const { data: fees, mutate: updateFees } = useSWR([`Dashboard:fees:${active}`, chainId, readerAddress, "getFees", vaultAddress], {
    fetcher: fetcher(library, ReaderV2, [whitelistedTokenAddresses]),
  })

  const { data: totalSupplies, mutate: updateTotalSupplies } = useSWR([`Dashboard:totalSupplies:${active}`, chainId, readerAddress, "getTokenBalancesWithSupplies", AddressZero], {
    fetcher: fetcher(library, ReaderV2, [tokensForSupplyQuery]),
  })

  const { data: totalTokenWeights, mutate: updateTotalTokenWeights } = useSWR([`GlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"], {
    fetcher: fetcher(library, VaultV2),
  })

  const poolAddress = "0x80A9ae39310abf666A87C743d6ebBD0E8C42158E" // GMX/WETH

  const { data: uniPoolSlot0, mutate: updateUniPoolSlot0 } = useSWR([`StakeV2:uniPoolSlot0:${active}`, chainId, poolAddress, "slot0"], {
    fetcher: fetcher(library, UniPool),
  })

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker")

  const { data: stakedGmxSupply, mutate: updateStakedGmxSupply } = useSWR(["StakeV2:stakedGmxSupply", chainId, gmxAddress, "balanceOf", stakedGmxTrackerAddress], {
    fetcher: fetcher(library, Token),
  })

  const infoTokens = getInfoTokens(tokens, undefined, whitelistedTokens, vaultTokenInfo, undefined)

  const eth = infoTokens[nativeTokenAddress]
  const currentFeesUsd = getCurrentFeesUsd(whitelistedTokenAddresses, fees, infoTokens)

  const feeHistory = getFeeHistory(chainId)
  const shouldIncludeCurrrentFees = (parseInt(Date.now() / 1000) - feeHistory[0].to) > 60 * 60
  let totalFeesDistributed = shouldIncludeCurrrentFees ? parseFloat(bigNumberify(formatAmount(currentFeesUsd, USD_DECIMALS - 2, 0, false)).toNumber()) / 100 : 0
  for (let i = 0; i < feeHistory.length; i++) {
    totalFeesDistributed += parseFloat(feeHistory[i].feeUsd)
  }

  const busdFloorPriceFundUsd = expandDecimals(1000000, 30)
  const ethFloorPriceFund = expandDecimals(800 + 270, 18)

  let ethFloorPriceFundUsd
  let totalFloorPriceFundUsd

  if (eth && eth.minPrice) {
    ethFloorPriceFundUsd = ethFloorPriceFund.mul(eth.minPrice).div(expandDecimals(1, eth.decimals))
    totalFloorPriceFundUsd = busdFloorPriceFundUsd.add(ethFloorPriceFundUsd)
  }

  let gmxPrice

  if (uniPoolSlot0 && eth && eth.minPrice) {
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
    gmxPrice = poolTokenPriceAmount.mul(eth.minPrice).div(expandDecimals(1, 18))
  }

  let gmxMarketCap
  if (gmxPrice && gmxSupply) {
    gmxMarketCap = gmxPrice.mul(gmxSupply).div(expandDecimals(1, GMX_DECIMALS))
  }

  let stakedGmxSupplyUsd
  if (gmxPrice && stakedGmxSupply) {
    stakedGmxSupplyUsd = stakedGmxSupply.mul(gmxPrice).div(expandDecimals(1, GMX_DECIMALS))
  }

  let aum
  if (aums && aums.length > 0) {
    aum = aums[0].add(aums[1]).div(2)
  }

  let tvl
  if (aum && gmxPrice && stakedGmxSupply) {
    tvl = aum.add(gmxPrice.mul(stakedGmxSupply).div(expandDecimals(1, GMX_DECIMALS)))
  }

  let glpPrice
  let glpSupply
  let glpMarketCap
  if (aum && totalSupplies && totalSupplies[3]) {
    glpSupply = totalSupplies[3]
    glpPrice = (aum && aum.gt(0) && glpSupply.gt(0)) ? aum.mul(expandDecimals(1, GLP_DECIMALS)).div(glpSupply) : expandDecimals(1, USD_DECIMALS)
    glpMarketCap = glpPrice.mul(glpSupply).div(expandDecimals(1, GLP_DECIMALS))
  }

  const hourValue = parseInt((new Date() - new Date().setUTCHours(0,0,0,0)) / (60 * 60 * 1000))
  const minuteValue = parseInt((new Date() - new Date().setUTCHours(0,0,0,0)) / (60 * 1000))
  let volumeLabel = hourValue > 0 ? `${hourValue}h` : `${minuteValue}m`

  let usdgSupply
  if (totalSupplies && totalSupplies[5]) {
    usdgSupply = totalSupplies[5]
  }

  const getWeightText = (tokenInfo) => {
    if (!tokenInfo.weight || !tokenInfo.usdgAmount || !usdgSupply || !totalTokenWeights) {
      return "..."
    }

    const currentWeightBps = tokenInfo.usdgAmount.mul(BASIS_POINTS_DIVISOR).div(usdgSupply)
    const targetWeightBps = tokenInfo.weight.mul(BASIS_POINTS_DIVISOR).div(totalTokenWeights)

    const weightText = `${formatAmount(currentWeightBps, 2, 2, false)}% / ${formatAmount(targetWeightBps, 2, 2, false)}%`

    return (
      <Tooltip handle={weightText} position="right-bottom" renderContent={() => {
        return <>
          Current Weight: {formatAmount(currentWeightBps, 2, 2, false)}%<br/>
          Target Weight: {formatAmount(targetWeightBps, 2, 2, false)}%<br/>
          <br/>
          {currentWeightBps.lt(targetWeightBps) && <div>
            {tokenInfo.symbol} is below its target weight.<br/>
            <br/>
            Get lower fees to <Link to="/buy_glp" target="_blank" rel="noopener noreferrer">buy GLP</Link> with {tokenInfo.symbol},&nbsp;
            and to <Link to="/trade" target="_blank" rel="noopener noreferrer">swap</Link> {tokenInfo.symbol} for other tokens.
          </div>}
          {currentWeightBps.gt(targetWeightBps) && <div>
            {tokenInfo.symbol} is above its target weight.<br/>
            <br/>
            Get lower fees to <Link to="/trade" target="_blank" rel="noopener noreferrer">swap</Link> tokens for {tokenInfo.symbol}.
          </div>}
          <br/>
          <div>
            <a href="https://gmxio.gitbook.io/gmx/glp" target="_blank" rel="noopener noreferrer">More Info</a>
          </div>
        </>
      }} />
    )
  }

  useEffect(() => {
    if (active) {
      library.on('block', () => {
        updatePositionStats(undefined, true)
        updateDailyVolume(undefined, true)
        updateTotalVolume(undefined, true)

        updateTotalSupplies(undefined, true)
        updateAums(undefined, true)
        updateVaultTokenInfo(undefined, true)

        updateFees(undefined, true)
        updateUniPoolSlot0(undefined, true)
        updateStakedGmxSupply(undefined, true)
        updateGmxSupply(undefined, true)

        updateTotalTokenWeights(undefined, true)
      })
      return () => {
        library.removeAllListeners('block')
      }
    }
  }, [active, library,  chainId,
      updatePositionStats, updateDailyVolume, updateTotalVolume,
      updateTotalSupplies, updateAums, updateVaultTokenInfo,
      updateFees, updateUniPoolSlot0, updateStakedGmxSupply,
      updateTotalTokenWeights, updateGmxSupply])

  return (
    <div className="DashboardV2 default-container page-container">
      <div className="section-title-block">
        <div className="section-title-icon">
          <img src={statsBigIcon} alt="statsBigIcon" />
        </div>
        <div className="section-title-content">
          <div className="section-title-content__title">
            Stats
          </div>
          <div className="section-title-content__description">
            Total Stats start from 01 Sep 2021. For detailed stats: <a href="https://stats.gmx.io/" target="_blank" rel="noopener noreferrer">https://stats.gmx.io</a>.
          </div>
        </div>
      </div>
      <div className="page-main-content">
        <div className="DashboardV2-cards">
          <div className="App-card">
            <div className="App-card-title">OVERVIEW</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">AUM</div>
                <div className="value">
                  <Tooltip
                    handle={`$${formatAmount(tvl, USD_DECIMALS, 0, true)}`}
                    position="right-bottom"
                    renderContent={() => "Assets Under Management: GLP pool + GMX staked"}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">GLP Pool</div>
                <div className="value">
                  <Tooltip
                    handle={`$${formatAmount(aum, USD_DECIMALS, 0, true)}`}
                    position="right-bottom"
                    renderContent={() => "Total value of tokens in GLP pool"}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">{volumeLabel} Volume</div>
                <div className="value">
                  ${formatAmount(volumeInfo.totalVolume, USD_DECIMALS, 0, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Long Positions</div>
                <div className="value">
                  ${formatAmount(totalLongPositionSizes, USD_DECIMALS, 0, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Short Positions</div>
                <div className="value">
                  ${formatAmount(totalShortPositionSizes, USD_DECIMALS, 0, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Fees since {formatDate(feeHistory[0].to)}</div>
                <div className="value">
                  ${formatAmount(currentFeesUsd, USD_DECIMALS, 2, true)}
                </div>
              </div>
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">TOTAL STATS</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Total Fees</div>
                <div className="value">
                  ${numberWithCommas(totalFeesDistributed.toFixed(0))}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Volume</div>
                <div className="value">
                  ${formatAmount(totalVolumeSum, USD_DECIMALS, 0, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Floor Price Fund</div>
                <div className="value">
                  ${formatAmount(totalFloorPriceFundUsd, 30, 0, true)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="section-title-block">
          <div className="section-title-icon">
            <img src={tokensBigIcon} alt="tokensBigIcon" />
          </div>
          <div className="section-title-content">
            <div className="section-title-content__title">Tokens</div>
            <div className="section-title-content__description">
              Platform and GLP index tokens.
            </div>
          </div>
        </div>
        <div className="DashboardV2-token-cards">
          <div className="App-card-long App-card">
            <div className="App-card-long-content">
              <div className="App-card-long_sub">
                <div className="App-card-long-sub-left">
                  <div className="App-card-long_sub-icon">
                    <img src={gmxSmallIcon} alt="gmxSmallIcon" />
                  </div>
                  <div className="App-card-long_sub__info">
                    <div className="App-card-long_sub__info___title">GMX</div>
                    <div className="App-card-long_sub__info___subtitle">GMX</div>
                  </div>
                </div>
                <div className="App-card-long_sub__iconlist">
                  <div className="App-card-long_sub__iconlist___icon">
                    <img src={arbitrumXSIcon} alt="arbitrumXSIcon" />
                  </div>
                  <div className="App-card-long_sub__iconlist___icon">
                    <img src={coingeckoXSIcon} alt="coingeckoXSIcon" />
                  </div>
                  <div className="App-card-long_sub__iconlist___icon">
                    <img src={metamaskXSIcon} alt="metamaskXSIcon" />
                  </div>
                </div>
              </div>
              <div className="App-card-divider-vertical"></div>
              <div className="App-card-long_sub">
                <div className="App-card-long_sub__title">Price</div>
                <div className="App-card-long_sub__subtitle">${formatAmount(gmxPrice, USD_DECIMALS, 2, true)}</div>
              </div>
              <div className="App-card-divider-vertical"></div>
              <div className="App-card-long_sub">
                <div className="App-card-long_sub__title">Supply</div>
                <div className="App-card-long_sub__subtitle">{formatAmount(gmxSupply, GMX_DECIMALS, 0, true)} GMX</div>
              </div>
              <div className="App-card-divider-vertical"></div>
              <div className="App-card-long_sub">
                <div className="App-card-long_sub__title">Total Staked</div>
                <div className="App-card-long_sub__subtitle">${formatAmount(stakedGmxSupplyUsd, USD_DECIMALS, 0, true)}</div>
              </div>
              <div className="App-card-divider-vertical"></div>
              <div className="App-card-long_sub">
                <div className="App-card-long_sub__title">Market Cap</div>
                <div className="App-card-long_sub__subtitle">${formatAmount(gmxMarketCap, USD_DECIMALS, 0, true)}</div>
              </div>
            </div>
          </div>
          <div className="App-card-long App-card">
            <div className="App-card-long-content">
              <div className="App-card-long_sub">
                <div className="App-card-long-sub-left">
                  <div className="App-card-long_sub-icon">
                    <img src={glpSmallIcon} alt="glpSmallIcon" />
                  </div>
                  <div className="App-card-long_sub__info">
                    <div className="App-card-long_sub__info___title">GLP</div>
                    <div className="App-card-long_sub__info___subtitle">GLP</div>
                  </div>
                </div>
                <div className="App-card-long_sub__iconlist">
                  <div className="App-card-long_sub__iconlist___icon">
                    <img src={arbitrumXSIcon} alt="arbitrumXSIcon" />
                  </div>
                  <div className="App-card-long_sub__iconlist___icon">
                    <img src={coingeckoXSIcon} alt="coingeckoXSIcon" />
                  </div>
                  <div className="App-card-long_sub__iconlist___icon">
                    <img src={metamaskXSIcon} alt="metamaskXSIcon" />
                  </div>
                </div>
              </div>
              <div className="App-card-divider-vertical"></div>
              <div className="App-card-long_sub">
                <div className="App-card-long_sub__title">Price</div>
                <div className="App-card-long_sub__subtitle">${formatAmount(glpPrice, USD_DECIMALS, 2, true)}</div>
              </div>
              <div className="App-card-divider-vertical"></div>
              <div className="App-card-long_sub">
                <div className="App-card-long_sub__title">Supply</div>
                <div className="App-card-long_sub__subtitle">{formatAmount(glpSupply, GLP_DECIMALS, 0, true)} GLP</div>
              </div>
              <div className="App-card-divider-vertical"></div>
              <div className="App-card-long_sub">
                <div className="App-card-long_sub__title">Total Staked</div>
                <div className="App-card-long_sub__subtitle">${formatAmount(glpMarketCap, USD_DECIMALS, 0, true)}</div>
              </div>
              <div className="App-card-divider-vertical"></div>
              <div className="App-card-long_sub">
                <div className="App-card-long_sub__title">Market Cap</div>
                <div className="App-card-long_sub__subtitle">${formatAmount(glpMarketCap, USD_DECIMALS, 0, true)}</div>
              </div>
            </div>
            <div className="App-card-long-content card-list">
              {tokenList.map((token) => {
                const tokenInfo = infoTokens[token.address]
                let utilization = bigNumberify(0)
                if (tokenInfo && tokenInfo.reservedAmount && tokenInfo.poolAmount && tokenInfo.poolAmount.gt(0)) {
                  utilization = tokenInfo.reservedAmount.mul(BASIS_POINTS_DIVISOR).div(tokenInfo.poolAmount)
                }
                let maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT
                if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
                  maxUsdgAmount = tokenInfo.maxUsdgAmount
                }
                var tokenImage = require('../../img/ic_' + token.symbol.toLowerCase() + '_40.svg')
                return (
                  <div className="App-card token-card" key={token.symbol}>
                    <div className="App-card-title-block">
                      <div className="App-card-title-info">
                        <div className="App-card-title-info-icon">
                          <img src={tokenImage.default} alt={token.symbol} />
                        </div>
                        <div className="App-card-title-info-text">
                          <div className="App-card-info-title">{token.symbol}</div>
                          <div className="App-card-info-subtitle">{token.symbol}</div>
                        </div>
                      </div>
                      <div className="App-card-title-iconlist">
                        <div className="App-card-title-iconlist___icon">
                          <img src={arbitrumXSIcon} alt="arbitrumXSIcon" />
                        </div>
                        <div className="App-card-title-iconlist___icon">
                          <img src={coingeckoXSIcon} alt="coingeckoXSIcon" />
                        </div>
                        <div className="App-card-title-iconlist___icon">
                          <img src={metamaskXSIcon} alt="metamaskXSIcon" />
                        </div>
                      </div>
                    </div>
                    <div className="App-card-divider"></div>
                    <div className="App-card-content">
                      <div className="App-card-row">
                        <div className="label">Price</div>
                        <div className="value">
                          ${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}
                        </div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Pool</div>
                        <div className="value">
                          <Tooltip
                            handle={`$${formatKeyAmount(tokenInfo, "managedUsd", USD_DECIMALS, 0, true)}`}
                            position="right-bottom"
                            renderContent={() => {
                              return <>
                                Pool Amount: {formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 2, true)} {token.symbol}<br/>
                                <br/>
                                Max {tokenInfo.symbol} Capacity: ${formatAmount(maxUsdgAmount, 18, 0, true)}
                              </>
                            }}
                          />
                        </div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Weight</div>
                        <div className="value">
                          {getWeightText(tokenInfo)}
                        </div>
                      </div>
                      <div className="App-card-row">
                        <div className="label">Utilization</div>
                        <div className="value">
                          {formatAmount(utilization, 2, 2, false)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="section-title-block">
          <div className="section-title-icon">
            <img src={communityBigIcon} alt="communityBigIcon" />
          </div>
          <div className="section-title-content">
            <div className="section-title-content__title">Community Projects</div>
            <div className="section-title-content__description">
              Projects developed by the GMX community.
            </div>
          </div>
        </div>
        <div className="DashboardV2-projects">
          <div className="App-card">
            <div className="App-card-title">GMX Positions Bot</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Link</div>
                <div className="value">
                  <a href="https://t.me/GMXPositions" target="_blank" rel="noopener noreferrer">
                    https://t.me/GMXPositions
                  </a>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">About</div>
                <div className="value">
                  Telegram bot for GMX position updates
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Creator</div>
                <div className="value">
                  <a href="https://t.me/zhongfu" target="_blank" rel="noopener noreferrer">
                    @zhongfu
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">GMX Leaderboard</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Link</div>
                <div className="value">
                  <a href="https://www.gmx.house/" target="_blank" rel="noopener noreferrer">
                    https://www.gmx.house
                  </a>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">About</div>
                <div className="value">
                  Leaderboard for GMX traders
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Creator</div>
                <div className="value">
                  <a href="https://t.me/Itburnz" target="_blank" rel="noopener noreferrer">
                    @Itburnz
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">GMX Yield List</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Link</div>
                <div className="value">
                  <a href="https://gist.github.com/gmxyield/3c2941634ce42cf24b57bdba6f99067f" target="_blank" rel="noopener noreferrer">
                    https://gist.github.com/gmxyield
                  </a>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">About</div>
                <div className="value">
                  List of rewards from external projects
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Creator</div>
                <div className="value">
                  <a href="https://gist.github.com/gmxyield" target="_blank" rel="noopener noreferrer">
                    @gmxyield
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">GMX Charts</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Link</div>
                <div className="value">
                  <a href="https://app.tokenfeeds.info/gmx-chart" target="_blank" rel="noopener noreferrer">
                    https://app.tokenfeeds.info/gmx-chart
                  </a>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">About</div>
                <div className="value">
                  GMX price and staking charts
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Creator</div>
                <div className="value">
                  <a href="https://t.me/atomist" target="_blank" rel="noopener noreferrer">
                    @atomist
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">GMX Feedback</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Link</div>
                <div className="value">
                  <a href="https://gmx-fider.herokuapp.com" target="_blank" rel="noopener noreferrer">
                    https://gmx-fider.herokuapp.com
                  </a>
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">About</div>
                <div className="value">
                  GMX feedback and feature requests
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Creator</div>
                <div className="value">
                  <a href="https://t.me/sevpants" target="_blank" rel="noopener noreferrer">
                    @sevpants
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}