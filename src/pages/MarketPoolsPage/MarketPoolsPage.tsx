import { Trans } from "@lingui/macro";
import { useEffect, useRef, useState } from "react";

import { Mode, Operation } from "components/Synthetics/GmSwap/GmSwapBox/types";
import { getSyntheticsDepositMarketKey } from "config/localStorage";
import {
  selectAllMarketsData,
  selectDepositMarketTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMarketTokensData } from "domain/synthetics/markets";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { getTokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { getPageTitle } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";

import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";
import { getGmSwapBoxAvailableModes } from "components/Synthetics/GmSwap/GmSwapBox/getGmSwapBoxAvailableModes";
import { GmSwapBox } from "components/Synthetics/GmSwap/GmSwapBox/GmSwapBox";

import { MarketStatsWithComposition } from "components/Synthetics/MarketStats/MarketStatsWithComposition";
import "./MarketPoolsPage.scss";
import { GmList } from "components/Synthetics/GmList/GmList";

export function MarketPoolsPage() {
  const { chainId } = useChainId();
  const gmSwapBoxRef = useRef<HTMLDivElement>(null);

  const marketsInfoData = useSelector(selectAllMarketsData);

  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);
  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const { marketsTokensApyData, marketsTokensIncentiveAprData, marketsTokensLidoAprData, glvApyInfoData } =
    useGmMarketsApy(chainId);

  const [operation, setOperation] = useState<Operation>(Operation.Deposit);
  let [mode, setMode] = useState<Mode>(Mode.Single);

  const [selectedMarketGmKey, setSelectedMarketGmKey] = useLocalStorageSerializeKey<string | undefined>(
    getSyntheticsDepositMarketKey(chainId),
    undefined
  );

  const [selectedGlvGmMarketKey, setSelectedGlvGmMarketKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    const newAvailableModes = getGmSwapBoxAvailableModes(operation, getByKey(marketsInfoData, selectedMarketGmKey));

    if (!newAvailableModes.includes(mode)) {
      setMode(newAvailableModes[0]);
    }
  }, [marketsInfoData, mode, operation, selectedMarketGmKey]);

  const marketInfo = getByKey(marketsInfoData, selectedMarketGmKey);

  const marketToken = getTokenData(
    operation === Operation.Deposit ? depositMarketTokensData : withdrawalMarketTokensData,
    selectedMarketGmKey
  );

  return (
    <SEO title={getPageTitle("V2 Pools")}>
      <div className="default-container page-layout">
        <PageTitle
          title="V2 Pools"
          isTop
          subtitle={
            <>
              <Trans>
                Purchase <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v2">GM Tokens</ExternalLink>{" "}
                to earn fees from swaps and leverage trading.
              </Trans>
              <br />
              <Trans>GLV Vaults include multiple GM Tokens and are automatically rebalanced.</Trans>
              <br />
              <Trans>Shift GM Tokens between eligible pools without paying buy/sell fees.</Trans>
            </>
          }
          qa="pools-page"
        />

        <div className="MarketPoolsPage-content gap-12">
          <MarketStatsWithComposition
            marketsTokensApyData={marketsTokensApyData}
            marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
            marketsTokensLidoAprData={marketsTokensLidoAprData}
            marketTokensData={depositMarketTokensData}
            marketsInfoData={marketsInfoData}
            marketInfo={marketInfo}
            marketToken={marketToken}
            glvMarketsTokensApyData={glvApyInfoData}
          />

          <div className="MarketPoolsPage-swap-box" ref={gmSwapBoxRef}>
            <GmSwapBox
              selectedMarketAddress={selectedMarketGmKey}
              onSelectMarket={setSelectedMarketGmKey}
              selectedGlvGmMarket={selectedGlvGmMarketKey}
              onSelectGlvGmMarket={setSelectedGlvGmMarketKey}
              operation={operation}
              mode={mode}
              onSetMode={setMode}
              onSetOperation={setOperation}
            />
          </div>
        </div>

        <div className="Tab-title-section">
          <div className="Page-title">
            <Trans>Select a Pool</Trans>
          </div>
        </div>
        <GmList
          glvMarketsTokensApyData={glvApyInfoData}
          marketsTokensApyData={marketsTokensApyData}
          marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
          marketsTokensLidoAprData={marketsTokensLidoAprData}
          shouldScrollToTop={true}
          isDeposit
        />
      </div>
      <Footer />
    </SEO>
  );
}
