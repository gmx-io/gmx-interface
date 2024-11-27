import React, { useCallback, useContext } from "react";
import { Link } from "react-router-dom";
import { Trans } from "@lingui/macro";

import { isHomeSite } from "lib/legacy";

import APRLabel from "../APRLabel/APRLabel";
import { HeaderLink } from "../Header/HeaderLink";
import { ARBITRUM, AVALANCHE, OPTIMISM_GOERLI_TESTNET, SEPOLIA_TESTNET } from "config/chains";
import { switchNetwork } from "lib/wallets";
import { useDynamicChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getIcon } from "config/icons";
import { DynamicWalletContext } from "store/dynamicwalletprovider";

const glpIcon = getIcon(SEPOLIA_TESTNET, "glp");
const gmxIcon = getIcon("common", "gmx");

export default function TokenCard({ showRedirectModal, redirectPopupTimestamp }) {
  const isHome = isHomeSite();
  const { chainId } = useDynamicChainId();
  const dynamicContext = useContext(DynamicWalletContext);
  const active = dynamicContext.active;

  const changeNetwork = useCallback(
    (network) => {
      if (network === chainId) {
        return;
      }
      if (!active) {
        setTimeout(() => {
          return switchNetwork(network, active);
        }, 500);
      } else {
        return switchNetwork(network, active);
      }
    },
    [chainId, active]
  );

  const BuyLink = ({ className, to, children, network }) => {
    if (isHome && showRedirectModal) {
      return (
        <HeaderLink
          to={to}
          className={className}
          redirectPopupTimestamp={redirectPopupTimestamp}
          showRedirectModal={showRedirectModal}
        >
          {children}
        </HeaderLink>
      );
    }

    return (
      <Link to={to} className={className} onClick={() => changeNetwork(network)}>
        {children}
      </Link>
    );
  };

  return (
    <div className="Home-token-card-options">
      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={gmxIcon} width="40" alt="TMX Icons" /> TMX
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            <Trans>TMX is the utility and governance token. Accrues 30% of the platform's generated fees.</Trans>
          </div>
          <div className="Home-token-card-option-apr">
            <Trans>Arbitrum APR:</Trans> <APRLabel chainId={ARBITRUM} label="gmxAprTotal" />,{" "}
            <Trans>Avalanche APR:</Trans> <APRLabel chainId={AVALANCHE} label="gmxAprTotal" key="AVALANCHE" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <BuyLink to="/buy_gmx" className="default-btn" network={ARBITRUM}>
                <Trans>Buy on Arbitrum</Trans>
              </BuyLink>
              <BuyLink to="/buy_gmx" className="default-btn" network={AVALANCHE}>
                <Trans>Buy on Avalanche</Trans>
              </BuyLink>
            </div>
            <ExternalLink href="https://docs.t3.money/tmx/tokenomics" className="default-btn read-more">
              <Trans>Read more</Trans>
            </ExternalLink>
          </div>
        </div>
      </div>
      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={glpIcon} width="40" alt="TLP Icon" /> TLP
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            <Trans>TLP is the liquidity provider token. Accrues 70% of the platform's generated fees.</Trans>
          </div>
          <div className="Home-token-card-option-apr">
            <Trans>Arbitrum APR:</Trans> <APRLabel chainId={ARBITRUM} label="glpAprTotal" key="ARBITRUM" />,{" "}
            <Trans>Avalanche APR:</Trans> <APRLabel chainId={AVALANCHE} label="glpAprTotal" key="AVALANCHE" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              {chainId === OPTIMISM_GOERLI_TESTNET ? (
                <BuyLink to="/buy_glp" className="default-btn" network={SEPOLIA_TESTNET}>
                  <Trans>{`Buy on Optimism-Goerli`}</Trans>
                </BuyLink>
              ) : (
                <BuyLink to="/buy_glp" className="default-btn" network={AVALANCHE}>
                  <Trans>Buy on Avalanche</Trans>
                </BuyLink>
              )}
              <BuyLink to="/buy_glp" className="default-btn" network={ARBITRUM}>
                <Trans>Buy on Arbitrum</Trans>
              </BuyLink>
            </div>
            <a href="https://docs.t3.money/tmx/glp" target="_blank" rel="noreferrer" className="default-btn read-more">
              <Trans>Read more</Trans>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
