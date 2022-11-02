import React, { useCallback } from "react";
import Footer from "components/Footer/Footer";
import "./BuyGMX.css";
import { useWeb3React } from "@web3-react/core";

import { Trans, t } from "@lingui/macro";
import Button from "components/Common/Button";
import { ARBITRUM, AVALANCHE, getChainName } from "config/chains";
import { switchNetwork } from "lib/wallets";
import { useChainId } from "lib/chains";
import Card from "components/Common/Card";
import { getContract } from "config/contracts";

import Synapse from "img/ic_synapse.svg";
import Multiswap from "img/ic_multiswap.svg";
import Hop from "img/ic_hop.svg";
import Banxa from "img/ic_banxa.svg";
import Bungee from "img/bungee.png";
import O3 from "img/o3.png";
import Crypto_com from "img/crypto_com.svg";
import Binance from "img/binance.svg";
import Huobi from "img/huobi.svg";
import Bybit from "img/bybit.svg";
import Ftx from "img/ftx.svg";
import avax30Icon from "img/ic_avax_30.svg";
import gmxAvax from "img/ic_gmx_avax.svg";
import gmxArbitrum from "img/ic_gmx_arbitrum.svg";
import ohmArbitrum from "img/ic_olympus_arbitrum.svg";
import Kucoin from "img/kucoin.svg";
import OneInch from "img/ic_1inch.svg";
import Dodo from "img/ic_dodo.svg";
import Firebird from "img/ic_firebird.png";
import Matcha from "img/ic_matcha.png";
import Odos from "img/ic_odos.png";
import Openocean from "img/ic_openocean.svg";
import Paraswap from "img/ic_paraswap.svg";
import Slingshot from "img/ic_slingshot.svg";
import YieldYak from "img/ic_yield_yak.png";
import Across from "img/ic_across.svg";
import Arbitrum from "img/ic_arbitrum_24.svg";
import { getNativeToken } from "config/tokens";

const CENTRALISED_EXCHANGES = [
  {
    name: "Binance",
    icon: Binance,
    link: "https://www.binance.com/en/trade/GMX_USDT?_from=markets",
  },
  {
    name: "Bybit",
    icon: Bybit,
    link: "https://www.bybit.com/en-US/trade/spot/GMX/USDT",
  },
  {
    name: "FTX",
    icon: Ftx,
    link: "https://ftx.com/trade/GMX/USD",
  },
  {
    name: "Crypto.com",
    icon: Crypto_com,
    link: "https://crypto.com/exchange/trade/spot/GMX_USDT",
  },
  {
    name: "Kucoin",
    icon: Kucoin,
    link: "https://www.kucoin.com/trade/GMX-USDT",
  },
  {
    name: "Huobi",
    icon: Huobi,
    link: "https://www.huobi.com/en-us/exchange/gmx_usdt/",
  },
];

const DECENTRALISED_AGGRIGATORS = [
  {
    name: "1inch",
    icon: OneInch,
    link: "https://app.1inch.io/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Matcha",
    icon: Matcha,
    link: "https://www.matcha.xyz/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Paraswap",
    icon: Paraswap,
    link: "https://www.paraswap.io/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Firebird",
    icon: Firebird,
    link: "https://firebird.finance/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "OpenOcean",
    icon: Openocean,
    link: "https://openocean.finance/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "DODO",
    icon: Dodo,
    link: "https://dodoex.io/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Odos",
    icon: Odos,
    link: "https://app.odos.xyz/",
    networks: [ARBITRUM],
  },
  {
    name: "Slingshot",
    icon: Slingshot,
    link: "https://slingshot.finance/",
    networks: [ARBITRUM],
  },
  {
    name: "Yieldyak",
    icon: YieldYak,
    link: "https://yieldyak.com/swap",
    networks: [AVALANCHE],
  },
];

