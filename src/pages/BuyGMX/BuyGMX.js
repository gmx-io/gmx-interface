import React, { useCallback } from "react";
import Footer from "components/Footer/Footer";
import "./BuyGMX.css";
import { SwapWidget, darkTheme } from "@uniswap/widgets";
import "@uniswap/widgets/fonts.css";

import { useWeb3React } from "@web3-react/core";

import Synapse from "img/ic_synapse.svg";
import Multiswap from "img/ic_multiswap.svg";
import Hop from "img/ic_hop.svg";
import Banxa from "img/ic_banxa.svg";
import Bungee from "img/bungee.png";
import O3 from "img/o3.png";
import Crypto_com from "img/crypto_com.svg";
import Binance from "img/binance.svg";
import Bybit from "img/bybit.svg";
import Ftx from "img/ftx.svg";
import avax30Icon from "img/ic_avax_30.svg";
import gmxAvax from "img/ic_gmx_avax.svg";
import ohmArbitrum from "img/ic_olympus_arbitrum.svg";

import { Trans } from "@lingui/macro";
import Button from "components/Common/Button";
import { ARBITRUM, AVALANCHE, getChainName } from "config/chains";
import { switchNetwork } from "lib/wallets";
import { useChainId } from "lib/chains";
import Card from "components/Common/Card";
import { getContract } from "config/contracts";

const uniswapWidgetTheme = {
  ...darkTheme,
  fontFamily: "Relative, sans-serif",
  borderRadius: 0.4,
  darkTheme: true,
  container: "#20253f",
  interactive: "#16182e",
  module: "#222633",
  accent: "#2d42fc",
};

const TOKEN_LIST = [
  {
    name: "GMX",
    address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    symbol: "GMX",
    decimals: 18,
    chainId: 42161,
    logoURI:
      "https://github.com/trustwallet/assets/blob/master/blockchains/arbitrum/assets/0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a/logo.png?raw=true",
  },
  {
    name: "Dai Stablecoin",
    address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    symbol: "DAI",
    decimals: 18,
    chainId: 42161,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png",
  },
  {
    name: "Tether USD",
    address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    symbol: "USDT",
    decimals: 6,
    chainId: 42161,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
  },
  {
    name: "USD Coin",
    address: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    symbol: "USDC",
    decimals: 6,
    chainId: 42161,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
  },
];

