import React, { useEffect } from 'react'
import Footer from "../../Footer"
import 'react-tabs/style/react-tabs.css';
import './BuyGMX.css';

import Synapse from '../../img/ic_synapse.svg'
import Multiswap from '../../img/ic_multiswap.svg'
import Hop from '../../img/ic_hop.svg'
import Banxa from '../../img/ic_banxa.svg'
import Binance from '../../img/ic_binance_logo.svg'
import gmx64Icon from '../../img/ic_gmx_30.svg'

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
              <a href="https://gmx.banxa.com" target="_blank" rel="noopener noreferrer" className="GMX-btn">
                <div className="GMX-btn-icon">
                  <img src={Banxa} alt="Banxa" />
                </div>
                <div className="GMX-btn-label">
                  Banxa
                </div>
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
                <div className="transfer-eth-icon">
                  <img src={Synapse} alt="Synapse" />
                </div>
                Synapse
              </a>
              <a href="https://app.multichain.org/#/router" target="_blank" rel="noopener noreferrer" className="Multiswap">
                <div className="transfer-eth-icon">
                  <img src={Multiswap} alt="Multiswap" />
                </div>
                Multiswap
              </a>
              <a href="https://app.hop.exchange/send?token=USDC&sourceNetwork=ethereum&destNetwork=arbitrum" target="_blank" rel="noopener noreferrer" className="Hop">
                <div className="transfer-eth-icon">
                  <img src={Hop} alt="Hop" /> </div> Hop
              </a>
              <a href="https://binance.com/" target="_blank" rel="noopener noreferrer" className="Binance">
                <div className="transfer-eth-icon"><img src={Binance} alt="Binance" /></div> Binance
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
            <div className="GMX-block-section">
              <a href="https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" target="_blank" rel="noopener noreferrer" className="GMX-btn">
                <div className="GMX-btn-icon">
                  <img src={gmx64Icon} alt="gmx64Icon" />
                </div>
                <div className="GMX-btn-label">
                  Purchase GMX
                </div>
              </a>
            </div>
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
              <a href="https://pro.olympusdao.finance/#/partners/GMX" target="_blank" rel="noopener noreferrer" className="GMX-btn">
                <div className="GMX-btn-icon">
                  <img src={olympusIcon} alt="olympusIcon" />
                </div>
                <div className="GMX-btn-label">
                  Olympus Pro
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
