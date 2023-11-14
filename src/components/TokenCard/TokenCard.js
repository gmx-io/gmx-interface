import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { Link } from "react-router-dom";

import { isHomeSite } from "lib/legacy";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import { switchNetwork } from "lib/wallets";
import APRLabel from "../APRLabel/APRLabel";
import { HeaderLink } from "../Header/HeaderLink";
import useWallet from "lib/wallets/useWallet";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";

const glpIcon = getIcon("common", "glp");
const gmxIcon = getIcon("common", "gmx");
const gmIcon = getIcon("common", "gm");

export default function TokenCard({ showRedirectModal, redirectPopupTimestamp }) {
  const isHome = isHomeSite();
  const { chainId } = useChainId();
  const { active } = useWallet();
  const incentiveState = useIncentiveStats();

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
            <Trans>
              GMX is the utility and governance token. Accrues 30% and 27% of V1 and V2 markets generated fees,
              respectively.
            </Trans>
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
            <ExternalLink href="https://docs.gmx.io/docs/category/tokenomics" className="default-btn read-more">
              <Trans>Read more</Trans>
            </ExternalLink>
          </div>
        </div>
      </div>
      <div className="Home-token-card-option">
        <div>
          <div className="Home-token-card-option-icon">
            <img src={gmIcon} alt="gmxBigIcon" /> GM
          </div>
          <div className="Home-token-card-option-info">
            <div className="Home-token-card-option-title">
              <Trans>
                GM is the liquidity provider token for GMX V2 markets. Accrues 63% of the V2 markets generated fees.
              </Trans>
            </div>
          </div>
        </div>
        <div className="Home-token-card-option-action Token-card-buy">
          <div className="buy">
            <BuyLink to="/pools" className="default-btn" network={ARBITRUM}>
              <Trans>Buy on Arbitrum</Trans>
            </BuyLink>

            <BuyLink to="/pools" className="default-btn" network={AVALANCHE}>
              <Trans>Buy on Avalanche</Trans>
            </BuyLink>
          </div>
          <a
            href="https://docs.gmx.io/docs/providing-liquidity/v2"
            target="_blank"
            rel="noreferrer"
            className="default-btn read-more"
          >
            <Trans>Read more</Trans>
          </a>
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
            {incentiveState?.migration?.isActive && (
              <>
                <br />
                <br />
                <div className="text-warning">
                  <Trans>
                    GLP to GM migration has reduced Fees due to STIP incentives.{" "}
                    <ExternalLink
                      className="text-warning"
                      href="https://gmxio.notion.site/GMX-S-T-I-P-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3#a2d1ea61dd1147b195b7e3bd769348d3"
                    >
                      Read more
                    </ExternalLink>
                    .
                  </Trans>
                </div>
              </>
            )}
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
              href="https://docs.gmx.io/docs/providing-liquidity/v1"
              target="_blank"
              rel="noreferrer"
              className="default-btn read-more"
            >
              <Trans>Read more</Trans>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
