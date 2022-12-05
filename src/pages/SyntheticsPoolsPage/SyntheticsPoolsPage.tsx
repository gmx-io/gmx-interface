import { Trans } from "@lingui/macro";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { SyntheticsMarketStats } from "components/SyntheticsMarketStats/SyntheticsMarketStats";
import { MarketPoolSwapBox } from "components/MarketPoolSwap/MarketPoolSwapBox/MarketPoolSwapBox";
import { useChainId } from "lib/chains";
import { getPageTitle } from "lib/legacy";
import { useEffect, useState } from "react";
import "./SyntheticsPoolsPage.scss";
import { useMarkets } from "domain/synthetics/markets/useMarkets";
import { getMarkets } from "domain/synthetics/markets/utils";

type Props = {
  connectWallet: () => void;
};

export function SyntheticsPoolsPage(p: Props) {
  const { chainId } = useChainId();

  const marketsData = useMarkets(chainId);
  const markets = getMarkets(marketsData);

  // TODO: localStorage?
  const [selectedMarketKey, setSelectedMarketKey] = useState<string>();

  useEffect(() => {
    if (markets.length > 0 && !selectedMarketKey) {
      setSelectedMarketKey(markets[0].marketTokenAddress);
    }
  }, [selectedMarketKey, markets]);

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
          <SyntheticsMarketStats marketKey={selectedMarketKey} />
          <div className="SyntheticsPoolsPage-swap-box">
            <MarketPoolSwapBox
              onConnectWallet={p.connectWallet}
              selectedMarketAddress={selectedMarketKey}
              markets={markets}
              onSelectMarket={setSelectedMarketKey}
            />
          </div>
        </div>
      </div>
    </SEO>
  );
}
