import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import { Trans } from "@lingui/macro";

import gmxBigIcon from "img/ic_gmx_custom.svg";
import glpBigIcon from "img/ic_glp_custom.svg";

import { isHomeSite } from "lib/legacy";

import { useWeb3React } from "@web3-react/core";

import APRLabel from "../APRLabel/APRLabel";
import { HeaderLink } from "../Header/HeaderLink";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { switchNetwork } from "lib/wallets";
import { useChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";

export default function TokenCard({ showRedirectModal, redirectPopupTimestamp }) {
  const isHome = isHomeSite();
  const { chainId } = useChainId();
  const { active } = useWeb3React();

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
      <div className="Home-token-card-option" style={{
        marginTop: '20px'
      }}>
        <div className="Home-token-card-option-icon" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}>
          <img src={gmxBigIcon} alt="gmxBigIcon" /> GMX
        </div>
        <div className="Home-token-card-option-info" style={{
          marginTop: '10px'
        }}>
          <div className="Home-token-card-option-title">
            <Trans>GMX is the utility and governance token. Accrues 30% of the platform's generated fees.</Trans>
          </div>
          <div className="Home-token-card-option-apr">
            <Trans>Arbitrum APR:</Trans> <APRLabel chainId={ARBITRUM} label="gmxAprTotal" />,{" "}
            <Trans>Avalanche APR:</Trans> <APRLabel chainId={AVALANCHE} label="gmxAprTotal" key="AVALANCHE" />
          </div>
          <div className="Home-token-card-option-action" style={{
            display: 'flex',
            gap: '40px',
            marginTop: '10px'
          }}>
            <div className="buy" style={{
              display: 'flex',
              gap: '10px'
            }}>
              <BuyLink to="/buy_gmx" className="default-btn2" network={ARBITRUM}>
                <Trans>Buy on Arbitrum</Trans>
              </BuyLink>
              <BuyLink to="/buy_gmx" className="default-btn2" network={AVALANCHE}>
                <Trans>Buy on Avalanche</Trans>
              </BuyLink>
            </div>
            <ExternalLink href="https://gmxio.gitbook.io/gmx/tokenomics" className="default-btn2 read-more">
              <Trans>Read more</Trans>
            </ExternalLink>
          </div>
        </div>
      </div>
      <div className="Home-token-card-option" style={{
        marginTop: '20px'
      }}>
        <div className="Home-token-card-option-icon" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}>
          <img src={glpBigIcon} alt="glpBigIcon" /> GLP
        </div>
        <div className="Home-token-card-option-info" style={{
          marginTop: '10px'
        }}>
          <div className="Home-token-card-option-title">
            <Trans>GLP is the liquidity provider token. Accrues 70% of the platform's generated fees.</Trans>
          </div>
          <div className="Home-token-card-option-apr">
            <Trans>Arbitrum APR:</Trans> <APRLabel chainId={ARBITRUM} label="glpAprTotal" key="ARBITRUM" />,{" "}
            <Trans>Avalanche APR:</Trans> <APRLabel chainId={AVALANCHE} label="glpAprTotal" key="AVALANCHE" />
          </div>
          <div className="Home-token-card-option-action" style={{
            display: 'flex',
            gap: '40px',
            marginTop: '10px'
          }}>
            <div className="buy" style={{
              display: 'flex',
              gap: '10px'
            }}>
              <BuyLink to="/buy_glp" className="default-btn2" network={ARBITRUM}>
                <Trans>Buy on Arbitrum</Trans>
              </BuyLink>
              <BuyLink to="/buy_glp" className="default-btn2" network={AVALANCHE}>
                <Trans>Buy on Avalanche</Trans>
              </BuyLink>
            </div>
            <a
              href="https://gmxio.gitbook.io/gmx/glp"
              target="_blank"
              rel="noreferrer"
              className="default-btn2 read-more"
            >
              <Trans>Read more</Trans>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
