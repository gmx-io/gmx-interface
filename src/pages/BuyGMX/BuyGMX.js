import React, { useCallback } from "react";
import Footer from "components/Footer/Footer";
import "./BuyGMX.css";
import { useWeb3React } from "@web3-react/core";

import { Trans, t } from "@lingui/macro";
import Button from "components/Common/Button";
import { ARBITRUM, AVALANCHE, getChainName, getConstant } from "config/chains";
import { switchNetwork } from "lib/wallets";
import { useChainId } from "lib/chains";
import Card from "components/Common/Card";

import Banxa from "img/ic_banxa.svg";
import Bungee from "img/ic_bungee.png";
import O3 from "img/ic_o3.png";
import Binance from "img/ic_binance.svg";
import Ftx from "img/ic_ftx.svg";
import gmxAvax from "img/ic_gmx_avax.svg";
import gmxArbitrum from "img/ic_gmx_arbitrum.svg";
import ohmArbitrum from "img/ic_olympus_arbitrum.svg";
import { importImage } from "lib/legacy";
import ExternalLink from "components/ExternalLink/ExternalLink";

const EXTERNAL_LINKS = {
  bungee: { [ARBITRUM]: "https://multitx.bungee.exchange/", [AVALANCHE]: "https://multitx.bungee.exchange/" },
  banxa: {
    [ARBITRUM]: "https://gmx.banxa.com/?coinType=ETH&fiatType=USD&fiatAmount=500&blockchain=arbitrum",
    [AVALANCHE]: "https://gmx.banxa.com/?coinType=AVAX&fiatType=USD&fiatAmount=500&blockchain=avalanche",
  },
  o3: { [ARBITRUM]: "https://o3swap.com/", [AVALANCHE]: "https://o3swap.com/" },
  buyGmx: {
    banxa: {
      [ARBITRUM]: "https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=arbitrum",
      [AVALANCHE]: "https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=avalanche",
    },
    main: {
      [ARBITRUM]:
        "https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
      [AVALANCHE]: "https://traderjoexyz.com/trade?outputCurrency=0x62edc0692BD897D2295872a9FFCac5425011c661#/",
    },
  },
  nativeNetwork: { [ARBITRUM]: "https://arbitrum.io/", [AVALANCHE]: "https://www.avax.network/" },
  ftx: { [ARBITRUM]: "https://ftx.com/trade/ETH/USD", [AVALANCHE]: "https://ftx.com/trade/AVAX/USD" },
};

const TRANSFER_EXCHANGES = [
  {
    name: "Binance",
    icon: "ic_binance.svg",
    networks: [ARBITRUM, AVALANCHE],
    link: "https://www.binance.com/en/trade/",
  },
  {
    name: "Synapse",
    icon: "ic_synapse.svg",
    networks: [ARBITRUM, AVALANCHE],
    link: "https://synapseprotocol.com/",
  },
  {
    name: "Arbitrum",
    icon: "ic_arbitrum_24.svg",
    networks: [ARBITRUM],
    link: "https://bridge.arbitrum.io/",
  },
  {
    name: "Avalanche",
    icon: "ic_avax_30.svg",
    networks: [AVALANCHE],
    link: "https://bridge.avax.network/",
  },
  {
    name: "Hop",
    icon: "ic_hop.svg",
    networks: [ARBITRUM],
    link: "https://app.hop.exchange/send?token=ETH&sourceNetwork=ethereum&destNetwork=arbitrum",
  },
  {
    name: "Bungee",
    icon: "ic_bungee.png",
    networks: [ARBITRUM, AVALANCHE],
    link: "https://multitx.bungee.exchange",
  },
  {
    name: "Multiswap",
    icon: "ic_multiswap.svg",
    networks: [ARBITRUM, AVALANCHE],
    link: "https://app.multichain.org/#/router",
  },
  {
    name: "O3",
    icon: "ic_o3.png",
    networks: [ARBITRUM, AVALANCHE],
    link: "https://o3swap.com/",
  },
  {
    name: "Across",
    icon: "ic_across.svg",
    networks: [ARBITRUM, AVALANCHE],
    link: "https://across.to/",
  },
  {
    name: "FTX",
    icon: "ic_ftx.svg",
    networks: [ARBITRUM],
    link: "https://ftx.com/trade/ETH/USD",
  },
];

