import React, { useState } from 'react'
import Footer from "../../Footer"
import { Link, NavLink } from 'react-router-dom'
import { FiPlus, FiMinus } from "react-icons/fi"

import './Home.css';

import simpleSwapIcon from '../../img/ic_simpleswaps.svg'
import costIcon from '../../img/ic_cost.svg'
import liquidityIcon from '../../img/ic_liquidity.svg'

import bscIcon from '../../img/ic_bsc.svg'
import arbitrumIcon from '../../img/lg_arbitrum.svg'

import cashIcon from '../../img/ic_cash.png'
import statsIcon from '../../img/ic_stats.svg'
import tradingIcon from '../../img/ic_trading.svg'
// import gmxBigIcon from '../../img/ic_gmx_big.svg'

export default function Home() {
  const [openedFAQIndex, setOpenedFAQIndex] = useState(null)
  const faqContent = [{
    id: 1,
    question: "What's the goal of this project?",
    answer: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
  }, {
    id: 2,
    question: "What's the goal of this project?",
    answer: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
  }, {
    id: 3,
    question: "What's the goal of this project?",
    answer: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
  }, {
    id: 4,
    question: "What's the goal of this project?",
    answer: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
  }]

  const toggleFAQContent = function(index) {
    if (openedFAQIndex === index) {
      setOpenedFAQIndex(null)
    } else {
      setOpenedFAQIndex(index)
    }
  }

  return (
    <div className="Home">
      <div className="Home-top">
        <div className="Home-title-section-container default-container">
          <div className="Home-title-section">
            <div className="Home-title">
              Decentralized<br />
              Perpetual Exchange
            </div>
            <div className="Home-description">
              Trade BTC, ETH and other top cryptocurrencies with up to 30x leverage directly from your wallet
            </div>
            <NavLink activeClassName="active" to="/trade" className="default-btn">Launch exchange</NavLink>
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
            <div className="Home-cta-info__description">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce a vestibulum enim. Interdum et malesuada fames ac ante ipsum primis in faucibus. Nullam malesuada fermentum massa, nec mollis orci.</div>
          </div>
          <div className="Home-cta-options">
            <div className="Home-cta-option Home-cta-option-arbitrum">
              <div className="Home-cta-option-icon">
                <img src={arbitrumIcon} alt="arbitrum" />
              </div>
              <div className="Home-cta-option-info">
                <div className="Home-cta-option-title">Arbitrum</div>
                <div className="Home-cta-option-subtitle">GMX</div>
                <div>
                  <Link to="/trade" className="default-btn">Launch App</Link>
                </div>
              </div>
            </div>
            <div className="Home-cta-option Home-cta-option-bsc">
              <div className="Home-cta-option-icon">
                <img src={bscIcon} alt="bsc" />
              </div>
              <div className="Home-cta-option-info">
                <div className="Home-cta-option-title">Binance Smart Chain</div>
                <div className="Home-cta-option-subtitle">Gambit</div>
                <div>
                  <a href="https://gambit.financial/" target="_blank" rel="noopener noreferrer" className="default-btn">
                    Launch App
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="Home-latest-info-section">
        <div className="Home-latest-info-container default-container">
          <div className="Home-latest-info-block">
            <img src={tradingIcon} alt="trading" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">Trading Volume</div>
              <div className="Home-latest-info__value">$1,458,234,134</div>
              <div className="Home-latest-info__description">LAST 24H</div>
            </div>
          </div>
          <div className="Home-latest-info-block">
            <img src={statsIcon} alt="trading" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">Open Interest</div>
              <div className="Home-latest-info__value">$1,458,234,134</div>
              <div className="Home-latest-info__description">LAST 24H</div>
            </div>
          </div>
          <div className="Home-latest-info-block">
            <img src={cashIcon} alt="trading" className="Home-latest-info__icon" />
            <div className="Home-latest-info-content">
              <div className="Home-latest-info__title">Fees Collected</div>
              <div className="Home-latest-info__value">$1,458,234,134</div>
              <div className="Home-latest-info__description">LAST 24H</div>
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
      <div className="Home-faqs-section">
        <div className="Home-faqs-container default-container">
          <div className="Home-faqs-introduction">
            <div className="Home-faqs-introduction__title">FAQs</div>
            <div className="Home-faqs-introduction__description">Get quick answers to common questions, orhead to the documentation to learn more</div>
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
                      { content.answer }
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
