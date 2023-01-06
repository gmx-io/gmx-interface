import { Trans } from "@lingui/macro";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { MarketStats } from "components/Synthetics/MarketStats/MarketStats";
import { useChainId } from "lib/chains";
import { getPageTitle } from "lib/legacy";
import { useEffect, useState } from "react";
import "./MarketPoolsPage.scss";
import { getMarkets } from "domain/synthetics/markets/utils";
import { useMarketsData } from "domain/synthetics/markets";
import { GmSwapBox } from "components/Synthetics/GmSwap/GmSwapBox/GmSwapBox";

type Props = {
  connectWallet: () => void;
};

export function MarketPoolsPage(p: Props) {
  const { chainId } = useChainId();

  const { marketsData } = useMarketsData(chainId);
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

        <div className="MarketPoolsPage-content">
          <MarketStats marketKey={selectedMarketKey} />
          <div className="MarketPoolsPage-swap-box">
            <GmSwapBox
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
