import { Trans } from "@lingui/macro";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { GmSwapBox, Mode, Operation } from "components/Synthetics/GmSwap/GmSwapBox/GmSwapBox";
import { MarketStats } from "components/Synthetics/MarketStats/MarketStats";
import { SYNTHETICS_MARKET_DEPOSIT_MARKET_KEY } from "config/localStorage";
import { useMarketTokensData, useMarketsData } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { getPageTitle } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useEffect, useState } from "react";

import "./MarketPoolsPage.scss";
import { getTokenData } from "domain/synthetics/tokens";

type Props = {
  connectWallet: () => void;
  setPendingTxns: (txns: any) => void;
};

export function MarketPoolsPage(p: Props) {
  const { chainId } = useChainId();

  const { marketsData } = useMarketsData(chainId);
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const markets = Object.values(marketsData);

  const [operation, setOperation] = useState<Operation>(Operation.Deposit);
  const [mode, setMode] = useState<Mode>(Mode.Single);

  const [selectedMarketKey, setSelectedMarketKey] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_MARKET_KEY],
    undefined
  );

  const marketToken = getTokenData(
    operation === Operation.Deposit ? depositMarketTokensData : withdrawalMarketTokensData,
    selectedMarketKey
  );

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
          <MarketStats marketKey={selectedMarketKey} marketToken={marketToken} />
          <div className="MarketPoolsPage-swap-box">
            <GmSwapBox
              onConnectWallet={p.connectWallet}
              selectedMarketAddress={selectedMarketKey}
              markets={markets}
              onSelectMarket={setSelectedMarketKey}
              setPendingTxns={p.setPendingTxns}
              operation={operation}
              mode={mode}
              setMode={setMode}
              setOperation={setOperation}
            />
          </div>
        </div>
      </div>
    </SEO>
  );
}