export default function BuyGMX() {
  const { chainId } = useChainId();
  const { active } = useWeb3React();
  const links = {
    getBungeeUrl: () =>
      `https://multitx.bungee.exchange/?toChainId=${chainId}&toTokenAddress=${getContract(chainId, "GMX")}`,
    getBanxaUrl: () =>
      `https://gmx.banxa.com?coinType=ETH&fiatType=USD&fiatAmount=500&blockchain=${getChainName(chainId)}`,
    getO3Url: () => "https://o3swap.com/",
  };

  const onNetworkSelect = useCallback(
    (value) => {
      if (value === chainId) {
        return;
      }
      return switchNetwork(value, active);
    },
    [chainId, active]
  );

  return (
    <div className="BuyGMXGLP default-container page-layout">
      <div className="BuyGMXGLP-container">
        {chainId === ARBITRUM && (
          <div className="section-title-block">
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>Buy GMX on Arbitrum</Trans>
              </div>
              <div className="Page-description">
                <Trans>Choose to buy from decentralized or centralized exchanges.</Trans>
                <br />
                <Trans>
                  To purchase GMX on the Avalanche blockchain, please{" "}
                  <span onClick={() => onNetworkSelect(AVALANCHE)}>change your network</span>.
                </Trans>
              </div>
            </div>
          </div>
        )}
        {chainId === AVALANCHE && (
          <div className="section-title-block">
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>Buy GMX on Avalanche</Trans>
              </div>
              <div className="Page-description">
                <Trans>Choose to buy from decentralized or centralized exchanges.</Trans>
                <br />
                <Trans>
                  To purchase GMX on the Arbitrum blockchain, please{" "}
                  <span onClick={() => onNetworkSelect(ARBITRUM)}>change your network</span>.
                </Trans>
              </div>
            </div>
          </div>
        )}
        <div className="cards-row">
          {chainId === ARBITRUM && (
            <Card title="Buy GMX on Uniswap Arbitrum">
              <div>
                <p className="card-description">
                  If you already have ETH on Arbitrum, you can directly purchase GMX on Uniswap. Set your network to
                  Arbitrum and use the widget below:
                </p>
                <div className="Uniswap">
                  <SwapWidget
                    tokenList={TOKEN_LIST}
                    width="100%"
                    theme={uniswapWidgetTheme}
                    defaultChainId={ARBITRUM}
                    defaultOutputTokenAddress={{ [ARBITRUM]: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" }}
                  />
                </div>
              </div>
            </Card>
          )}
          {chainId === AVALANCHE && (
            <Card title="Buy GMX on Avalanche">
              <div className="direct-purchase-options">
                <Button
                  size="xl"
                  imgSrc={gmxAvax}
                  href="https://traderjoexyz.com/trade?outputCurrency=0x62edc0692BD897D2295872a9FFCac5425011c661#/"
                >
                  <Trans>Purchase GMX</Trans>
                </Button>
              </div>
            </Card>
          )}

          <Card title="Buy GMX from any network, token, or FIAT using centralized exchanges.">
            <div className="App-card-content">
              <div className="BuyGMXGLP-description">
                <Trans>Buy GMX using multiple tokens from any network:</Trans>
              </div>
              <div className="buttons-group">
                <Button href={links.getBungeeUrl()} align="left" imgSrc={Bungee}>
                  Bungee
                </Button>
                <Button href={links.getBanxaUrl()} align="left" imgSrc={Banxa}>
                  Banxa
                </Button>
                <Button href={links.getO3Url()} align="left" imgSrc={O3}>
                  O3
                </Button>
              </div>
              <div className="BuyGMXGLP-description">
                <Trans>Buy GMX using FIAT:</Trans>
              </div>
              <div className="buttons-group">
                <Button href={links.getBanxaUrl()} align="left" imgSrc={Banxa}>
                  Banxa
                </Button>
                <Button href="https://crypto.com/exchange/trade/spot/GMX_USDT" align="left" imgSrc={Crypto_com}>
                  Crypto.com
                </Button>
              </div>
              <div className="BuyGMXGLP-description">
                <Trans>Buy GMX from other exchanges:</Trans>
              </div>
              <div className="buttons-group">
                <Button href="https://www.binance.com/en/trade/GMX_USDT?_from=markets" align="left" imgSrc={Binance}>
                  Binance
                </Button>
                <Button href="https://www.bybit.com/en-US/trade/spot/GMX/USDT" align="left" imgSrc={Bybit}>
                  Bybit
                </Button>
                <Button href="https://ftx.com/trade/GMX/USD" align="left" imgSrc={Ftx}>
                  FTX
                </Button>
              </div>
              {chainId === ARBITRUM && (
                <>
                  <div className="BuyGMXGLP-description">
                    <Trans>Buy GMX Bonds:</Trans>
                  </div>
                  <div className="buttons-group">
                    <Button size="xl" imgSrc={ohmArbitrum} href="https://pro.olympusdao.finance/#/partners/GMX">
                      <Trans>Olympus Pro</Trans>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {chainId === ARBITRUM && (
          <div className="section-title-block mt-top">
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>Buy or Transfer ETH to Arbitrum</Trans>
              </div>
              <div className="Page-description">
                <Trans>
                  If you wish, you can buy ETH directly to Arbitrum or use one option to transfer it to Arbitrum.
                </Trans>
              </div>
            </div>
          </div>
        )}

        {chainId === AVALANCHE && (
          <div className="section-title-block mt-top">
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>Buy or Transfer AVAX to Avalanche</Trans>
              </div>
              <div className="Page-description">
                <Trans>
                  If you wish, you can buy AVAX directly to Avalanche or use one option to transfer it to Avalanche.
                </Trans>
              </div>
            </div>
          </div>
        )}
        {chainId === ARBITRUM && (
          <div className="BuyGMXGLP-panel">
            <div className="App-card no-height">
              <div className="App-card-title">
                <Trans>Buy ETH</Trans>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="BuyGMXGLP-description">
                  <Trans>
                    You can buy ETH directly on{" "}
                    <a href="https://arbitrum.io/" target="_blank" rel="noopener noreferrer">
                      Arbitrum
                    </a>{" "}
                    using these options:
                  </Trans>
                </div>
                <div className="buttons-group">
                  <Button href={links.getBungeeUrl()} imgSrc={Bungee}>
                    Bungee
                  </Button>
                  <Button href={links.getBanxaUrl()} imgSrc={Banxa}>
                    Banxa
                  </Button>
                  <Button href={links.getO3Url()} imgSrc={O3}>
                    O3
                  </Button>
                  <Button href="https://ftx.com/trade/ETH/USD" align="left" imgSrc={Ftx}>
                    FTX
                  </Button>
                </div>
              </div>
            </div>
            <div className="App-card no-height">
              <div className="App-card-title">
                <Trans>Transfer ETH</Trans>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="BuyGMXGLP-description">
                  <Trans>You can transfer ETH from other networks to Arbitrum using any of the below options:</Trans>
                </div>
                <div className="buttons-group">
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
                  <Button href={links.getBungeeUrl()} align="left" imgSrc={Bungee}>
                    Bungee
                  </Button>
                  <Button href={links.getO3Url()} align="left" imgSrc={O3}>
                    O3
                  </Button>
                  <Button href="https://ftx.com/trade/ETH/USD" align="left" imgSrc={Ftx}>
                    FTX
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {chainId === AVALANCHE && (
          <div className="BuyGMXGLP-panel">
            <div className="App-card no-height">
              <div className="App-card-title">
                <Trans>Buy AVAX</Trans>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="BuyGMXGLP-description">
                  <Trans>
                    You can buy AVAX directly on{" "}
                    <a href="https://www.avax.network/" target="_blank" rel="noopener noreferrer">
                      Avalanche
                    </a>{" "}
                    using Banxa:
                  </Trans>
                </div>
                <div className="buttons-group">
                  <Button href={links.getBungeeUrl()} imgSrc={Bungee}>
                    Bungee
                  </Button>
                  <Button href={links.getBanxaUrl()} imgSrc={Banxa}>
                    Banxa
                  </Button>
                  <Button href={links.getO3Url()} imgSrc={O3}>
                    O3
                  </Button>
                  <Button href="https://ftx.com/trade/ETH/USD" align="left" imgSrc={Ftx}>
                    FTX
                  </Button>
                </div>
              </div>
            </div>
            <div className="App-card no-height">
              <div className="App-card-title">
                <Trans>Transfer AVAX</Trans>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="BuyGMXGLP-description">
                  <Trans>You can transfer AVAX to Avalanche using any of the below options.</Trans> <br />
                  <br />
                  <Trans>
                    Using the Avalanche or Synapse bridges, you can also transfer any other supported cryptocurrency,
                    and receive free AVAX to pay for the network's fees.
                  </Trans>
                </div>
                <div className="buttons-group">
                  <Button align="left" href="https://bridge.avax.network/" imgSrc={avax30Icon}>
                    <Trans>Avalanche</Trans>
                  </Button>
                  <Button align="left" href="https://synapseprotocol.com/" imgSrc={Synapse}>
                    <Trans>Synapse</Trans>
                  </Button>
                  <Button align="left" href="https://app.multichain.org/" imgSrc={Multiswap}>
                    <Trans>Multiswap</Trans>
                  </Button>
                  <Button align="left" href="https://binance.com" imgSrc={Binance}>
                    <Trans>Binance</Trans>
                  </Button>
                  <Button href={links.getBungeeUrl()} align="left" imgSrc={Bungee}>
                    Bungee
                  </Button>
                  <Button href={links.getO3Url()} align="left" imgSrc={O3}>
                    O3
                  </Button>
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
