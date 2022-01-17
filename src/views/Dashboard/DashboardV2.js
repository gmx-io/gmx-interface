import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWeb3React } from '@web3-react/core'
import useSWR from 'swr'
import Tooltip from '../../components/Tooltip/Tooltip'

import { ethers } from 'ethers'

import { getTokens, getWhitelistedTokens, getTokenBySymbol } from '../../data/Tokens'
import { getFeeHistory } from '../../data/Fees'

import {
  fetcher,
  formatAmount,
  formatKeyAmount,
  getInfoTokens,
  expandDecimals,
  bigNumberify,
  numberWithCommas,
  formatDate,
  getServerUrl,
  getChainName,
  useChainId,
  USD_DECIMALS,
  GMX_DECIMALS,
  GLP_DECIMALS,
  BASIS_POINTS_DIVISOR,
  DEFAULT_MAX_USDG_AMOUNT,
  ARBITRUM,
  AVALANCHE,
  getTotalVolumeSum
} from '../../Helpers'
import { useGmxPrice, useStakedGmxSupply } from '../../Api'

import { getContract } from '../../Addresses'

import VaultV2 from '../../abis/VaultV2.json'
import ReaderV2 from '../../abis/ReaderV2.json'
import GlpManager from '../../abis/GlpManager.json'

import Footer from "../../Footer"

import "./DashboardV2.css"

const { AddressZero } = ethers.constants

