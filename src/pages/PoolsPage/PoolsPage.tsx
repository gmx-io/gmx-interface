import { Trans } from "@lingui/macro";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { GMMarketInfo } from "components/GMSwap/GMStats/GMStats";
import { GMSwapBox } from "components/GMSwap/GMSwapBox/GMSwapBox";
import { getSyntheticsMarkets } from "config/syntheticsMarkets";
import { getPageTitle } from "lib/legacy";
import { useState } from "react";

import "./PoolsPage.scss";

export function PoolsPage() {
  const markets = getSyntheticsMarkets();
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

        <div className="PoolsPage-content">
          <GMMarketInfo market={selectedMarket} />
          <div className="PoolsPage-swap-box">
            <GMSwapBox selectedMarket={selectedMarket} markets={markets} onSelectMarket={setSelectedMarket} />
          </div>
        </div>
      </div>

      {/* <div className="PoolsPage page-layout">
        <div className="PoolsPage-container default-container">
          <div className="section-title-block">
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>Pools</Trans>
              </div>
            </div>
          </div>
          <div className="GDSwap">
            <GDMarketInfo />
            <GDSwapBox className="PoolsPage-swap-box" />
          </div>
        </div>
        <Footer />
      </div> */}
    </SEO>
  );
}
