import React from "react";
import Footer from "components/Footer/Footer";
import "./Home.css";

import simpleSwapIcon from "./HomepageAssets/Swap.svg";
import costIcon from "./HomepageAssets/SaveCosts.svg";
import liquidityIcon from "./HomepageAssets/Liquidity.svg";
import totaluserIcon from "./HomepageAssets/User.svg";
import asurasLogo from "./HomepageAssets/asurasLogo.svg";
import ethLogo from './HomepageAssets/eth_icon.png'
import wbtcLogo from './HomepageAssets/wbtc_icon.png'
import usdcLogo from './HomepageAssets/usd-coin.png'
import usdtLogo from './HomepageAssets/tether-logo.png'
import daiLogo from './HomepageAssets/dai-logo.png'
import alpLogo from './HomepageAssets/ALP.svg'
import asrLogo from './HomepageAssets/ASR.svg'

import arbitrumIcon from "img/ic_arbitrum_96.svg";
import ecosystemScreen from "./HomepageAssets/ecosystem.svg";
import statsIcon from "./HomepageAssets/OpenInterest.svg";
import tradingIcon from "./HomepageAssets/Trading.svg";

import useSWR from "swr";

import { USD_DECIMALS, getTotalVolumeSum } from "lib/legacy";

import { useUserStat } from "domain/legacy";
import artwork from "./HomepageAssets/Artwork_ASURAS.svg"
import TokenCard from "components/TokenCard/TokenCard";
import { Trans } from "@lingui/macro";
import { HeaderLink } from "components/Header/HeaderLink";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { getServerUrl } from "config/backend";
import { bigNumberify, formatAmount, numberWithCommas } from "lib/numbers";
import { GradientButton } from "components/LandingPageComponents/BlueButtonComponents/BlueButtonComponent";
import { Header } from "components/Header/Header";


