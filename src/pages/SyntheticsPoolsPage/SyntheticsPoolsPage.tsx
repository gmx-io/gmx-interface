import { Trans } from "@lingui/macro";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { SyntheticsMarketStats } from "components/SyntheticsMarketStats/SyntheticsMarketStats";
import { MarketPoolSwapBox } from "components/MarketPoolSwap/MarketPoolSwapBox/MarketPoolSwapBox";
import { getSyntheticsMarkets } from "config/synthetics";
import { useChainId } from "lib/chains";
import { getPageTitle } from "lib/legacy";
import { useState } from "react";

import "./SyntheticsPoolsPage.scss";

type Props = {
  connectWallet: () => void;
};

export function SyntheticsPoolsPage(p: Props) {
  const { chainId } = useChainId();

  const markets = getSyntheticsMarkets(chainId);
  const [selectedMarket, setSelectedMarket] = useState(markets[0]);

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

        <div className="SyntheticsPoolsPage-content">
          <SyntheticsMarketStats market={selectedMarket} />
          <div className="SyntheticsPoolsPage-swap-box">
            <MarketPoolSwapBox
              onConnectWallet={p.connectWallet}
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
