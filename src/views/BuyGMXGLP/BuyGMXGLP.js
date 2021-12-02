import React from 'react'
import Footer from "../../Footer"

import './BuyGMXGLP.css';

import Synapse from '../../img/Synapse.svg'
import Anyswap from '../../img/Anyswap.svg'
import Hop from '../../img/Hop.svg'
import logo from '../../img/gmx_logo.svg'

export default function BuyGMXGLP() {

  return (
    <div className="BuyGMXGLP">
      <div className="BuyGMXGLP-container default-container">
        <div className="BuyGMXGLP-title-section">
          <div className="BuyGMXGLP-title">Buy GMX/GLP</div>
          <div className="BuyGMXGLP-description">
            To purchase GMX please ensure your wallet network is set to Arbitrum and you have some ETH for gas on the Arbitrum Network. You can learn how to bridge some of your ETH from the Ethereum Network to Arbitrum using this <a href="https://arbitrum.io/bridge-tutorial/" target="_blank" rel="noopener noreferrer">Arbitrum Bridge tutorial.</a>
          </div>
          <p className="BuyGMXGLP-description better-rates-description">You can also check these alternative bridges for better rates:</p>
          <div className="alternative-bridges">
            <a href="https://synapseprotocol.com/?inputCurrency=ETH&outputCurrency=ETH&outputChain=42161" target="_blank" rel="noopener noreferrer">
              <img src={Synapse} alt="Synapse" />
            </a>
            <a href="https://anyswap.exchange/bridge#/bridge" target="_blank" rel="noopener noreferrer">
              <img src={Anyswap} alt="Anyswap" />
            </a>
            <a href="https://app.hop.exchange/send?token=USDC&sourceNetwork=ethereum&destNetwork=arbitrum" target="_blank" rel="noopener noreferrer">
              <img src={Hop} alt="Hop" />
            </a>
          </div>
          <p className="BuyGMXGLP-description">Learn more at <a href="https://gmxio.gitbook.io/gmx/tokenomics" target="_blank" rel="noopener noreferrer">https://gmxio.gitbook.io/gmx/tokenomics</a></p>
          <a href="https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" target="_blank" rel="noopener noreferrer" className="BuyGMXGLP-purchase-block">
            <div className="BuyGMXGLP-purchase-block-icon">
              <img src={logo} alt="logo" height="53px" />
            </div>
            <div className="BuyGMXGLP-purchase-block-info">
              <div className="BuyGMXGLP-purchase-block-info__title">Purchase GMX</div>
              <div className="BuyGMXGLP-purchase-block-info__subtitle">Uniswap Arbitrum</div>
            </div>
          </a>
          <div className="BuyGMXGLP-description">If you wish to buy GLP instead, please read <a href="https://gmxio.gitbook.io/gmx/glp" target="_blank" rel="noopener noreferrer">https://gmxio.gitbook.io/gmx/glp</a></div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
