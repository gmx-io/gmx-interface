import React, { useEffect, useCallback } from "react";
import Footer from "../../Footer";
import "./BuyGMX.css";

import { ARBITRUM, AVALANCHE, switchNetwork, useChainId } from "../../Helpers";

import { useWeb3React } from "@web3-react/core";

import Synapse from "../../img/ic_synapse.svg";
import Multiswap from "../../img/ic_multiswap.svg";
import Hop from "../../img/ic_hop.svg";
import Banxa from "../../img/ic_banxa.svg";
import Binance from "../../img/ic_binance_logo.svg";
import avax30Icon from "../../img/ic_avax_30.svg";
import gmxArbitrum from "../../img/ic_gmx_arbitrum.svg";
import gmxAvax from "../../img/ic_gmx_avax.svg";
import ohmArbitrum from "../../img/ic_olympus_arbitrum.svg";
import arbitrum16Icon from "../../img/ic_arbitrum_16.svg";
import avalanche16Icon from "../../img/ic_avalanche_16.svg";
import Button from "../../components/Common/Button";

export default function BuyGMX() {
  const { chainId } = useChainId();
  const { active } = useWeb3React();

  const onNetworkSelect = useCallback(
    (value) => {
      if (value === chainId) {
        return;
      }
      return switchNetwork(value, active);
    },
    [chainId, active]
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="BuyGMXGLP default-container page-layout">
      <div className="BuyGMXGLP-container">
        {chainId === ARBITRUM && (
          <div className="section-title-block">
            <div className="section-title-content">
              <div className="Page-title">Buy / Transfer ETH</div>
              <div className="Page-description">
                ETH is needed on Arbitrum to purchase GMX.
                <br />
                To purchase GMX on{" "}
                <span onClick={() => onNetworkSelect(AVALANCHE)}>
                  Avalanche <img src={avalanche16Icon} alt="avalanche16Icon" />
                </span>
                , please change your network.
              </div>
            </div>
          </div>
        )}
        {chainId === ARBITRUM && (
          <div className="BuyGMXGLP-panel">
            <div className="App-card no-height">
              <div className="App-card-title">Buy ETH</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="BuyGMXGLP-description">
                  You can buy ETH directly on{" "}
                  <a href="https://arbitrum.io/" target="_blank" rel="noopener noreferrer">
                    Arbitrum
                  </a>{" "}
                  using Banxa:
                </div>
                <div className="direct-purchase-options">
                  <Button
                    href="https://gmx.banxa.com?coinType=ETH&fiatType=USD&fiatAmount=500&blockchain=arbitrum"
                    imgSrc={Banxa}
                  >
                    Banxa
                  </Button>
                </div>
              </div>
            </div>
            <div className="App-card no-height">
              <div className="App-card-title">Transfer ETH</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="BuyGMXGLP-description">
                  You can also transfer ETH from other networks to Arbitrum using any of the below options:
                </div>
                <div className="bridge-options">
                  <Button
                    href="https://synapseprotocol.com/?inputCurrency=ETH&outputCurrency=ETH&outputChain=42161"
                    align="left"
                    imgSrc={Synapse}
                  >
                    Synapse
                  </Button>
                  <Button href="https://app.multichain.org/#/router" align="left" imgSrc={Multiswap}>
                    Multiswap
                  </Button>
                  <Button
                    href="https://app.hop.exchange/send?token=ETH&sourceNetwork=ethereum&destNetwork=arbitrum"
                    align="left"
                    imgSrc={Hop}
                  >
                    Hop
                  </Button>
                  <Button href="https://binance.com/" align="left" imgSrc={Binance}>
                    Binance
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {chainId === AVALANCHE && (
          <div className="section-title-block">
            <div className="section-title-content">
              <div className="Page-title">Buy / Transfer AVAX</div>
              <div className="Page-description">
                Avax is needed on Avalanche to purchase GMX.
                <br />
                To purchase GMX on{" "}
                <span onClick={() => onNetworkSelect(ARBITRUM)}>
                  Arbitrum <img src={arbitrum16Icon} alt="arbitrum16Icon" />
                </span>
                , please change your network.
              </div>
            </div>
          </div>
        )}
        {chainId === AVALANCHE && (
          <div className="BuyGMXGLP-panel">
            <div className="App-card no-height">
              <div className="App-card-title">Buy AVAX</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="BuyGMXGLP-description">
                  You can buy AVAX directly on{" "}
                  <a href="https://www.avax.network/" target="_blank" rel="noopener noreferrer">
                    Avalanche
                  </a>{" "}
                  using Banxa:
                </div>
                <div className="direct-purchase-options">
                  <Button
                    href="https://gmx.banxa.com?coinType=AVAX&fiatType=USD&fiatAmount=500&blockchain=avalanche"
                    imgSrc={Banxa}
                  >
                    Banxa
                  </Button>
                </div>
              </div>
            </div>
            <div className="App-card no-height">
              <div className="App-card-title">Transfer AVAX</div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="BuyGMXGLP-description">
                  You can also transfer AVAX to Avalanche using any of the below options. <br />
                  <br />
                  If you use the Avalanche or Synapse bridges, you can transfer any other supported cryptocurrency, and
                  receive AVAX to pay for the network fees.
                </div>
                <div className="bridge-options">
                  <Button align="left" href="https://bridge.avax.network/" imgSrc={avax30Icon}>
                    Avalanche
                  </Button>
                  <Button align="left" href="https://synapseprotocol.com/" imgSrc={Synapse}>
                    Synapse
                  </Button>
                  <Button align="left" href="https://app.multichain.org/" imgSrc={Multiswap}>
                    Multiswap
                  </Button>
                  <Button align="left" href="https://binance.com" imgSrc={Binance}>
                    Binance
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {chainId === AVALANCHE && (
          <div className="BuyGMXGLP-panel">
            <div className="buy-card">
              <div className="section-title-content">
                <div className="card-title">Buy GMX</div>
              </div>
              <div className="App-card no-height">
                <div className="App-card-content no-title">
                  <div className="BuyGMXGLP-description better-rates-description">
                    After you have AVAX, set your network to{" "}
                    <a
                      href="https://support.avax.network/en/articles/4626956-how-do-i-set-up-metamask-on-avalanche"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Avalanche
                    </a>
                    , then click the button below:
                  </div>
                  <div className="direct-purchase-options">
                    <Button
                      size="xl"
                      imgSrc={gmxAvax}
                      href="https://traderjoexyz.com/trade?outputCurrency=0x62edc0692BD897D2295872a9FFCac5425011c661#/"
                    >
                      Purchase GMX
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {chainId === ARBITRUM && (
          <div className="BuyGMXGLP-panel">
            <div className="buy-card">
              <div className="section-title-content">
                <div className="card-title">Buy GMX</div>
              </div>
              <div className="App-card no-height">
                <div className="App-card-content no-title">
                  <div className="BuyGMXGLP-description better-rates-description">
                    After you have ETH, set your network to{" "}
                    <a href="https://arbitrum.io/bridge-tutorial/" target="_blank" rel="noopener noreferrer">
                      Arbitrum
                    </a>{" "}
                    then click the button below:
                  </div>
                  <div className="buy-gmx">
                    <Button
                      size="xl"
                      imgSrc={gmxArbitrum}
                      href="https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a"
                    >
                      Purchase GMX
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="buy-card">
              <div className="section-title-content">
                <div className="card-title">Buy GMX Bonds</div>
              </div>
              <div className="App-card no-height">
                <div className="App-card-content no-title">
                  <div className="BuyGMXGLP-description">
                    GMX bonds can be bought on Olympus Pro with a discount and a small vesting period:
                  </div>
                  <div className="buy-gmx">
                    <Button size="xl" imgSrc={ohmArbitrum} href="https://pro.olympusdao.finance/#/partners/GMX">
                      Olympus Pro
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
