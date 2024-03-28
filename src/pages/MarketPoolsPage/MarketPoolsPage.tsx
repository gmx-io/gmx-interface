import { Trans } from "@lingui/macro";
import { useRef, useState } from "react";

import { getSyntheticsDepositMarketKey } from "config/localStorage";
import { MarketsInfoData, useMarketsInfoRequest, useMarketTokensData } from "domain/synthetics/markets";
import { useMarketTokensAPR } from "domain/synthetics/markets/useMarketTokensAPR";
import { getTokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { getPageTitle } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { EMPTY_OBJECT, getByKey } from "lib/objects";

import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";
import { GmList } from "components/Synthetics/GmList/GmList";
import { getGmSwapBoxAvailableModes } from "components/Synthetics/GmSwap/GmSwapBox/getGmSwapBoxAvailableModes";
import { GmSwapBox, Mode, Operation } from "components/Synthetics/GmSwap/GmSwapBox/GmSwapBox";
import { MarketStats } from "components/Synthetics/MarketStats/MarketStats";

import "./MarketPoolsPage.scss";

type Props = {
  setPendingTxns: (txns: any) => void;
  shouldDisableValidation?: boolean;
};

export function MarketPoolsPage(p: Props) {
  const { chainId } = useChainId();
  const gmSwapBoxRef = useRef<HTMLDivElement>(null);

  function buySellActionHandler() {
    gmSwapBoxRef?.current?.scrollIntoView();
    window.scrollBy(0, -25); // add some offset
  }

  const { marketsInfoData = EMPTY_OBJECT as MarketsInfoData, tokensData } = useMarketsInfoRequest(chainId);
  const markets = Object.values(marketsInfoData);

  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const { marketsTokensAPRData, marketsTokensIncentiveAprData } = useMarketTokensAPR(chainId);

  const [operation, setOperation] = useState<Operation>(Operation.Deposit);
  let [mode, setMode] = useState<Mode>(Mode.Single);

  const [selectedMarketKey, setSelectedMarketKey] = useLocalStorageSerializeKey<string | undefined>(
    getSyntheticsDepositMarketKey(chainId),
    undefined
  );

  const handleSetSelectedMarketKey = (marketKey: string) => {
    const currentMode = mode;
    const newAvailableModes = getGmSwapBoxAvailableModes(operation, getByKey(marketsInfoData, marketKey));

    if (newAvailableModes.includes(currentMode)) {
      setSelectedMarketKey(marketKey);
      return;
    }

    const firstAvailableMode = newAvailableModes[0];
    setMode(firstAvailableMode);
    setSelectedMarketKey(marketKey);
  };

  const marketInfo = getByKey(marketsInfoData, selectedMarketKey);

  const marketToken = getTokenData(
    operation === Operation.Deposit ? depositMarketTokensData : withdrawalMarketTokensData,
    selectedMarketKey
  );

  return (
    <SEO title={getPageTitle("V2 Pools")}>
      <div className="default-container page-layout">
        <PageTitle
          title="V2 Pools"
          isTop
          subtitle={
            <Trans>
              Purchase <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v2">GM Tokens</ExternalLink> to
              earn fees from swaps and leverage trading.
            </Trans>
          }
        />

        <div className="MarketPoolsPage-content">
          <MarketStats
            marketsTokensAPRData={marketsTokensAPRData}
            marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
            marketTokensData={depositMarketTokensData}
            marketsInfoData={marketsInfoData}
            marketInfo={marketInfo}
            marketToken={marketToken}
          />

          <div className="MarketPoolsPage-swap-box" ref={gmSwapBoxRef}>
            <GmSwapBox
              selectedMarketAddress={selectedMarketKey}
              markets={markets}
              shouldDisableValidation={p.shouldDisableValidation}
              marketsInfoData={marketsInfoData}
              tokensData={tokensData}
              onSelectMarket={handleSetSelectedMarketKey}
              setPendingTxns={p.setPendingTxns}
              operation={operation}
              mode={mode}
              setMode={setMode}
              setOperation={setOperation}
            />
          </div>
        </div>

        <div className="Tab-title-section">
          <div className="Page-title">
            <Trans>Select a Market</Trans>
          </div>
        </div>
        <GmList
          marketsTokensAPRData={marketsTokensAPRData}
          marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
          marketTokensData={depositMarketTokensData}
          marketsInfoData={marketsInfoData}
          tokensData={tokensData}
          buySellActionHandler={buySellActionHandler}
          shouldScrollToTop={true}
        />
      </div>
      <Footer />
    </SEO>
  );
}