export default function Home({ showRedirectModal, redirectPopupTimestamp }) {

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

  // ARBITRUM

  const arbitrumPositionStatsUrl = getServerUrl(ARBITRUM, "/position_stats");
  const { data: arbitrumPositionStats } = useSWR([arbitrumPositionStatsUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const arbitrumTotalVolumeUrl = getServerUrl(ARBITRUM, "/total_volume");
  const { data: arbitrumTotalVolume } = useSWR([arbitrumTotalVolumeUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  // AVALANCHE

  const avalanchePositionStatsUrl = getServerUrl(AVALANCHE, "/position_stats");
  const { data: avalanchePositionStats } = useSWR([avalanchePositionStatsUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  const avalancheTotalVolumeUrl = getServerUrl(AVALANCHE, "/total_volume");
  const { data: avalancheTotalVolume } = useSWR([avalancheTotalVolumeUrl], {
    fetcher: (...args) => fetch(...args).then((res) => res.json()),
  });

  // Total Volume

  const arbitrumTotalVolumeSum = getTotalVolumeSum(arbitrumTotalVolume);
  const avalancheTotalVolumeSum = getTotalVolumeSum(avalancheTotalVolume);

  let totalVolumeSum = bigNumberify(0);
  if (arbitrumTotalVolumeSum && avalancheTotalVolumeSum) {
    totalVolumeSum = totalVolumeSum.add(arbitrumTotalVolumeSum);
    totalVolumeSum = totalVolumeSum.add(avalancheTotalVolumeSum);
  }

  // Open Interest

  let openInterest = bigNumberify(0);
  if (
    arbitrumPositionStats &&
    arbitrumPositionStats.totalLongPositionSizes &&
    arbitrumPositionStats.totalShortPositionSizes
  ) {
    openInterest = openInterest.add(arbitrumPositionStats.totalLongPositionSizes);
    openInterest = openInterest.add(arbitrumPositionStats.totalShortPositionSizes);
  }

  if (
    avalanchePositionStats &&
    avalanchePositionStats.totalLongPositionSizes &&
    avalanchePositionStats.totalShortPositionSizes
  ) {
    openInterest = openInterest.add(avalanchePositionStats.totalLongPositionSizes);
    openInterest = openInterest.add(avalanchePositionStats.totalShortPositionSizes);
  }

  // user stat
  const arbitrumUserStats = useUserStat(ARBITRUM);
  const avalancheUserStats = useUserStat(AVALANCHE);
  let totalUsers = 0;

  if (arbitrumUserStats && arbitrumUserStats.uniqueCount) {
    totalUsers += arbitrumUserStats.uniqueCount;
  }

  if (avalancheUserStats && avalancheUserStats.uniqueCount) {
    totalUsers += avalancheUserStats.uniqueCount;
  }

  const LaunchExchangeButton = () => {
    return (
      <HeaderLink
        className="default-btn"
        to="/trade"
        redirectPopupTimestamp={redirectPopupTimestamp}
        showRedirectModal={showRedirectModal}
      >
        <Trans>LAUNCH APP</Trans>
      </HeaderLink>
    );
  };


  return (
    <div className="Home">
      <div className="asset-img">
      <Header redirectPopupTimestamp={redirectPopupTimestamp}
            showRedirectModal={showRedirectModal} />
        <div className="home-wrapper">              
          <div className="content-wrapper">
          <div className="content-text-wrapper">
              <p className="content-text">
                <span className="text-blue">Decentralized</span>
                <br/>Spot & Perpetual Exchange
              </p>
            </div>
            <p className="text-blue">No price impact, reduced liquidation   <br/>risks and up to 30x leverage.</p>
            <div className="content-footer">  
              <div className="button-wrapper">   
                <LaunchExchangeButton/>
                <span className="learn-more">Learn more {">"}</span>
              </div>
              <div className="footer-content">
                <span className="live-on-arbitrum">LIVE ON
                  <img className="arbitrum-icon" src={arbitrumIcon} width={30}/>
                  ARBITRUM</span>
              </div>
              <div className="button-wrapper">   
                <GradientButton bgColor="none" boderColor="#00b4c9ff">
                  BUY ASR
                </GradientButton>
                <span className="learn-more">Our Token Sale is Live!</span>
              </div>
            </div>
            
          </div>
          <div className="main-page-empty-block">
            
            </div>
        </div>
      <div className="home-stats-wrapper">
        <div className="dex-stats-wrapper">
          <div className="stat-wrapper">
          <img src={tradingIcon} width={60}/>
            <div className="stat-content-wrapper">
              <h1 className="stat-content-heading">Total Trading Volume</h1>
              <p  className="stat-content-values">${formatAmount(totalVolumeSum, USD_DECIMALS, 0, true)}</p>
            </div>
          </div>
          <div className="stat-wrapper">
          <img src={statsIcon} width={60}/>
            <div className="stat-content-wrapper">
              <h1 className="stat-content-heading">Open Interest</h1>
              <p  className="stat-content-values">${formatAmount(openInterest, USD_DECIMALS, 0, true)}</p>
            </div>
          </div>
          <div className="stat-wrapper">
          <img src={totaluserIcon} width={60}/>
            <div className="stat-content-wrapper">
              <h1 className="stat-content-heading">Total Users</h1>
              <p  className="stat-content-values">{numberWithCommas(totalUsers.toFixed(0))}</p>
            </div>
          </div>
        </div>
      </div>
      </div>
      <div className="main-stats-wrapper"> 
        <div className="main-stats">
          <div className="main-stat">        
             <img className="main-stat-icon" src={liquidityIcon} />
            <div className="main-stat-content-wrapper">
              <h1 className="main-stat-heading">Reduced Liquidation Risks</h1>
              <p className="main-stat-text">An aggregate of high-quality price
              feeds determine when liquidations
              occur. This keeps positions safe
              from temporary wicks.
              </p>
            </div>
          </div>
          <div className="main-stat">
            <img className="main-stat-icon" src={costIcon} />
            <div className="main-stat-content-wrapper">
              <h1 className="main-stat-heading">Low Costs</h1>
              <p className="main-stat-text">Enter and exit positions with
              minimal spread and zero price
              impact. Get the optimal price
              without incurring additional costs.
              </p>
            </div>
          </div>
          <div className="main-stat">      
            <img className="main-stat-icon" src={simpleSwapIcon} />
            <div className="main-stat-content-wrapper">
              <h1 className="main-stat-heading">Simple Swaps</h1>
              <p className="main-stat-text">Open positions through a simple
              swap interface. Conveniently swap
              from any supported asset into the
              position of your choice.
            </p>
           </div>
          </div>
        </div>
      </div>
      <div className="lower-content-wrapper">
        <div className="supported-network-text">
          <h2 className="currencies-block">    
            <p className="supported-network-p">Networks & Currencies</p>
          </h2>
        </div>
      </div>
      <div className="start-trading-wrapper">
          <img src={arbitrumIcon} />
          <div className="start-trading">
            <p className="arbitrum-text">ARBITRUM</p>
            <LaunchExchangeButton />
          </div>
        </div>
      <div className="tokens-list">
       <div className="token-item">
          <img src={ethLogo} width={60}/>
          <div className="token-info">
            <p className="token-symbol">ETH</p>
            <h1 className="token-name">Ethereum</h1>
          </div>
       </div>
       <div className="token-item">
          <div className="wbtc-bg">
            <img src={wbtcLogo} width={60}/>
          </div>
          <div className="token-info">
            <p className="token-symbol">WBTC</p>
            <h1 className="token-name">Wrapped Bitcoin</h1>
          </div>
        </div>
        <div className="token-item">
          <img src={usdcLogo} width={60}/>
          <div className="token-info">
            <p className="token-symbol">USDC</p>
            <h1 className="token-name">USD Coin</h1>
          </div>
       </div>
       <div className="token-item">
          <img src={usdtLogo} width={60}/>
          <div className="token-info">
            <p className="token-symbol">USDT</p>
            <h1 className="token-name">Tether</h1>
          </div>
        </div>
        <div className="token-item">
          <img src={daiLogo} width={60}/>
          <div className="token-info">
            <p className="token-symbol">DAI</p>
            <h1 className="token-name">Dai</h1>
          </div>
       </div>
      </div>
      <div>
        <h2 className="our-tokens">Our Tokens</h2>
        <div className="cards-wrapper">
          <div className="asr-card">
            <div className="asr-logo">
              <img src={asrLogo} width={200}/>
            </div>
            <h4 className="header-text">ASR is the utility and governance token. </h4>
            <div className="asr-token-data-wrapper">
              <div className="asr-token-data">
                <ul>
                  <li>
                    Accrues 30% of the platform's generated net fees.
                  </li>
                  <li>
                    ASR stakers will earn rewards in the form of <br/>
                    esASR (Escrowed ASR). 
                  </li>
                  <li>
                    Govern the ASURAS DAO
                  </li>
                  <li>
                    The max supply is 21 million ASR which is the total amount of tokens
                    that can be ever used to bootstrap the platform.
                  </li>            
                </ul>
              </div>
            </div>
            <div className="alp-content-wrapper">
              <div className="asr-earnings">
                <div>
                  <h3>APR:</h3>
                  <p className="text-green">10.51%</p>
                </div>
                <div>
                  <h3>Total Earned:</h3>
                  <p className="text-green">$10,458</p>
                </div>              
              </div>
              <div className="buy-asr">
                <GradientButton fontSize="26px" fontWeight="bold" padding="1.5rem 10rem">
                  Buy ASR
                </GradientButton>  
                <span  className="learn-more">Learn more {">"}</span>
              </div>             
            </div>
            <p className="asr-footer-text">ASR's price is entirely speculative.</p>
          </div>
          <div className="asr-card">
            <div className="asr-logo">
              <img src={alpLogo} width={200}/>
            </div>
            <h4 className="header-text">ALP is “ASURAS Liquidity Pool” token with no impermanent loss. </h4>
            <div className="asr-token-data-wrapper">
              <div className="asr-token-data">
                <ul>
                  <li>
                    Accrues 70% of the platform's generated net fees.
                  </li>
                  <li>
                    Makes a profit when leverage traders make a loss and vice versa.
                  </li>
                  <li>
                    An index token with price exposure to the assets used on the
                    platform.
                  </li>            
                  <li>
                    ALP holders will earn rewards in the form of <br/>
                    esASR (Escrowed ASR).
                  </li>      
                </ul>
              </div>
            </div>
            <div className="asr-content-wrapper">
              <div className="asr-earnings">
                <div>
                  <h3>APR:</h3>
                  <p className="text-green">19.91%</p>
                </div>
                <div>
                  <h3>Total Earned:</h3>
                  <p className="text-green">$22,858</p>
                </div>              
              </div>
              <div className="buy-alp">
                <GradientButton fontSize="26px" fontWeight="bold" padding="1.5rem 10rem" >
                    Buy ALP
                </GradientButton>  
                <span  className="learn-more">Learn more {">"}</span>
              </div>             
            </div>
            <p className="alp-footer-text">ALP's price depends on the prices of tokens that are indexed..</p>
          </div>
        </div>
        <div>
          <h2 className="ecosystem-heading">The Ecosystem</h2>
          <div className="ecosystem-screen-wrapper">
            <img className="ecosystem-screen" src={ecosystemScreen}/>
          </div>
        </div>
       <Footer />
      </div>
    </div>
  );
}