export default function BuyGMX() {
  const { chainId } = useChainId();
  const isArbitrum = chainId === ARBITRUM;
  const { active } = useWeb3React();
  const { symbol: nativeTokenSymbol } = getNativeToken(chainId);

  const EXCHANGE_LINKS = {
    getBungeeUrl: () =>
      `https://multitx.bungee.exchange/?toChainId=${chainId}&toTokenAddress=${getContract(chainId, "GMX")}`,
    getBanxaUrl: () =>
      `https://gmx.banxa.com?coinType=${nativeTokenSymbol}&fiatType=USD&fiatAmount=500&blockchain=${getChainName(
        chainId
      )}`,
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
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              <Trans>Buy GMX on {getChainName(chainId)}</Trans>
            </div>
            <div className="Page-description">
              <Trans>Choose to buy from decentralized or centralized exchanges.</Trans>
              <br />
              <Trans>
                To purchase GMX on the {isArbitrum ? "Avalanche" : "Arbitrum"} blockchain, please{" "}
                <span onClick={() => onNetworkSelect(isArbitrum ? AVALANCHE : ARBITRUM)}>change your network</span>.
              </Trans>
            </div>
          </div>
        </div>
        <div className="cards-row">
          <Card title={t`Buy GMX from a Decentralized Exchange`}>
            <div className="App-card-content">
              {isArbitrum ? (
                <div className="exchange-info-group">
                  <div className="BuyGMXGLP-description">
                    <Trans>Buy GMX from Uniswap:</Trans>
                  </div>
                  <div className="buttons-group col-1">
                    <Button
                      imgSrc={gmxArbitrum}
                      href="https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a"
                    >
                      <Trans>Purchase GMX</Trans>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="exchange-info-group">
                  <div className="BuyGMXGLP-description">
                    <Trans>Buy GMX from Traderjoe:</Trans>
                  </div>
                  <div className="buttons-group col-1">
                    <Button
                      imgSrc={gmxAvax}
                      href="https://traderjoexyz.com/trade?outputCurrency=0x62edc0692BD897D2295872a9FFCac5425011c661#/"
                    >
                      <Trans>Purchase GMX</Trans>
                    </Button>
                  </div>
                </div>
              )}
              <div className="exchange-info-group">
                <div className="BuyGMXGLP-description">
                  <Trans>Buy GMX from DEXes aggregators:</Trans>
                </div>
                <div className="buttons-group">
                  {DECENTRALISED_AGGRIGATORS.filter((e) => e.networks.includes(chainId)).map((exchange) => (
                    <Button imgSrc={exchange.icon} href={exchange.link}>
                      <Trans>{exchange.name}</Trans>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="exchange-info-group">
                <div className="BuyGMXGLP-description">
                  <Trans>Buy GMX using any token from any network:</Trans>
                </div>
                <div className="buttons-group">
                  <Button href={EXCHANGE_LINKS.getBungeeUrl()} align="left" imgSrc={Bungee}>
                    Bungee
                  </Button>
                  <Button href={EXCHANGE_LINKS.getBanxaUrl()} align="left" imgSrc={Banxa}>
                    Banxa
                  </Button>
                  <Button href={EXCHANGE_LINKS.getO3Url()} align="left" imgSrc={O3}>
                    O3
                  </Button>
                </div>
              </div>
              {isArbitrum && (
                <div className="exchange-info-group">
                  <div className="BuyGMXGLP-description">
                    <Trans>GMX bonds can be bought on Olympus Pro with a discount and a small vesting period:</Trans>
                  </div>
                  <div className="buttons-group">
                    <Button imgSrc={ohmArbitrum} href="https://pro.olympusdao.finance/#/partners/GMX">
                      Olympus Pro
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
          <Card title={t`Buy GMX from centralized services or bonds`}>
            <div className="App-card-content">
              <div className="exchange-info-group">
                <div className="BuyGMXGLP-description">
                  <Trans>Buy GMX from centralized exchanges:</Trans>
                </div>
                <div className="buttons-group">
                  {CENTRALISED_EXCHANGES.map(({ name, icon, link }) => (
                    <Button key={name} href={link} align="left" imgSrc={icon}>
                      {name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="exchange-info-group">
                <div className="BuyGMXGLP-description">
                  <Trans>Buy GMX using FIAT gateways:</Trans>
                </div>
                <div className="buttons-group col-2">
                  <Button href="https://www.binancecnt.com/en/buy-sell-crypto" align="left" imgSrc={Binance}>
                    Binance Connect
                  </Button>
                  <Button href={EXCHANGE_LINKS.getBanxaUrl()} align="left" imgSrc={Banxa}>
                    Banxa
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {isArbitrum ? (
          <div className="section-title-block mt-top">
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>Buy or Transfer ETH to Arbitrum</Trans>
              </div>
              <div className="Page-description">
                <Trans>Buy ETH directly to Arbitrum or transfer it there.</Trans>
              </div>
            </div>
          </div>
        ) : (
          <div className="section-title-block mt-top">
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>Buy or Transfer AVAX to Avalanche</Trans>
              </div>
              <div className="Page-description">
                <Trans>Buy AVAX directly to Avalanche or transfer it there.</Trans>
              </div>
            </div>
          </div>
        )}

        {chainId === ARBITRUM && (
          <div className="cards-row">
            <Card title={t`Buy ETH`}>
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
                  <Button href={EXCHANGE_LINKS.getBungeeUrl()} imgSrc={Bungee}>
                    Bungee
                  </Button>
                  <Button href={EXCHANGE_LINKS.getBanxaUrl()} imgSrc={Banxa}>
                    Banxa
                  </Button>
                  <Button href={EXCHANGE_LINKS.getO3Url()} imgSrc={O3}>
                    O3
                  </Button>
                  <Button href="https://ftx.com/trade/ETH/USD" align="left" imgSrc={Ftx}>
                    FTX
                  </Button>
                </div>
              </div>
            </Card>
            <Card title={t`Transfer ETH`}>
              <div className="App-card-content">
                <div className="BuyGMXGLP-description">
                  <Trans>You can transfer ETH from other networks to Arbitrum using any of the below options:</Trans>
                </div>
                <div className="buttons-group">
                  <Button
                    href="https://synapseprotocol.com/?inputCurrency=ETH&outputCurrency=ETH&outputChain=42161"
                    imgSrc={Synapse}
                  >
                    Synapse
                  </Button>
                  <Button href="https://app.multichain.org/#/router" imgSrc={Multiswap}>
                    Multiswap
                  </Button>

                  <Button
                    href="https://app.hop.exchange/send?token=ETH&sourceNetwork=ethereum&destNetwork=arbitrum"
                    imgSrc={Hop}
                  >
                    Hop
                  </Button>
                  <Button href="https://bridge.arbitrum.io/" imgSrc={Arbitrum}>
                    Arbitrum
                  </Button>
                  <Button href={EXCHANGE_LINKS.getBungeeUrl()} imgSrc={Bungee}>
                    Bungee
                  </Button>
                  <Button href={EXCHANGE_LINKS.getO3Url()} imgSrc={O3}>
                    O3
                  </Button>
                  <Button href="https://ftx.com/trade/ETH/USD" imgSrc={Ftx}>
                    FTX
                  </Button>
                  <Button href="https://www.binance.com/en/trade/ETH_USDT" imgSrc={Binance}>
                    Binance
                  </Button>
                  <Button href="https://across.to/" imgSrc={Across}>
                    Across
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {chainId === AVALANCHE && (
          <div className="cards-row">
            <Card title={t`Buy AVAX`}>
              <div className="App-card-content">
                <div className="BuyGMXGLP-description">
                  <Trans>
                    You can buy AVAX directly on{" "}
                    <a href="https://www.avax.network/" target="_blank" rel="noopener noreferrer">
                      Avalanche
                    </a>{" "}
                    using these options:
                  </Trans>
                </div>
                <div className="buttons-group">
                  <Button href={EXCHANGE_LINKS.getBungeeUrl()} imgSrc={Bungee}>
                    Bungee
                  </Button>
                  <Button href={EXCHANGE_LINKS.getBanxaUrl()} imgSrc={Banxa}>
                    Banxa
                  </Button>
                  <Button href={EXCHANGE_LINKS.getO3Url()} imgSrc={O3}>
                    O3
                  </Button>
                  <Button href="https://ftx.com/trade/AVAX/USD" align="left" imgSrc={Ftx}>
                    FTX
                  </Button>
                </div>
              </div>
            </Card>
            <Card title={t`Transfer AVAX`}>
              <div className="App-card-content">
                <div className="BuyGMXGLP-description">
                  <Trans>You can transfer AVAX from other networks to Avalanche using any of the below options:</Trans>
                </div>
                <div className="buttons-group">
                  <Button align="left" href="https://bridge.avax.network/" imgSrc={avax30Icon}>
                    Avalanche
                  </Button>
                  <Button align="left" href="https://synapseprotocol.com/" imgSrc={Synapse}>
                    Synapse
                  </Button>
                  <Button align="left" href="https://app.multichain.org/" imgSrc={Multiswap}>
                    Multiswap
                  </Button>
                  <Button align="left" href="https://www.binance.com/en/trade/AVAX_USDT" imgSrc={Binance}>
                    Binance
                  </Button>
                  <Button href={EXCHANGE_LINKS.getBungeeUrl()} align="left" imgSrc={Bungee}>
                    Bungee
                  </Button>
                  <Button href={EXCHANGE_LINKS.getO3Url()} align="left" imgSrc={O3}>
                    O3
                  </Button>
                  <Button href="https://across.to/" imgSrc={Across}>
                    Across
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