function getVolumeInfo(hourlyVolume) {
  if (!hourlyVolume || hourlyVolume.length === 0) {
    return {}
  }

  const secondsPerHour = 60 * 60
  const minTime = parseInt(Date.now() / 1000 / secondsPerHour) * secondsPerHour - 24 * secondsPerHour

  const info = {}
  let totalVolume = bigNumberify(0)
  for (let i = 0; i < hourlyVolume.length; i++) {
    const item = hourlyVolume[i].data
    if (parseInt(item.timestamp) < minTime) {
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
  const { chainId } = useChainId()

  const chainName = getChainName(chainId)

  const positionStatsUrl = getServerUrl(chainId, "/position_stats")
  const { data: positionStats, mutate: updatePositionStats } = useSWR([positionStatsUrl], {
    fetcher: (...args) => fetch(...args).then(res => res.json())
  })

  const hourlyVolumeUrl = getServerUrl(chainId, "/hourly_volume")
  const { data: hourlyVolume, mutate: updateHourlyVolume } = useSWR([hourlyVolumeUrl], {
    fetcher: (...args) => fetch(...args).then(res => res.json())
  })

  const totalVolumeUrl = getServerUrl(chainId, "/total_volume")
  const { data: totalVolume, mutate: updateTotalVolume } = useSWR([totalVolumeUrl], {
    fetcher: (...args) => fetch(...args).then(res => res.json())
  })

  const gmxSupplyUrl = getServerUrl(ARBITRUM, "/gmx_supply")
  const { data: gmxSupply, mutate: updateGmxSupply } = useSWR([gmxSupplyUrl], {
    fetcher: (...args) => fetch(...args).then(res => res.text())
  })

  let totalLongPositionSizes
  let totalShortPositionSizes
  if (positionStats && positionStats.totalLongPositionSizes && positionStats.totalShortPositionSizes) {
    totalLongPositionSizes = bigNumberify(positionStats.totalLongPositionSizes)
    totalShortPositionSizes = bigNumberify(positionStats.totalShortPositionSizes)
  }

  const volumeInfo = getVolumeInfo(hourlyVolume)

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

  const { data: stakedGmxSupply, mutate: updateStakedGmxSupply } = useStakedGmxSupply()

  const infoTokens = getInfoTokens(tokens, undefined, whitelistedTokens, vaultTokenInfo, undefined)

  const eth = infoTokens[getTokenBySymbol(chainId, "ETH").address]
  const currentFeesUsd = getCurrentFeesUsd(whitelistedTokenAddresses, fees, infoTokens)

  const feeHistory = getFeeHistory(chainId)
  const shouldIncludeCurrrentFees = feeHistory.length && (parseInt(Date.now() / 1000) - feeHistory[0].to) > 60 * 60
  let totalFeesDistributed = shouldIncludeCurrrentFees ? parseFloat(bigNumberify(formatAmount(currentFeesUsd, USD_DECIMALS - 2, 0, false)).toNumber()) / 100 : 0
  for (let i = 0; i < feeHistory.length; i++) {
    totalFeesDistributed += parseFloat(feeHistory[i].feeUsd)
  }

  const { data: gmxPrice, mutate: updateGmxPrice } = useGmxPrice()

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

  const ethFloorPriceFund = expandDecimals(350 + 148 + 384, 18)
  const glpFloorPriceFund = expandDecimals(660001, 18)
  const usdcFloorPriceFund = expandDecimals(784598 + 200000, 30)

  let totalFloorPriceFundUsd

  if (eth && eth.minPrice && glpPrice) {
    const ethFloorPriceFundUsd = ethFloorPriceFund.mul(eth.minPrice).div(expandDecimals(1, eth.decimals))
    const glpFloorPriceFundUsd = glpFloorPriceFund.mul(glpPrice).div(expandDecimals(1, 18))

    totalFloorPriceFundUsd = ethFloorPriceFundUsd.add(glpFloorPriceFundUsd).add(usdcFloorPriceFund)
  }

  let usdgSupply
  if (totalSupplies && totalSupplies[5]) {
    usdgSupply = totalSupplies[5]
  }

  const getWeightText = (tokenInfo) => {
    if (!tokenInfo.weight || !tokenInfo.usdgAmount || !usdgSupply || usdgSupply.eq(0) || !totalTokenWeights) {
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
        updateHourlyVolume(undefined, true)
        updateTotalVolume(undefined, true)

        updateTotalSupplies(undefined, true)
        updateAums(undefined, true)
        updateVaultTokenInfo(undefined, true)

        updateFees(undefined, true)
        updateGmxPrice(undefined, true)
        updateStakedGmxSupply(undefined, true)
        updateGmxSupply(undefined, true)

        updateTotalTokenWeights(undefined, true)
      })
      return () => {
        library.removeAllListeners('block')
      }
    }
  }, [active, library,  chainId,
      updatePositionStats, updateHourlyVolume, updateTotalVolume,
      updateTotalSupplies, updateAums, updateVaultTokenInfo,
      updateFees, updateGmxPrice, updateStakedGmxSupply,
      updateTotalTokenWeights, updateGmxSupply])

  const statsUrl = `https://stats.gmx.io/${chainId === AVALANCHE ? "avalanche" : ""}`
  const totalStatsStartDate = chainId === AVALANCHE ? "06 Jan 2022" : "01 Sep 2021"

  return (
    <div className="DashboardV2 Page page-layout">
      <div className="Page-title-section">
        <div className="Page-title">Stats</div>
        <div className="Page-description">
          {chainName} Total Stats start from {totalStatsStartDate}.<br/>
          For detailed stats: <a href={statsUrl}  target="_blank" rel="noopener noreferrer">{statsUrl}</a>.
        </div>
      </div>
      <div className="DashboardV2-content">
        <div className="DashboardV2-cards">
          <div className="App-card">
            <div className="App-card-title">Overview</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">AUM</div>
                <div>
                  <Tooltip
                    handle={`$${formatAmount(tvl, USD_DECIMALS, 0, true)}`}
                    position="right-bottom"
                    renderContent={() => `Assets Under Management: GMX staked (All chains) + GLP pool (${chainName})`}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">GLP Pool</div>
                <div>
                  <Tooltip
                    handle={`$${formatAmount(aum, USD_DECIMALS, 0, true)}`}
                    position="right-bottom"
                    renderContent={() => `Total value of tokens in GLP pool (${chainName})`}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">24h Volume</div>
                <div>
                  ${formatAmount(volumeInfo.totalVolume, USD_DECIMALS, 0, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Long Positions</div>
                <div>
                  ${formatAmount(totalLongPositionSizes, USD_DECIMALS, 0, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Short Positions</div>
                <div>
                  ${formatAmount(totalShortPositionSizes, USD_DECIMALS, 0, true)}
                </div>
              </div>
              {feeHistory.length ?
                <div className="App-card-row">
                  <div className="label">Fees since {formatDate(feeHistory[0].to)}</div>
                  <div>
                    ${formatAmount(currentFeesUsd, USD_DECIMALS, 2, true)}
                  </div>
                </div> : null
              }
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">Total Stats</div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">Total Fees</div>
                <div>
                  ${numberWithCommas(totalFeesDistributed.toFixed(0))}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Volume</div>
                <div>
                  ${formatAmount(totalVolumeSum, USD_DECIMALS, 0, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Floor Price Fund</div>
                <div>
                  ${formatAmount(totalFloorPriceFundUsd, 30, 0, true)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="Page-title-section">
          <div className="Page-title">Tokens</div>
          <div className="Page-description">
            Platform and GLP index tokens.
          </div>
        </div>
        <div className="DashboardV2-token-cards">
          <div className="App-card">
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
                <div className="label">Supply</div>
                <div>
                  {formatAmount(gmxSupply, GMX_DECIMALS, 0, true)} GMX
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Staked</div>
                <div>
                  ${formatAmount(stakedGmxSupplyUsd, USD_DECIMALS, 0, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Market Cap</div>
                <div>
                  ${formatAmount(gmxMarketCap, USD_DECIMALS, 0, true)}
                </div>
              </div>
            </div>
          </div>
          <div className="App-card">
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
                <div className="label">Supply</div>
                <div>
                  {formatAmount(glpSupply, GLP_DECIMALS, 0, true)} GLP
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Total Staked</div>
                <div>
                  ${formatAmount(glpMarketCap, USD_DECIMALS, 0, true)}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">Market Cap</div>
                <div>
                  ${formatAmount(glpMarketCap, USD_DECIMALS, 0, true)}
                </div>
              </div>
            </div>
          </div>
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

            return (
              <div className="App-card" key={token.symbol}>
                <div className="App-card-title">{token.symbol}</div>
                <div className="App-card-divider"></div>
                <div className="App-card-content">
                  <div className="App-card-row">
                    <div className="label">Price</div>
                    <div>
                      ${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}
                    </div>
                  </div>
                  <div className="App-card-row">
                    <div className="label">Pool</div>
                    <div>
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
                    <div>
                      {getWeightText(tokenInfo)}
                    </div>
                  </div>
                  <div className="App-card-row">
                    <div className="label">Utilization</div>
                    <div>
                      {formatAmount(utilization, 2, 2, false)}%
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <Footer />
    </div>
  )
}