import { Trans } from "@lingui/macro";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { GDMarketInfo } from "components/GDSwap/GDMarketInfo/GDMarketInfo";
import { GDSwapBox } from "components/GDSwap/GDSwapBox/GDSwapBox";
import { getPageTitle } from "lib/legacy";

import "./PoolsPage.css";

export function PoolsPage() {
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
                Purchase <ExternalLink href="https://gmxio.gitbook.io/gmx/gd">GD tokens</ExternalLink>
              </Trans>
              <br />
            </div>
          </div>
        </div>

        <div className="PoolsPage-content">
          <GDMarketInfo />
          <GDSwapBox className="PoolsPage-swap-box" />
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
