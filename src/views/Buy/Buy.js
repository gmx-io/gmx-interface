import React, { useEffect } from 'react'
import { useHistory } from "react-router-dom";
import Footer from "../../Footer"
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import './Buy.css';

import BuyGlp from '../BuyGlp/BuyGlp'
import SellGlp from '../SellGlp/SellGlp'

import Synapse from '../../img/Synapse.svg'
import Anyswap from '../../img/Anyswap.png'
import Hop from '../../img/Hop_dark.png'
import Banxa from '../../img/Banxa.png'
import gmx64Icon from '../../img/ic_gmx_64.svg'

// import glpIcon from '../../img/ic_glp_40.svg'
import olympusIcon from '../../img/ic_olympus.svg'

import gmx24Icon from '../../img/ic_gmx_24.svg'
import glp24Icon from '../../img/ic_glp_24.svg'

const TAB_NO = ['','glp','sell_glp']

export default function BuyGMXGLP(props) {
  const history = useHistory()
  const activeTabNo = TAB_NO.indexOf(history.location.hash.replace('#', ''))
  
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const onSelectTab = (index) => {
    history.push(`${history.location.pathname}${TAB_NO[index]?`#${TAB_NO[index]}`:''}`)
  }

  return (
    <div className="BuyGMXGLP new-update page-layout">
      <div className="BuyGMXGLP-container default-container">
        <Tabs defaultIndex={activeTabNo} onSelect={onSelectTab}>
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
            <div className="BuyGMXGLP-panel">
              <div className="BuyGMXGLP-block">
                <div className="BuyGMXGLP-description">
                  To purchase <a href="https://gmxio.gitbook.io/gmx/tokenomics" target="_blank" rel="noopener noreferrer">GMX</a> you must first have ETH on <a href="https://arbitrum.io/" target="_blank" rel="noopener noreferrer">Arbitrum</a>.<br />
                  You can buy ETH directly on Arbitrum using Banxa.<br />
                </div>
                <div className="direct-purchase-options">
                    <a href="https://gmx.banxa.com" target="_blank" rel="noopener noreferrer" className="banxa-button">
                      <img src={Banxa} alt="Banxa" />
                    </a>
                  </div>
              </div>
              <div className="BuyGMXGLP-block">
                <div className="BuyGMXGLP-description">
                  If you have ETH on other networks you can transfer ETH to Arbitrum.<br />
                  Transfers using the below options will take a few minutes.
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
                </div>
              </div>
              <div className="BuyGMXGLP-block">
                <div className="BuyGMXGLP-description better-rates-description">
                  After you have ETH, set your wallet network to <a href="https://arbitrum.io/bridge-tutorial/" target="_blank" rel="noopener noreferrer">Arbitrum</a> then click on the button below. <br/>
                  GMX liquidity is not available on Avalanche yet, it will be available in a few weeks time.
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
              <div className="BuyGMXGLP-block">
                <div className="BuyGMXGLP-description">You can also buy GMX via Olympus Pro bonds with a discount and a small vesting period.</div>
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
