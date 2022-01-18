import React, { useEffect } from 'react'
import Footer from "../../Footer"
import 'react-tabs/style/react-tabs.css';
import './BuyGMX.css';

import Synapse from '../../img/Synapse.png'
import Anyswap from '../../img/Anyswap.png'
import Hop from '../../img/Hop.png'
import Banxa from '../../img/Banxa.png'
import Binance from '../../img/binance.png'
import gmx64Icon from '../../img/ic_gmx_64.svg'

import olympusIcon from '../../img/ic_olympus.svg'
import buyTransferETHIcon from '../../img/buy_transfer_eth.svg'
import buyGMXIcon from '../../img/buy_gmx.svg'
import buyGMXBondIcon from '../../img/buy_gmx_bond.svg'

export default function BuyGMX() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="BuyGMXGLP new-update page-layout">
      <div className="BuyGMXGLP-container default-container">
        <div className="section-title-block">
          <div className="section-title-icon">
            <img src={buyTransferETHIcon} alt="buyTransferETHIcon" />
          </div>
          <div className="section-title-content">
            <div className="section-title-content__title">
              Buy/Transfer ETH
            </div>
            <div className="section-title-content__description">
              ETH is needed on Arbitrum to purchase GMX.
            </div>
          </div>
        </div>
        <div className="BuyGMXGLP-panel">
          <div className="BuyGMXGLP-block">
            <div className="BuyGMXGLP-block-title">
              Buy ETH
            </div>
            <div className="BuyGMXGLP-description">
              You can buy ETH directly on <a href="https://arbitrum.io/" target="_blank" rel="noopener noreferrer">Arbitrum</a> using Banxa:
            </div>
            <div className="direct-purchase-options">
              <a href="https://gmx.banxa.com" target="_blank" rel="noopener noreferrer" className="banxa-button">
                <img src={Banxa} alt="Banxa" />
              </a>
            </div>
          </div>
          <div className="BuyGMXGLP-block">
            <div className="BuyGMXGLP-block-title">
              Transfer ETH
            </div>
            <div className="BuyGMXGLP-description">
              You can transfer ETH from other networks to Arbitrum using any of the below options:
            </div>
            <div className="alternative-bridges">
              <a href="https://synapseprotocol.com/?inputCurrency=ETH&outputCurrency=ETH&outputChain=42161" target="_blank" rel="noopener noreferrer" className="Synapse">
                <img src={Synapse} alt="Synapse" />
              </a>
              <a href="https://anyswap.exchange/bridge#/bridge" target="_blank" rel="noopener noreferrer" className="Anyswap">
                <img src={Anyswap} alt="Anyswap" />
              </a>
              <a href="https://app.hop.exchange/send?token=USDC&sourceNetwork=ethereum&destNetwork=arbitrum" target="_blank" rel="noopener noreferrer" className="Hop">
                <img src={Hop} alt="Hop" />
              </a>
              <a href="https://binance.com/" target="_blank" rel="noopener noreferrer" className="Binance">
                <img src={Binance} alt="Binance" />
              </a>
            </div>
          </div>
        </div>
        <div className="section-title-block">
          <div className="section-title-icon">
            <img src={buyGMXIcon} alt="buyGMXIcon" />
          </div>
          <div className="section-title-content">
            <div className="section-title-content__title">
              Buy GMX
            </div>
          </div>
        </div>
        <div className="BuyGMXGLP-panel">
          <div className="BuyGMXGLP-block">
            <div className="BuyGMXGLP-description better-rates-description">
              After you have ETH, set your network to <a href="https://arbitrum.io/bridge-tutorial/" target="_blank" rel="noopener noreferrer">Arbitrum</a> then click the button below:
            </div>
            <a href="https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" target="_blank" rel="noopener noreferrer" className="BuyGMXGLP-purchase-block">
              <div className="BuyGMXGLP-purchase-block-icon">
                <img src={gmx64Icon} alt="logo" height="64px" />
              </div>
              <div className="BuyGMXGLP-purchase-block-info">
                <div className="BuyGMXGLP-purchase-block-info__title">Purchase GMX</div>
                <div className="BuyGMXGLP-purchase-block-info__subtitle">Uniswap Arbitrum</div>
              </div>
            </a>
          </div>
        </div>
        <div className="section-title-block">
          <div className="section-title-icon">
            <img src={buyGMXBondIcon} alt="buyGMXBondIcon" />
          </div>
          <div className="section-title-content">
            <div className="section-title-content__title">
              Buy GMX Bonds
            </div>
          </div>
        </div>
        <div className="BuyGMXGLP-panel">
          <div className="BuyGMXGLP-block">
            <div className="BuyGMXGLP-description">You can also purchase GMX bonds by clicking here:</div>
            <div className="GMX-block-section">
              <a href="https://pro.olympusdao.finance/#/partners/GMX" target="_blank" rel="noopener noreferrer" className="GMX-block">
                <div className="GMX-block-icon">
                  <img src={olympusIcon} alt="glpIcon" height="40px" />
                </div>
                <div className="GMX-block-content">
                  <div className="GMX-block-label">Buy GMX</div>
                  <div className="GMX-block-description">Olympus Pro</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
