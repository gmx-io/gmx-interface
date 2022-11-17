import { Trans } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { GMStats } from "components/GM/GMStats/GMStats";
import { GMSwapBox } from "components/GM/GMSwapBox/GMSwapBox";
import { getSyntheticsMarkets } from "config/synthetics";
import { getWhitelistedTokens } from "config/tokens";
import { useInfoTokens } from "domain/tokens";
import { useTokenBalances } from "domain/tokens/useTokenBalances";
import { useChainId } from "lib/chains";
import { getPageTitle } from "lib/legacy";
import { useState } from "react";
import Button from "components/Common/Button";

import "./PoolsPage.scss";

export function PoolsPage() {
  const markets = getSyntheticsMarkets();
  const [selectedMarket, setSelectedMarket] = useState(markets[0]);
  const { chainId } = useChainId();
  const { library, active } = useWeb3React();

  // TODO: Synthetics tokens
  const tokens = getWhitelistedTokens(chainId);
  const tokenAddresses = tokens.map((token) => token.address);
  const { tokenBalances } = useTokenBalances({ tokenAddresses });
  const { infoTokens } = useInfoTokens(library, chainId, active, tokenBalances, undefined);

  console.log("test");

  return (
    <SEO title={getPageTitle("Synthetics pools")}>
      <div className="default-container page-layout">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              <Trans>Synthetics Pools</Trans>
            </div>
            <div className="Page-description">
              <Trans>
                Purchase <ExternalLink href="https://gmxio.gitbook.io/gmx/gd">GM tokens</ExternalLink>
              </Trans>
              <br />
            </div>
          </div>
        </div>

        <div className="PoolsPage-content">
          <GMStats market={selectedMarket} />
          <div className="PoolsPage-swap-box">
            <GMSwapBox
              infoTokens={infoTokens}
              selectedMarket={selectedMarket}
              markets={markets}
              onSelectMarket={setSelectedMarket}
            />
          </div>
        </div>
      </div>
    </SEO>
  );
}
