import { Trans } from "@lingui/macro";
import SEO from "components/Common/SEO";
import Footer from "components/Footer/Footer";
import { GDSwap } from "components/GDSwap/GDSwap";
import { getPageTitle } from "lib/legacy";

export function PoolsPage() {
  return (
    <SEO title={getPageTitle("Pools")}>
      <div className="PoolsPage page-layout">
        <div className="BuyGMXGLP-container default-container">
          <div className="section-title-block">
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>Pools</Trans>
              </div>
            </div>
          </div>
        </div>
        <GDSwap />
        <Footer />
      </div>
    </SEO>
  );
}
