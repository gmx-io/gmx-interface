import React, { useCallback, useContext } from "react";
import Footer from "components/Footer/Footer";
import "./BuyGMX.css";

import { Trans, t } from "@lingui/macro";
import Button from "components/Button/Button";
import { ARBITRUM, AVALANCHE, getChainName, getConstant } from "config/chains";
import { switchNetwork } from "lib/wallets";
import { useDynamicChainId } from "lib/chains";
import Card from "components/Common/Card";
import { importImage } from "lib/legacy";
import ExternalLink from "components/ExternalLink/ExternalLink";

import bondProtocolIcon from "img/ic_bondprotocol_arbitrum.svg";
import uniswapArbitrumIcon from "img/ic_uni_arbitrum.svg";
import traderjoeIcon from "img/ic_traderjoe_avax.png";
import {
  BUY_NATIVE_TOKENS,
  CENTRALISED_EXCHANGES,
  DECENTRALISED_AGGRIGATORS,
  EXTERNAL_LINKS,
  FIAT_GATEWAYS,
  GMX_FROM_ANY_NETWORKS,
  TRANSFER_EXCHANGES,
} from "./constants";
import { DynamicWalletContext } from "store/dynamicwalletprovider";

export default function BuyGMX() {
  const { chainId } = useDynamicChainId();
  const isArbitrum = chainId === ARBITRUM;
  const dynamicContext = useContext(DynamicWalletContext);
  const active = dynamicContext.active;

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const externalLinks = EXTERNAL_LINKS[chainId];

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
              <Trans>Buy TMX on {getChainName(chainId)}</Trans>
            </div>
            <div className="Page-description">
              <Trans>Choose to buy from decentralized or centralized exchanges.</Trans>
              <br />
              <Trans>
                To purchase TMX on the {isArbitrum ? "Avalanche" : "Arbitrum"} blockchain, please{" "}
                <span onClick={() => onNetworkSelect(isArbitrum ? AVALANCHE : ARBITRUM)}>change your network</span>.
              </Trans>
            </div>
          </div>
        </div>
        <div className="cards-row">
          <DecentralisedExchanges chainId={chainId} externalLinks={externalLinks} />
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
                    <ExternalLink href={externalLinks.networkWebsite}>Arbitrum</ExternalLink> using these options:
                  </Trans>
                ) : (
                  <Trans>
                    You can buy AVAX directly on{" "}
                    <ExternalLink href={externalLinks.networkWebsite}>Avalanche</ExternalLink> using these options:
                  </Trans>
                )}
              </div>
              <div className="buttons-group">
                {BUY_NATIVE_TOKENS.filter((e) => chainId in e.links).map((exchange) => {
                  const icon = importImage(exchange.icon) || "";
                  const link = exchange.links[chainId];
                  return (
                    <Button
                      variant="clear"
                      key={exchange.name}
                      to={link}
                      imgInfo={{ src: icon, alt: exchange.name }}
                      newTab
                    >
                      {exchange.name}
                    </Button>
                  );
                })}
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
                {TRANSFER_EXCHANGES.filter((e) => chainId in e.links).map((exchange) => {
                  const icon = importImage(exchange.icon) || "";
                  const link = exchange.links[chainId];
                  return (
                    <Button
                      variant="clear"
                      key={exchange.name}
                      to={link}
                      imgInfo={{ src: icon, alt: exchange.name }}
                      newTab
                    >
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

function DecentralisedExchanges({ chainId, externalLinks }) {
  const isArbitrum = chainId === ARBITRUM;
  return (
    <Card title={t`Buy TMX from a Decentralized Exchange`}>
      <div className="App-card-content">
        {isArbitrum ? (
          <div className="exchange-info-group">
            <div className="BuyGMXGLP-description">
              <Trans>Buy TMX from Uniswap (make sure to select Arbitrum):</Trans>
            </div>
            <div className="buttons-group col-1">
              <Button
                variant="clear"
                imgInfo={{ src: uniswapArbitrumIcon, alt: "Uniswap" }}
                to={externalLinks.buyGmx.uniswap}
                newTab
              >
                Uniswap
              </Button>
            </div>
          </div>
        ) : (
          <div className="exchange-info-group">
            <div className="BuyGMXGLP-description">
              <Trans>Buy TMX from Traderjoe:</Trans>
            </div>
            <div className="buttons-group col-1">
              <Button
                variant="clear"
                to={externalLinks.buyGmx.traderjoe}
                imgInfo={{ src: traderjoeIcon, alt: "Traderjoe" }}
                newTab
              >
                TraderJoe
              </Button>
            </div>
          </div>
        )}
        <div className="exchange-info-group">
          <div className="BuyGMXGLP-description">
            <Trans>Buy TMX using Decentralized Exchange Aggregators:</Trans>
          </div>
          <div className="buttons-group">
            {DECENTRALISED_AGGRIGATORS.filter((e) => chainId in e.links).map((exchange) => {
              const icon = importImage(exchange.icon) || "";
              const link = exchange.links[chainId];
              return (
                <Button
                  variant="clear"
                  key={exchange.name}
                  to={link}
                  imgInfo={{ src: icon, alt: exchange.name }}
                  newTab
                >
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="exchange-info-group">
          <div className="BuyGMXGLP-description">
            <Trans>Buy TMX using any token from any network:</Trans>
          </div>
          <div className="buttons-group">
            {GMX_FROM_ANY_NETWORKS.filter((e) => chainId in e.links).map((exchange) => {
              const icon = importImage(exchange.icon) || "";
              const link = exchange.links[chainId];
              return (
                <Button
                  variant="clear"
                  key={exchange.name}
                  to={link}
                  imgInfo={{ src: icon, alt: exchange.name }}
                  newTab
                >
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>
        {isArbitrum && (
          <div className="exchange-info-group">
            <div className="BuyGMXGLP-description">
              <Trans>TMX bonds can be bought on Bond Protocol with a discount and a small vesting period:</Trans>
            </div>
            <div className="buttons-group col-1">
              <Button
                variant="clear"
                to={"https://app.bondprotocol.finance/#/issuers/GMX"}
                imgInfo={{ src: bondProtocolIcon, alt: "Bond Protocol" }}
                newTab
              >
                Bond Protocol
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
    <Card title={t`Buy TMX from centralized services`}>
      <div className="App-card-content">
        <div className="exchange-info-group">
          <div className="BuyGMXGLP-description">
            <Trans>Buy TMX from centralized exchanges:</Trans>
          </div>
          <div className="buttons-group">
            {CENTRALISED_EXCHANGES.filter((e) => chainId in e.links).map((exchange) => {
              const icon = importImage(exchange.icon) || "";
              const link = exchange.links[chainId];
              return (
                <Button
                  variant="clear"
                  key={exchange.name}
                  to={link}
                  imgInfo={{ src: icon, alt: exchange.name }}
                  newTab
                >
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="exchange-info-group">
          <div className="BuyGMXGLP-description">
            <Trans>Buy TMX using FIAT gateways:</Trans>
          </div>
          <div className="buttons-group col-2">
            {FIAT_GATEWAYS.filter((e) => chainId in e.links).map((exchange) => {
              const icon = importImage(exchange.icon) || "";
              let link = exchange.links[chainId];

              return (
                <Button
                  variant="clear"
                  key={exchange.name}
                  to={link}
                  imgInfo={{ src: icon, alt: exchange.name }}
                  newTab
                >
                  {exchange.name}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
