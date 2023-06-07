import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { Link } from "react-router-dom";

import { isHomeSite } from "lib/legacy";

import { useWeb3React } from "@web3-react/core";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "config/chains";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import { switchNetwork } from "lib/wallets";
import APRLabel from "../APRLabel/APRLabel";
import { HeaderLink } from "../Header/HeaderLink";
import { useMarketTokensAPR } from "domain/synthetics/markets/useMarketTokensAPR";
import { isDevelopment } from "config/env";
import { formatAmount } from "lib/numbers";

const glpIcon = getIcon("common", "glp");
const gmxIcon = getIcon("common", "gmx");
const gmIcon = getIcon("common", "gm");

export default function TokenCard({ showRedirectModal, redirectPopupTimestamp }) {
  const isHome = isHomeSite();
  const { chainId } = useChainId();
  const { active } = useWeb3React();

  const { avgMarketsAPR: fujiAvgMarketsAPR } = useMarketTokensAPR(AVALANCHE_FUJI);
  const { avgMarketsAPR: goerliAvgMarketsAPR } = useMarketTokensAPR(ARBITRUM_GOERLI);
  const { avgMarketsAPR: arbitrumAvgMarketsAPR } = useMarketTokensAPR(ARBITRUM);
  const { avgMarketsAPR: avalancheAvgMarketsAPR } = useMarketTokensAPR(AVALANCHE);

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
          <img src={gmxIcon} width="40" alt="GMX Icons" /> GMX
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            <Trans>GMX is the utility and governance token. Accrues 30% of the platform's generated fees.</Trans>
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
            <ExternalLink href="https://gmxio.gitbook.io/gmx/tokenomics" className="default-btn read-more">
              <Trans>Read more</Trans>
            </ExternalLink>
          </div>
        </div>
      </div>
      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={glpIcon} width="40" alt="GLP Icon" /> GLP
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            <Trans>
              GLP is the liquidity provider token for GMX V1 markets. Accrues 70% of the V1 markets generated fees.
            </Trans>
          </div>
          <div className="Home-token-card-option-apr">
            <Trans>Arbitrum APR:</Trans> <APRLabel chainId={ARBITRUM} label="glpAprTotal" key="ARBITRUM" />,{" "}
            <Trans>Avalanche APR:</Trans> <APRLabel chainId={AVALANCHE} label="glpAprTotal" key="AVALANCHE" />
          </div>
          <div className="Home-token-card-option-action">
            <div className="buy">
              <BuyLink to="/buy_glp" className="default-btn" network={ARBITRUM}>
                <Trans>Buy on Arbitrum</Trans>
              </BuyLink>
              <BuyLink to="/buy_glp" className="default-btn" network={AVALANCHE}>
                <Trans>Buy on Avalanche</Trans>
              </BuyLink>
            </div>
            <a
              href="https://gmxio.gitbook.io/gmx/glp"
              target="_blank"
              rel="noreferrer"
              className="default-btn read-more"
            >
              <Trans>Read more</Trans>
            </a>
          </div>
        </div>
      </div>

      <div className="Home-token-card-option">
        <div className="Home-token-card-option-icon">
          <img src={gmIcon} alt="gmxBigIcon" /> GM
        </div>
        <div className="Home-token-card-option-info">
          <div className="Home-token-card-option-title">
            <Trans>
              GM is the liquidity provider token for GMX V2 markets. Accrues 70% of the V2 markets generated fees.
            </Trans>
          </div>

          <div className="Home-token-card-option-apr">
            {isDevelopment() && (
              <>
                <span>
                  <Trans>Avalanche FUJI APR:</Trans> {formatAmount(fujiAvgMarketsAPR, 2, 2)}%
                </span>
                {", "}
                <span>
                  <Trans>Arbitrum Goerli APR:</Trans> {formatAmount(goerliAvgMarketsAPR, 2, 2)}%
                </span>
                {", "}
              </>
            )}
            <span>
              <Trans>Arbitrum APR:</Trans> {formatAmount(arbitrumAvgMarketsAPR, 2, 2)}%
            </span>
            {", "}
            <span>
              <Trans>Avalanche APR:</Trans> {formatAmount(avalancheAvgMarketsAPR, 2, 2)}%
            </span>
          </div>

          <div className="Home-token-card-option-action">
            <div className="buy">
              <BuyLink to="/pools" className="default-btn" network={AVALANCHE_FUJI}>
                <Trans>Buy on Avalanche FUJI</Trans>
              </BuyLink>
              <BuyLink to="/pools" className="default-btn" network={ARBITRUM_GOERLI}>
                <Trans>Buy on Arbitrum Goerli</Trans>
              </BuyLink>
            </div>
            {/* <a
                href="https://gmxio.gitbook.io/gmx/glp"
                target="_blank"
                rel="noreferrer"
                className="default-btn read-more"
              >
                <Trans>Read more</Trans>
              </a> */}
          </div>
        </div>
      </div>
    </div>
  );
}
