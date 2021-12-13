import React, { useEffect } from 'react'
import Footer from "../../Footer"
import {
  NavLink
} from 'react-router-dom'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import './Buy.css';

import BuyGlp from '../BuyGlp/BuyGlp'
import SellGlp from '../SellGlp/SellGlp'

import Synapse from '../../img/Synapse.svg'
import Anyswap from '../../img/Anyswap.png'
import Hop from '../../img/Hop.png'
import logo from '../../img/gmx_logo.svg'
import glpIcon from '../../img/glp_icon.svg'

import gmx24Icon from '../../img/ic_gmx_24.svg'
import glp24Icon from '../../img/ic_glp_24.svg'

export default function BuyGMXGLP(props) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="BuyGMXGLP">
      <div className="BuyGMXGLP-container default-container">
        <Tabs>
          <TabList>
            <Tab>
              <div className="BuyGMXGLP-Tabitem-content">
                <img src={gmx24Icon} alt="gmx24Icon" />
                <span>Buy GMX</span>
              </div>
            </Tab>
            <Tab>
              <div className="BuyGMXGLP-Tabitem-content">
                <img src={glp24Icon} alt="glp24Icon" />
                <span>Buy GLP</span>
              </div>
            </Tab>
            <Tab>
              <div className="BuyGMXGLP-Tabitem-content">
                <img src={glp24Icon} alt="glp24Icon" />
                <span>Sell GLP</span>
              </div>
            </Tab>
          </TabList>

          <TabPanel>
            <div className="BuyGMXGLP-title-section">
              <div className="BuyGMXGLP-title">Buy GMX</div>
              <div className="BuyGMXGLP-description">
                To purchase GMX you must first transfer ETH to Arbitrum.<br/>
                Follow this <a href="https://arbitrum.io/bridge-tutorial/" target="_blank" rel="noopener noreferrer">tutorial</a> and check the options below for better transfer rates.
              </div>
              <div className="alternative-bridges">
                <a href="https://synapseprotocol.com/?inputCurrency=ETH&outputCurrency=ETH&outputChain=42161" target="_blank" rel="noopener noreferrer" className="Synapse">
                  <img src={Synapse} alt="Synapse" />
                </a>
                <a href="https://anyswap.exchange/bridge#/bridge" target="_blank" rel="noopener noreferrer" className="Anyswap">
                  <img src={Anyswap} alt="Anyswap" />
                </a>
                <a href="https://app.hop.exchange/send?token=USDC&sourceNetwork=ethereum&destNetwork=arbitrum" target="_blank" rel="noopener noreferrer">
                  <img src={Hop} alt="Hop" />
                </a>
              </div>
              <p className="BuyGMXGLP-description">Learn more at <a href="https://gmxio.gitbook.io/gmx/tokenomics" target="_blank" rel="noopener noreferrer">https://gmxio.gitbook.io/gmx/tokenomics</a></p>
              <div className="BuyGMXGLP-description better-rates-description">
                After transferring ETH, set your wallet network to <a href="https://arbitrum.io/bridge-tutorial/" target="_blank" rel="noopener noreferrer">Arbitrum</a> then click on the button below:
              </div>
              <a href="https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" target="_blank" rel="noopener noreferrer" className="BuyGMXGLP-purchase-block">
                <div className="BuyGMXGLP-purchase-block-icon">
                  <img src={logo} alt="logo" height="53px" />
                </div>
                <div className="BuyGMXGLP-purchase-block-info">
                  <div className="BuyGMXGLP-purchase-block-info__title">Buy GMX</div>
                  <div className="BuyGMXGLP-purchase-block-info__subtitle">Uniswap Arbitrum</div>
                </div>
              </a>
              <div className="BuyGMXGLP-description">If you wish to buy GLP instead, you can find more info at <a href="https://gmxio.gitbook.io/gmx/glp" target="_blank" rel="noopener noreferrer">https://gmxio.gitbook.io/gmx/glp</a>.</div>
              <div className="GLP-block-section">
                <NavLink to="/buy_glp" className="GLP-block">
                  <div className="GLP-block-icon">
                    <img src={glpIcon} alt="glpIcon" height="40px" />
                  </div>
                  <div className="GLP-block-label">Buy GLP</div>
                </NavLink>
                <NavLink to="/sell_glp" className="GLP-block">
                  <div className="GLP-block-icon">
                    <img src={glpIcon} alt="glpIcon" height="40px" />
                  </div>
                  <div className="GLP-block-label">Sell GLP</div>
                </NavLink>
              </div>
            </div>
          </TabPanel>
          <TabPanel>
            <BuyGlp
              {...props}
            />
          </TabPanel>
          <TabPanel>
            <SellGlp
              {...props}
            />
          </TabPanel>
        </Tabs>
      </div>
      <Footer />
    </div>
  )
}
