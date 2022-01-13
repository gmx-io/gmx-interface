import React, { useCallback } from 'react'
import Footer from "../../Footer"
import { Link, NavLink } from 'react-router-dom'
// import { FiPlus, FiMinus } from "react-icons/fi"

import './Home.css';

import simpleSwapIcon from '../../img/ic_simpleswaps.svg'
import costIcon from '../../img/ic_cost.svg'
import liquidityIcon from '../../img/ic_liquidity.svg'
import totaluserIcon from '../../img/ic_totaluser.svg'

// import bscIcon from '../../img/ic_bsc.svg'
import arbitrumIcon from '../../img/ic_arbitrum_96.svg'
import avaIcon from '../../img/ic_avalanche_96.svg'

import statsIcon from '../../img/ic_stats.svg'
import tradingIcon from '../../img/ic_trading.svg'
import gmxBigIcon from '../../img/ic_gmx_custom.svg'
import glpBigIcon from '../../img/ic_glp_custom.svg'

import useSWR from 'swr'

import {
  formatAmount,
  bigNumberify,
  numberWithCommas,
  getServerUrl,
  USD_DECIMALS,
  useChainId,
  ARBITRUM,
  AVALANCHE,
  switchNetwork,
  fetcher,
  formatKeyAmount,
  getTotalVolumeSum,
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

import { useUserStat, useGmxPrice } from "../../Api"

import { getContract } from '../../Addresses'

import { ethers } from 'ethers'
const { AddressZero } = ethers.constants

function APRComponent ({chainId, label}) {
  const { active, library, account } = useWeb3React()

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

  const { data: gmxPrice } = useGmxPrice()

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

export default function Home() {
  // const [openedFAQIndex, setOpenedFAQIndex] = useState(null)
  // const faqContent = [{
  //   id: 1,
  //   question: "What is GMX?",
  //   answer: "GMX is a decentralized spot and perpetual exchange that supports low swap fees and zero price impact trades.<br><br>Trading is supported by a unique multi-asset pool that earns liquidity providers fees from market making, swap fees, leverage trading (spreads, funding fees & liquidations), and asset rebalancing.<br><br>Dynamic pricing is supported by Chainlink Oracles along with TWAP pricing from leading volume DEXs."
  // }, {
  //   id: 2,
  //   question: "What is the GMX Governance Token? ",
  //   answer: "The GMX token is the governance token of the GMX ecosystem, it provides the token owner voting rights on the direction of the GMX platform.<br><br>Additionally, when GMX is staked you will earn 30% of the platform-generated fees, you will also earn Escrowed GMX tokens and Multiplier Points."
  // }, {
  //   id: 3,
  //   question: "What is the GLP Token? ",
  //   answer: "The GLP token represents the liquidity users provide to the GMX platform for Swaps and Margin Trading.<br><br>To provide liquidity to GLP you <a href='https://gmx.io/buy_glp' target='_blank'>trade</a> your crypto asset BTC, ETH, LINK, UNI, USDC, USDT, MIM, or FRAX to the liquidity pool, in exchange, you gain exposure to a diversified index of tokens while earning 50% of the platform trading fees and esGMX."
  // }, {
  //   id: 4,
  //   question: "What can I trade on GMX? ",
  //   answer: "On GMX you can swap or margin trade any of the following assets: ETH, BTC, LINK, UNI, USDC, USDT, MIM, FRAX, with others to be added. "
  // }]

  // const toggleFAQContent = function(index) {
  //   if (openedFAQIndex === index) {
  //     setOpenedFAQIndex(null)
  //   } else {
  //     setOpenedFAQIndex(index)
  //   }
  // }

  const { chainId } = useChainId()
  const { active } = useWeb3React()

  const positionStatsUrl = getServerUrl(ARBITRUM, "/position_stats")
  const { data: positionStats } = useSWR([positionStatsUrl], {
    fetcher: (...args) => fetch(...args).then(res => res.json())
  })

  const totalVolumeUrl = getServerUrl(ARBITRUM, "/total_volume")
  const { data: totalVolume } = useSWR([totalVolumeUrl], {
    fetcher: (...args) => fetch(...args).then(res => res.json())
  })

  // Total Volume

  const totalVolumeSum = getTotalVolumeSum(totalVolume)

  // Open Interest

  let openInterest = bigNumberify(0)
  if (positionStats && positionStats.totalLongPositionSizes && positionStats.totalShortPositionSizes) {
    openInterest = openInterest.add(positionStats.totalLongPositionSizes)
    openInterest = openInterest.add(positionStats.totalShortPositionSizes)
  }

  // user stat
  const userStats = useUserStat(ARBITRUM)

  const changeNetwork = useCallback(network => {
    if (network === chainId) {
      return
    }
    if (!active) {
      setTimeout(() => {
        return switchNetwork(network, active)
      }, 500)
    } else {
      return switchNetwork(network, active)
    }
  }, [chainId, active])

  return (
    <div className="Home">
      <div className="Home-top">
        {/* <div className="Home-top-image"></div> */}
        <div className="Home-title-section-container default-container">
          <div className="Home-title-section">
            <div className="Home-title">
              Decentralized<br />
              Perpetual Exchange
            </div>
            <div className="Home-description">
              Trade BTC, ETH, AVAX and other top cryptocurrencies with up to 30x leverage directly from your wallet
            </div>
            <NavLink activeClassName="active" to="/trade" className="default-btn">Launch Exchange</NavLink>
          </div>
        </div>
        <div className="Home-latest-info-container default-container">
          <div className="Home-latest-info-block">
            <img src={tradingIcon} alt="trading" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">Total Trading Volume</div>
              <div className="Home-latest-info__value">${formatAmount(totalVolumeSum, USD_DECIMALS, 0, true)}</div>
            </div>
          </div>
          <div className="Home-latest-info-block">
            <img src={statsIcon} alt="trading" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">Open Interest</div>
              <div className="Home-latest-info__value">${formatAmount(openInterest, USD_DECIMALS, 0, true)}</div>
            </div>
          </div>
          <div className="Home-latest-info-block">
            <img src={totaluserIcon} alt="trading" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">Total Users</div>
              <div className="Home-latest-info__value">{numberWithCommas(userStats && userStats.uniqueCount.toFixed(0))}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="Home-benefits-section">
        <div className='Home-benefits default-container'>
          <div className="Home-benefit">
            <div className="Home-benefit-icon">
              <img src={liquidityIcon} alt="liquidity" className="Home-benefit-icon-symbol" />
              <div className="Home-benefit-title">Reduce Liquidation Risks</div>
            </div>
            <div className="Home-benefit-description">
              An aggregate of high-quality price feeds determine when
              liquidations occur. This keeps positions safe from temporary wicks.
            </div>
          </div>
          <div className="Home-benefit">
            <div className="Home-benefit-icon">
              <img src={costIcon} alt="cost" className="Home-benefit-icon-symbol" />
              <div className="Home-benefit-title">Save on Costs</div>
            </div>
            <div className="Home-benefit-description">
              Enter and exit positions with minimal spread and zero price impact.
              Get the optimal price without incurring additional costs.
            </div>
          </div>
          <div className="Home-benefit">
            <div className="Home-benefit-icon">
              <img src={simpleSwapIcon} alt="simpleswap" className="Home-benefit-icon-symbol" />
              <div className="Home-benefit-title">Simple Swaps</div>
            </div>
            <div className="Home-benefit-description">
              Open positions through a simple swap interface. Conveniently swap from any supported asset into the position of your choice.
            </div>
          </div>
        </div>
      </div>
      <div className="Home-cta-section">
        <div className="Home-cta-container default-container">
          <div className="Home-cta-info">
            <div className="Home-cta-info__title">Available on your preferred network</div>
            <div className="Home-cta-info__description">GMX is currently live on Arbitrum and Avalanche.</div>
          </div>
          <div className="Home-cta-options">
            <div className="Home-cta-option Home-cta-option-arbitrum">
              <div className="Home-cta-option-icon">
                <img src={arbitrumIcon} alt="arbitrum" />
              </div>
              <div className="Home-cta-option-info">
                <div className="Home-cta-option-title">Arbitrum</div>
                <div className="Home-cta-option-action">
                  <Link to="/trade" className="default-btn" onClick={() => changeNetwork(ARBITRUM)}>Launch Exchange</Link>
                </div>
              </div>
            </div>
            <div className="Home-cta-option Home-cta-option-ava">
              <div className="Home-cta-option-icon">
                <img src={avaIcon} alt="ava" />
              </div>
              <div className="Home-cta-option-info">
                <div className="Home-cta-option-title">Avalanche</div>
                <div className="Home-cta-option-action">
                  <Link to="/trade" className="default-btn" onClick={() => changeNetwork(AVALANCHE)}>Launch Exchange</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="Home-token-card-section">
        <div className="Home-token-card-container default-container">
          <div className="Home-token-card-info">
            <div className="Home-token-card-info__title">Two tokens create our ecosystem</div>
          </div>
          <div className="Home-token-card-options">
            <div className="Home-token-card-option">
              <div className="Home-token-card-option-icon">
                <img src={gmxBigIcon} alt="gmxBigIcon" /> GMX
              </div>
              <div className="Home-token-card-option-info">
                <div className="Home-token-card-option-title">GMX is the utility and governance token, and also accrues 30% of the platform's generated fees.</div>
                <div className="Home-token-card-option-apr">Current APR: <APRComponent chainId={chainId} label="gmxAprTotal" /></div>
                <div className="Home-token-card-option-action">
                  <Link to="/buy" className="default-btn buy">Buy</Link>
                  <Link to="/earn" className="default-btn">Stake</Link>
                  <a href="https://gmxio.gitbook.io/gmx/" target="_blank" rel="noreferrer" className="default-btn read-more">Read more</a>
                </div>
              </div>
            </div>
            <div className="Home-token-card-option">
              <div className="Home-token-card-option-icon">
                <img src={glpBigIcon} alt="glpBigIcon" /> GLP
              </div>
              <div className="Home-token-card-option-info">
                <div className="Home-token-card-option-title">GLP is the platform's liquidity provider token. Accrues 70% of its generated fees.</div>
                <div className="Home-token-card-option-apr">Current APR: <APRComponent chainId={ARBITRUM} label="glpAprTotal" /> (Arbitrum), <APRComponent chainId={AVALANCHE} label="glpAprTotal" /> (Avalanche)</div>
                <div className="Home-token-card-option-action">
                  <Link to="/buy_glp" className="default-btn buy">Buy</Link>
                  <Link to="/earn" className="default-btn">Stake</Link>
                  <a href="https://gmxio.gitbook.io/gmx/glp" target="_blank" rel="noreferrer" className="default-btn read-more">Read more</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* <div className="Home-video-section">
        <div className="Home-video-container default-container">
          <div className="Home-video-block">
            <img src={gmxBigIcon} alt="gmxbig" />
          </div>
        </div>
      </div> */}
      {/* <div className="Home-faqs-section">
        <div className="Home-faqs-container default-container">
          <div className="Home-faqs-introduction">
            <div className="Home-faqs-introduction__title">FAQs</div>
            <div className="Home-faqs-introduction__description">Most asked questions. If you wish to learn more, please head to our Documentation page.</div>
            <a href="https://gmxio.gitbook.io/gmx/" className="default-btn Home-faqs-documentation">Documentation</a>
          </div>
          <div className="Home-faqs-content-block">
            {
              faqContent.map((content, index) => (
                <div className="Home-faqs-content" key={index} onClick={() => toggleFAQContent(index)}>
                  <div className="Home-faqs-content-header">
                    <div className="Home-faqs-content-header__icon">
                      {
                        openedFAQIndex === index ? <FiMinus className="opened" /> : <FiPlus className="closed" />
                      }
                    </div>
                    <div className="Home-faqs-content-header__text">
                      { content.question }
                    </div>
                  </div>
                  <div className={ openedFAQIndex === index ? "Home-faqs-content-main opened" : "Home-faqs-content-main" }>
                    <div className="Home-faqs-content-main__text">
                      <div dangerouslySetInnerHTML={{__html: content.answer}} >
                      </div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div> */}
      <Footer />
    </div>
  )
}
