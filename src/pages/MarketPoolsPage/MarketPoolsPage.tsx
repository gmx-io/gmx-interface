import { Trans } from "@lingui/macro";
import { useEffect, useRef, useState } from "react";

import { Mode, Operation } from "components/Synthetics/GmSwap/GmSwapBox/types";
import { getSyntheticsDepositMarketKey } from "config/localStorage";
import { selectDepositMarketTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { MarketsInfoData, useMarketsInfoRequest, useMarketTokensData } from "domain/synthetics/markets";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
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
import { GmSwapBox } from "components/Synthetics/GmSwap/GmSwapBox/GmSwapBox";
import { MarketStats } from "components/Synthetics/MarketStats/MarketStats";

import "./MarketPoolsPage.scss";

export function MarketPoolsPage() {
  const { chainId } = useChainId();
  const gmSwapBoxRef = useRef<HTMLDivElement>(null);

  const { marketsInfoData = EMPTY_OBJECT as MarketsInfoData } = useMarketsInfoRequest(chainId);

  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);
  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const { marketsTokensApyData, marketsTokensIncentiveAprData } = useGmMarketsApy(chainId);

  const [operation, setOperation] = useState<Operation>(Operation.Deposit);
  let [mode, setMode] = useState<Mode>(Mode.Single);

  const [selectedMarketKey, setSelectedMarketKey] = useLocalStorageSerializeKey<string | undefined>(
    getSyntheticsDepositMarketKey(chainId),
    undefined
  );

  useEffect(() => {
    const newAvailableModes = getGmSwapBoxAvailableModes(operation, getByKey(marketsInfoData, selectedMarketKey));

    if (!newAvailableModes.includes(mode)) {
      setMode(newAvailableModes[0]);
    }
  }, [marketsInfoData, mode, operation, selectedMarketKey]);

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
          qa="pools-page"
        />

        <div className="MarketPoolsPage-content">
          <MarketStats
            marketsTokensApyData={marketsTokensApyData}
            marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
            marketTokensData={depositMarketTokensData}
            marketsInfoData={marketsInfoData}
            marketInfo={marketInfo}
            marketToken={marketToken}
          />

          <div className="MarketPoolsPage-swap-box" ref={gmSwapBoxRef}>
            <GmSwapBox
              selectedMarketAddress={selectedMarketKey}
              onSelectMarket={setSelectedMarketKey}
              operation={operation}
              mode={mode}
              onSetMode={setMode}
              onSetOperation={setOperation}
            />
          </div>
        </div>

        <div className="Tab-title-section">
          <div className="Page-title">
            <Trans>Select a Market</Trans>
          </div>
        </div>
        <GmList
          marketsTokensApyData={marketsTokensApyData}
          marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
          shouldScrollToTop={true}
          isDeposit
        />
      </div>
      <Footer />
    </SEO>
  );
}
