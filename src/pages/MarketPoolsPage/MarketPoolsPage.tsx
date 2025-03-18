import { t, Trans } from "@lingui/macro";
import { useEffect, useRef, useState } from "react";

import { Mode, Operation } from "components/Synthetics/GmSwap/GmSwapBox/types";
import { getSyntheticsDepositMarketKey } from "config/localStorage";
import {
  selectDepositMarketTokensData,
  selectGlvAndMarketsInfoData,
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
import { GlvList } from "components/Synthetics/GmList/GlvList";
import { GmList } from "components/Synthetics/GmList/GmList";
import { getGmSwapBoxAvailableModes } from "components/Synthetics/GmSwap/GmSwapBox/getGmSwapBoxAvailableModes";
import { GmSwapBox } from "components/Synthetics/GmSwap/GmSwapBox/GmSwapBox";
import { MarketStatsWithComposition } from "components/Synthetics/MarketStats/MarketStatsWithComposition";

import "./MarketPoolsPage.scss";

export function MarketPoolsPage() {
  const { chainId } = useChainId();
  const gmSwapBoxRef = useRef<HTMLDivElement>(null);

  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);

  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);
  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const {
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    glvTokensIncentiveAprData,
    marketsTokensLidoAprData,
    glvApyInfoData,
  } = useGmMarketsApy(chainId);

  const [operation, setOperation] = useState<Operation>(Operation.Deposit);
  let [mode, setMode] = useState<Mode>(Mode.Single);

  const [selectedMarketOrGlvKey, setSelectedMarketOrGlvKey] = useLocalStorageSerializeKey<string | undefined>(
    getSyntheticsDepositMarketKey(chainId),
    undefined
  );

  const [selectedMarketForGlv, setSelectedMarketForGlv] = useState<string | undefined>(undefined);

  useEffect(() => {
    const newAvailableModes = getGmSwapBoxAvailableModes(operation, getByKey(marketsInfoData, selectedMarketOrGlvKey));

    if (!newAvailableModes.includes(mode)) {
      setMode(newAvailableModes[0]);
    }
  }, [marketsInfoData, mode, operation, selectedMarketOrGlvKey]);

  const marketInfo = getByKey(marketsInfoData, selectedMarketOrGlvKey);

  const marketToken = getTokenData(
    operation === Operation.Deposit ? depositMarketTokensData : withdrawalMarketTokensData,
    selectedMarketOrGlvKey
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
              <Trans>
                <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v2/#glv-pools">
                  GLV Vaults
                </ExternalLink>{" "}
                include multiple GM Tokens and are automatically rebalanced.
              </Trans>
              <br />
              <Trans>Shift GM Tokens between eligible pools without paying buy/sell fees.</Trans>
            </>
          }
          qa="pools-page"
        />

        <div className="MarketPoolsPage-content mb-15 gap-12">
          <MarketStatsWithComposition
            marketsTokensApyData={marketsTokensApyData}
            marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
            glvTokensIncentiveAprData={glvTokensIncentiveAprData}
            marketsTokensLidoAprData={marketsTokensLidoAprData}
            marketTokensData={depositMarketTokensData}
            marketsInfoData={marketsInfoData}
            marketInfo={marketInfo}
            marketToken={marketToken}
            glvTokensApyData={glvApyInfoData}
          />

          <div className="MarketPoolsPage-swap-box" ref={gmSwapBoxRef}>
            <GmSwapBox
              selectedMarketAddress={selectedMarketOrGlvKey}
              onSelectMarket={setSelectedMarketOrGlvKey}
              selectedMarketForGlv={selectedMarketForGlv}
              onSelectedMarketForGlv={setSelectedMarketForGlv}
              operation={operation}
              mode={mode}
              onSetMode={setMode}
              onSetOperation={setOperation}
            />
          </div>
        </div>

        <PageTitle
          title={<Trans>Select a GLV Vault</Trans>}
          showNetworkIcon={false}
          subtitle={
            <Trans>
              Yield-optimized vaults enabling trading across multiple markets, backed by the tokens listed in brackets.
            </Trans>
          }
        />
        <GlvList
          marketsTokensApyData={marketsTokensApyData}
          marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
          glvTokensIncentiveAprData={glvTokensIncentiveAprData}
          marketsTokensLidoAprData={marketsTokensLidoAprData}
          glvTokensApyData={glvApyInfoData}
          shouldScrollToTop
          isDeposit
        />
        <PageTitle
          title={t`Select a GM Pool`}
          showNetworkIcon={false}
          subtitle={
            <Trans>Pools that enable trading for a single market, backed by the tokens listed in brackets.</Trans>
          }
        />
        <GmList
          glvTokensApyData={glvApyInfoData}
          glvTokensIncentiveAprData={glvTokensIncentiveAprData}
          marketsTokensApyData={marketsTokensApyData}
          marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
          marketsTokensLidoAprData={marketsTokensLidoAprData}
          shouldScrollToTop
          isDeposit
        />
      </div>
      <Footer />
    </SEO>
  );
}
