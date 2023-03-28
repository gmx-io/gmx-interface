import { Trans } from "@lingui/macro";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { GmSwapBox } from "components/Synthetics/GmSwap/GmSwapBox/GmSwapBox";
import { MarketStats } from "components/Synthetics/MarketStats/MarketStats";
import { SYNTHETICS_MARKET_DEPOSIT_MARKET_KEY } from "config/localStorage";
import { useMarketsInfo } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { getPageTitle } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useEffect } from "react";

import { getByKey } from "lib/objects";
import "./MarketPoolsPage.scss";

type Props = {
  connectWallet: () => void;
  setPendingTxns: (txns: any) => void;
};

export function MarketPoolsPage(p: Props) {
  const { chainId } = useChainId();

  const { marketsInfoData } = useMarketsInfo(chainId);
  const markets = Object.values(marketsInfoData);

  const [selectedMarketKey, setSelectedMarketKey] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_MARKET_KEY],
    undefined
  );
  const marketInfo = getByKey(marketsInfoData, selectedMarketKey);

  useEffect(
    function updateMarket() {
      if (!markets.length) return;

      if (
        (markets.length > 0 && !selectedMarketKey) ||
        !markets.find((m) => m.marketTokenAddress === selectedMarketKey)
      ) {
        setSelectedMarketKey(markets[0].marketTokenAddress);
      }
    },
    [selectedMarketKey, markets, setSelectedMarketKey]
  );

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
          <MarketStats marketInfo={marketInfo} />
          <div className="MarketPoolsPage-swap-box">
            <GmSwapBox
              onConnectWallet={p.connectWallet}
              selectedMarketAddress={selectedMarketKey}
              markets={markets}
              onSelectMarket={setSelectedMarketKey}
              setPendingTxns={p.setPendingTxns}
            />
          </div>
        </div>
      </div>
    </SEO>
  );
}
