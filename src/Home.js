import React from 'react'
import Footer from "./Footer"
import { Link } from 'react-router-dom'

import './Home.css';

import { ImDroplet } from 'react-icons/im'
import { IoMdSwap } from 'react-icons/io'
import { FaCompress } from 'react-icons/fa'

export default function Home() {
  return(
    <div className="Home">
      <div className="Home-top">
        <div className="Home-title-section-container">
          <div className="Home-title-section">
            <div className="Home-title">
              Decentralized<br/>
              Perpetual<br/>
              Exchange
            </div>
            <div className="Home-description">
              Trade BTC, ETH and other top cryptocurrencies with up to 30x leverage directly from your wallet
            </div>
          </div>
        </div>
        <div className="Home-title-color-container">
          <div className="App-highlight-box"></div>
        </div>
        <div className="App-highlight-box small"></div>
      </div>
      <div className="Home-benefits-section">
        <div className='Home-benefits'>
          <div className="Home-benefit">
            <div className="Home-benefit-icon Home-benefit-icon-0">
              <ImDroplet className="Home-benefit-icon-symbol" />
            </div>
            <div className="Home-benefit-text">
              <div className="Home-benefit-title">Reduce Liquidation Risks</div>
              <div className="Home-benefit-description">
                An aggregate of high-quality price feeds determine when
                liquidations occur. This keeps positions safe from temporary wicks.
              </div>
            </div>
          </div>
          <div className="Home-benefit">
            <div className="Home-benefit-icon Home-benefit-icon-1">
              <FaCompress className="Home-benefit-icon-symbol" />
            </div>
            <div className="Home-benefit-text">
              <div className="Home-benefit-title">Save on Costs</div>
              <div className="Home-benefit-description">
                Enter and exit positions with minimal spread and zero price impact.
                Get the optimal price without incurring additional costs.
              </div>
            </div>
          </div>
          <div className="Home-benefit">
            <div className="Home-benefit-icon Home-benefit-icon-2">
              <IoMdSwap  className="Home-benefit-icon-symbol" />
            </div>
            <div className="Home-benefit-text">
              <div className="Home-benefit-title">Simple Swaps</div>
              <div className="Home-benefit-description">
                Open positions through a simple swap interface. Conveniently swap from any supported asset into the position of your choice.
              </div>
            </div>
          </div>
        </div>
        <div className="App-highlight-box small"></div>
      </div>
      <div className="Home-cta-section">
        <div className="Home-cta-title">Available on your preferred network</div>
        <div className="Home-cta-options">
          <div className="Home-cta-option Home-cta-option-0">
            <div className="Home-cta-option-title">Binance Smart Chain</div>
            <div>Gambit</div>
            <div>
              <a href="https://gambit.financial/" target="_blank" rel="noopener noreferrer" className="Home-cta-button Home-cta-button-0">
                Launch App
              </a>
            </div>
          </div>
          <div className="Home-cta-option Home-cta-option-1">
            <div className="Home-cta-option-title">Arbitrum</div>
            <div>GMX</div>
            <div>
              <Link to="/trade" className="Home-cta-button Home-cta-button-1">Launch App</Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