const CENTRALISED_EXCHANGES = [
  {
    name: "Binance",
    icon: "ic_binance.svg",
    link: "https://www.binance.com/en/trade/GMX_USDT?_from=markets",
  },
  {
    name: "Bybit",
    icon: "ic_bybit.svg",
    link: "https://www.bybit.com/en-US/trade/spot/GMX/USDT",
  },
  {
    name: "FTX",
    icon: "ic_ftx.svg",
    link: "https://ftx.com/trade/GMX/USD",
  },
  {
    name: "Crypto.com",
    icon: "crypto_com.svg",
    link: "https://crypto.com/exchange/trade/spot/GMX_USDT",
  },
  {
    name: "Kucoin",
    icon: "ic_kucoin.svg",
    link: "https://www.kucoin.com/trade/GMX-USDT",
  },
  {
    name: "Huobi",
    icon: "ic_huobi.svg",
    link: "https://www.huobi.com/en-us/exchange/gmx_usdt/",
  },
];

const DECENTRALISED_AGGRIGATORS = [
  {
    name: "1inch",
    icon: "ic_1inch.svg",
    link: "https://app.1inch.io/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Matcha",
    icon: "ic_matcha.png",
    link: "https://www.matcha.xyz/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Paraswap",
    icon: "ic_paraswap.svg",
    link: "https://www.paraswap.io/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Firebird",
    icon: "ic_firebird.png",
    link: "https://firebird.finance/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "OpenOcean",
    icon: "ic_openocean.svg",
    link: "https://openocean.finance/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "DODO",
    icon: "ic_dodo.svg",
    link: "https://dodoex.io/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Odos",
    icon: "ic_odos.png",
    link: "https://app.odos.xyz/",
    networks: [ARBITRUM],
  },
  {
    name: "Slingshot",
    icon: "ic_slingshot.svg",
    link: "https://slingshot.finance/",
    networks: [ARBITRUM],
  },
  {
    name: "Yieldyak",
    icon: "ic_yield_yak.png",
    link: "https://yieldyak.com/swap",
    networks: [AVALANCHE],
  },
];

