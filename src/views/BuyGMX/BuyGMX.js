import React, { useEffect, useCallback } from 'react'
import Footer from "../../Footer"
import './BuyGMX.css';

import {
  ARBITRUM,
  AVALANCHE,
  switchNetwork,
  useChainId
} from '../../Helpers'

import { useWeb3React } from '@web3-react/core'

import Synapse from '../../img/ic_synapse.svg'
import Multiswap from '../../img/ic_multiswap.svg'
import Hop from '../../img/ic_hop.svg'
import Banxa from '../../img/ic_banxa.svg'
import Binance from '../../img/ic_binance_logo.svg'
import gmx64Icon from '../../img/ic_gmx_30.svg'
import avax30Icon from '../../img/ic_avax_30.svg'

import olympusIcon from '../../img/ic_olympus.svg'
import buyTransferETHIcon from '../../img/buy_transfer_eth.svg'
import buyTransferAVAXIcon from '../../img/ic_transfer_avax.svg'
import buyGMXIcon from '../../img/buy_gmx.svg'
import buyGMXBondIcon from '../../img/buy_gmx_bond.svg'

import arbitrum16Icon from '../../img/ic_arbitrum_16.svg'
import avalanche16Icon from '../../img/ic_avalanche_16.svg'

export default function BuyGMX() {
  const { chainId } = useChainId()
  const { active } = useWeb3React()

  const onNetworkSelect = useCallback(value => {
    if (value === chainId) {
      return
    }
    return switchNetwork(value, active)
  }, [chainId, active])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="BuyGMXGLP page-layout">
      <div className="BuyGMXGLP-container default-container">
        {chainId === ARBITRUM && <div className="section-title-block">
          <div className="section-title-icon">
            <img src={buyTransferETHIcon} alt="buyTransferETHIcon" />
          </div>
          <div className="section-title-content">
            <div className="section-title-content__title">
              Buy/Transfer ETH
            </div>
            <div className="section-title-content__description">
              ETH is needed on Arbitrum to purchase GMX.<br/>
              To purchase GMX on <span onClick={() => onNetworkSelect(AVALANCHE)}>Avalanche <img src={avalanche16Icon} alt="avalanche16Icon" /></span>, please change your network.
            </div>
          </div>
        </div>}
        {chainId === AVALANCHE && <div className="section-title-block">
          <div className="section-title-icon">
            <img src={buyTransferAVAXIcon} alt="buyTransferAVAXIcon" />
          </div>
          <div className="section-title-content">
            <div className="section-title-content__title">
              Transfer AVAX
            </div>
            <div className="section-title-content__description">
              Avax is needed on Avalanche to purchase GMX.<br/>
              To purchase GMX on <span onClick={() => onNetworkSelect(ARBITRUM)}>Arbitrum <img src={arbitrum16Icon} alt="arbitrum16Icon" /></span>, please change your network.
            </div>
          </div>
        </div>}
        {chainId === ARBITRUM && <div className="BuyGMXGLP-panel">
          <div className="App-card App-card--densed">
            <div className="App-card-title">
              Buy ETH
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="BuyGMXGLP-description">
                You can buy ETH directly on <a href="https://arbitrum.io/" target="_blank" rel="noopener noreferrer">Arbitrum</a> using Banxa:
              </div>
              <div className="direct-purchase-options">
                <a href="https://gmx.banxa.com" target="_blank" rel="noopener noreferrer" className="GMX-btn">
                  <div className="GMX-btn-icon-block">
                    <div className="GMX-btn-icon">
                      <img src={Banxa} alt="Banxa" />
                    </div>
                  </div>
                  <div className="GMX-btn-label">
                    Banxa
                  </div>
                </a>
              </div>
            </div>
          </div>
          <div className="App-card App-card--densed">
            <div className="App-card-title">
              Transfer ETH
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
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
                <a href="https://app.hop.exchange/send?token=ETH&sourceNetwork=ethereum&destNetwork=arbitrum" target="_blank" rel="noopener noreferrer" className="Hop">
                  <div className="transfer-eth-icon">
                    <img src={Hop} alt="Hop" /> </div> Hop
                </a>
                <a href="https://binance.com/" target="_blank" rel="noopener noreferrer" className="Binance">
                  <div className="transfer-eth-icon"><img src={Binance} alt="Binance" /></div> Binance
                </a>
              </div>
            </div>
          </div>
        </div>}
        {chainId === AVALANCHE && <div className="BuyGMXGLP-panel">
          <div className="App-card App-card--densed">
            <div className="App-card-title">
              Transfer AVAX
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="BuyGMXGLP-description">
                You can transfer AVAX to Avalanche using any of the below options. <br/><br/>
                Using the Avalanche or Synapse bridges, you can also transfer any other supported cryptocurrency, and receive free AVAX to pay for the network's fees.
              </div>
              <div className="alternative-bridges">
                <a href="https://bridge.avax.network/" target="_blank" rel="noopener noreferrer" className="Avax">
                  <div className="transfer-eth-icon">
                    <img src={avax30Icon} alt="avax30Icon" />
                  </div>
                  Avalanche
                </a>
                <a href="https://synapseprotocol.com/" target="_blank" rel="noopener noreferrer" className="Synapse">
                  <div className="transfer-eth-icon">
                    <img src={Synapse} alt="Synapse" />
                  </div>
                  Synapse
                </a>
                <a href="https://app.multichain.org/" target="_blank" rel="noopener noreferrer" className="Multiswap">
                  <div className="transfer-eth-icon">
                    <img src={Multiswap} alt="Multiswap" />
                  </div>
                  Multiswap
                </a>
                <a href="https://app.hop.exchange/" target="_blank" rel="noopener noreferrer" className="Hop">
                  <div className="transfer-eth-icon">
                    <img src={Hop} alt="Hop" /> </div> Hop
                </a>
                <a href="https://binance.com" target="_blank" rel="noopener noreferrer" className="Binance">
                  <div className="transfer-eth-icon"><img src={Binance} alt="Binance" /></div> Binance
                </a>
              </div>
            </div>
          </div>
        </div>}
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
          {chainId === ARBITRUM && <div className="App-card App-card--densed">
            <div className="App-card-content no-title">
              <div className="BuyGMXGLP-description better-rates-description">
                After you have ETH, set your network to <a href="https://arbitrum.io/bridge-tutorial/" target="_blank" rel="noopener noreferrer">Arbitrum</a> then click the button below:
              </div>
              <div className="GMX-block-section">
                <a href="https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" target="_blank" rel="noopener noreferrer" className="GMX-btn">
                  <div className="GMX-btn-icon-block">
                    <div className="GMX-btn-icon">
                      <img src={gmx64Icon} alt="gmx64Icon" />
                      <div className="GMX-btn-icon-network">
                        <img src={arbitrum16Icon} alt="arbitrum16Icon" />
                      </div>
                    </div>
                  </div>
                  <div className="GMX-btn-label">
                    Purchase GMX
                  </div>
                </a>
              </div>
            </div>
          </div>}
          {chainId === AVALANCHE && <div className="App-card App-card--densed">
            <div className="App-card-content no-title">
              <div className="BuyGMXGLP-description better-rates-description">
                After you have AVAX, set your network to Avalanche then click the button below:
              </div>
              <div className="GMX-block-section">
                <a href="https://traderjoexyz.com/#/trade?outputCurrency=0x62edc0692BD897D2295872a9FFCac5425011c661" target="_blank" rel="noopener noreferrer" className="GMX-btn">
                  <div className="GMX-btn-icon-block">
                    <div className="GMX-btn-icon">
                      <img src={gmx64Icon} alt="gmx64Icon" />
                      <div className="GMX-btn-icon-network">
                        <img src={avalanche16Icon} alt="avalanche16Icon" />
                      </div>
                    </div>
                  </div>
                  <div className="GMX-btn-label">
                    Purchase GMX
                  </div>
                </a>
              </div>
            </div>
          </div>}
        </div>
        {chainId === ARBITRUM && <div className="section-title-block">
          <div className="section-title-icon">
            <img src={buyGMXBondIcon} alt="buyGMXBondIcon" />
          </div>
          <div className="section-title-content">
            <div className="section-title-content__title">
              Buy GMX Bonds
            </div>
          </div>
        </div>}
        {chainId === ARBITRUM && <div className="BuyGMXGLP-panel">
          <div className="App-card App-card--densed">
            <div className="App-card-content no-title">
              <div className="BuyGMXGLP-description">GMX bonds can be bought on Olympus Pro with a discount and a small vesting period:</div>
              <div className="GMX-block-section">
                <a href="https://pro.olympusdao.finance/#/partners/GMX" target="_blank" rel="noopener noreferrer" className="GMX-btn">
                  <div className="GMX-btn-icon-block">
                    <div className="GMX-btn-icon">
                      <img src={olympusIcon} alt="olympusIcon" />
                      <div className="GMX-btn-icon-network">
                        <img src={arbitrum16Icon} alt="arbitrum16Icon" />
                      </div>
                    </div>
                  </div>
                  <div className="GMX-btn-label">
                    Olympus Pro
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>}
      </div>
      <Footer />
    </div>
  )
}
