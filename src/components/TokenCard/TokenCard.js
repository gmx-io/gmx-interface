import React, { useCallback } from "react";
import { Link } from "react-router-dom";

import gmxBigIcon from "../../img/ic_gmx_custom.svg";
import glpBigIcon from "../../img/ic_glp_custom.svg";

import { ARBITRUM, AVALANCHE, switchNetwork, useChainId } from "../../Helpers";

import { useWeb3React } from "@web3-react/core";

import APRLabel from "../APRLabel/APRLabel";

export default function TokenCard() {
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

  return (
    <div className="Home-token-card-options">
      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={gmxBigIcon} alt="gmxBigIcon" /> GMX
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            GMX is the utility and governance token. Accrues 30% of the platform's generated fees.
          </div>
          <div className="Home-token-card-option-apr">
            Arbitrum APR: <APRLabel chainId={ARBITRUM} label="gmxAprTotal" />, Avalanche APR:{" "}
            <APRLabel chainId={AVALANCHE} label="gmxAprTotal" key="AVALANCHE" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <Link to="/buy_gmx" className="default-btn" onClick={() => changeNetwork(ARBITRUM)}>
                Buy on Arbitrum
              </Link>
              <Link to="/buy_gmx" className="default-btn" onClick={() => changeNetwork(AVALANCHE)}>
                Buy on Avalanche
              </Link>
            </div>
            <a
              href="https://gmxio.gitbook.io/gmx/tokenomics"
              target="_blank"
              rel="noreferrer"
              className="default-btn read-more"
            >
              Read more
            </a>
          </div>
        </div>
      </div>
      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={glpBigIcon} alt="glpBigIcon" /> GLP
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            GLP is the liquidity provider token. Accrues 70% of the platform's generated fees.
          </div>
          <div className="Home-token-card-option-apr">
            Arbitrum APR: <APRLabel chainId={ARBITRUM} label="glpAprTotal" key="ARBITRUM" />, Avalanche APR:{" "}
            <APRLabel chainId={AVALANCHE} label="glpAprTotal" key="AVALANCHE" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <Link to="/buy_glp" className="default-btn" onClick={() => changeNetwork(ARBITRUM)}>
                Buy on Arbitrum
              </Link>
              <Link to="/buy_glp" className="default-btn" onClick={() => changeNetwork(AVALANCHE)}>
                Buy on Avalanche
              </Link>
            </div>
            <a
              href="https://gmxio.gitbook.io/gmx/glp"
              target="_blank"
              rel="noreferrer"
              className="default-btn read-more"
            >
              Read more
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