export default function BuyGMX() {
  const { chainId } = useChainId();
  const isArbitrum = chainId === ARBITRUM;
  const { active } = useWeb3React();
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");

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
          <DecentralisedExchanges chainId={chainId} />
          <CentralisedExchanges chainId={chainId} />
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

        <div className="cards-row">
          <Card title={t`Buy ${nativeTokenSymbol}`}>
            <div className="App-card-content">
              <div className="BuyGMXGLP-description">
                {isArbitrum ? (
                  <Trans>
                    You can buy ETH directly on{" "}
                    <ExternalLink href={EXTERNAL_LINKS.nativeNetwork[ARBITRUM]}>Arbitrum</ExternalLink> using these
                    options:
                  </Trans>
                ) : (
                  <Trans>
                    You can buy AVAX directly on{" "}
                    <ExternalLink href={EXTERNAL_LINKS.nativeNetwork[ARBITRUM]}>Avalanche</ExternalLink> using these
                    options:
                  </Trans>
                )}
              </div>
              <div className="buttons-group">
                <Button href={EXTERNAL_LINKS.bungee[chainId]} imgSrc={Bungee}>
                  Bungee
                </Button>
                <Button href={EXTERNAL_LINKS.banxa[chainId]} imgSrc={Banxa}>
                  Banxa
                </Button>
                <Button href={EXTERNAL_LINKS.o3[chainId]} imgSrc={O3}>
                  O3
                </Button>
                <Button href={EXTERNAL_LINKS.ftx[chainId]} imgSrc={Ftx}>
                  FTX
                </Button>
              </div>
            </div>
          </Card>
          <Card title={t`Transfer ${nativeTokenSymbol}`}>
            <div className="App-card-content">
              {isArbitrum ? (
                <div className="BuyGMXGLP-description">
                  <Trans>You can transfer ETH from other networks to Arbitrum using any of the below options:</Trans>
                </div>
              ) : (
                <div className="BuyGMXGLP-description">
                  <Trans>You can transfer AVAX from other networks to Avalanche using any of the below options:</Trans>
                </div>
              )}
              <div className="buttons-group">
                {TRANSFER_EXCHANGES.filter((e) => e.networks.includes(chainId)).map((exchange) => {
                  const icon = importImage(exchange.icon);
                  return (
                    <Button key={exchange.name} href={exchange.link} imgSrc={icon}>
                      {exchange.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function DecentralisedExchanges({ chainId }) {
  const isArbitrum = chainId === ARBITRUM;
  return (
    <Card title={t`Buy GMX from a Decentralized Exchange`}>
      <div className="App-card-content">
        {isArbitrum ? (
          <div className="exchange-info-group">
            <div className="BuyGMXGLP-description">
              <Trans>Buy GMX from Uniswap:</Trans>
            </div>
            <div className="buttons-group col-1">
              <Button imgSrc={gmxArbitrum} href={EXTERNAL_LINKS.buyGmx.main[chainId]}>
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
              <Button imgSrc={gmxAvax} href={EXTERNAL_LINKS.buyGmx.main[chainId]}>
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
            {DECENTRALISED_AGGRIGATORS.filter((e) => e.networks.includes(chainId)).map((exchange) => {
              const icon = importImage(exchange.icon);
              return (
                <Button key={exchange.name} imgSrc={icon} href={exchange.link}>
                  <Trans>{exchange.name}</Trans>
                </Button>
              );
            })}
          </div>
        </div>
        <div className="exchange-info-group">
          <div className="BuyGMXGLP-description">
            <Trans>Buy GMX using any token from any network:</Trans>
          </div>
          <div className="buttons-group">
            <Button href={EXTERNAL_LINKS.bungee[chainId]} imgSrc={Bungee}>
              Bungee
            </Button>
            <Button href={EXTERNAL_LINKS.banxa[chainId]} imgSrc={Banxa}>
              Banxa
            </Button>
            <Button href={EXTERNAL_LINKS.o3[chainId]} imgSrc={O3}>
              O3
            </Button>
          </div>
        </div>
        {isArbitrum && (
          <div className="exchange-info-group">
            <div className="BuyGMXGLP-description">
              <Trans>GMX bonds can be bought on Olympus Pro with a discount and a small vesting period:</Trans>
            </div>
            <div className="buttons-group col-1">
              <Button imgSrc={ohmArbitrum} href="https://pro.olympusdao.finance/#/partners/GMX">
                Olympus Pro
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function CentralisedExchanges({ chainId }) {
  return (
    <Card title={t`Buy GMX from centralized services or bonds`}>
      <div className="App-card-content">
        <div className="exchange-info-group">
          <div className="BuyGMXGLP-description">
            <Trans>Buy GMX from centralized exchanges:</Trans>
          </div>
          <div className="buttons-group">
            {CENTRALISED_EXCHANGES.map((exchange) => {
              const icon = importImage(exchange.icon);
              return (
                <Button key={exchange.name} href={exchange.link} imgSrc={icon}>
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="exchange-info-group">
          <div className="BuyGMXGLP-description">
            <Trans>Buy GMX using FIAT gateways:</Trans>
          </div>
          <div className="buttons-group col-2">
            <Button href="https://www.binancecnt.com/en/buy-sell-crypto" imgSrc={Binance}>
              Binance Connect
            </Button>
            <Button href={EXTERNAL_LINKS.buyGmx.banxa[chainId]} imgSrc={Banxa}>
              Banxa
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
