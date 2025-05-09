import { Trans } from "@lingui/macro";
import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa";

import { usePoolsDetailsContext } from "context/PoolsDetailsContext/PoolsDetailsContext";
import {
  selectDepositMarketTokensData,
  selectGlvAndMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getTokenData } from "domain/synthetics/tokens";
import { getPageTitle } from "lib/legacy";
import { getByKey } from "lib/objects";

import ButtonLink from "components/Button/ButtonLink";
import SEO from "components/Common/SEO";
import Footer from "components/Footer/Footer";
import { GmSwapBox } from "components/Synthetics/GmSwap/GmSwapBox/GmSwapBox";
import { useCompositionData } from "components/Synthetics/MarketStats/hooks/useCompositionData";
import { MarketComposition } from "components/Synthetics/MarketStats/MarketComposition";

import { PoolsDetailsAbout } from "./PoolsDetailsAbout";
import { PoolsDetailsCard } from "./PoolsDetailsCard";
import { PoolsDetailsHeader } from "./PoolsDetailsHeader";

import "./PoolsDetails.scss";

export function PoolsDetails() {
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);

  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);

  const { operation, mode, market, setOperation, setMode, setMarket } = usePoolsDetailsContext();

  const [selectedMarketForGlv, setSelectedMarketForGlv] = useState<string | undefined>(undefined);

  const marketInfo = getByKey(marketsInfoData, market);

  const marketToken = getTokenData(depositMarketTokensData, market);

  const { backing: backingComposition, market: marketComposition } = useCompositionData({
    marketInfo,
    marketsInfoData,
    marketTokensData: depositMarketTokensData,
  });

  return (
    <SEO title={getPageTitle("V2 Pools")}>
      <div className="default-container page-layout flex flex-col gap-16">
        <ButtonLink to="/pools" className="inline-flex w-fit gap-4 rounded-4 bg-slate-700 px-16 py-12">
          <FaArrowLeft size={16} />
          Back to Pools
        </ButtonLink>
        <PoolsDetailsHeader marketInfo={marketInfo} marketToken={marketToken} />

        <div className="PoolsDetails-content mb-15 gap-12">
          <div className="grow">
            <PoolsDetailsCard title={<Trans>Composition</Trans>} childrenContainerClassName="!p-0">
              <div className="grid grid-cols-2">
                <MarketComposition
                  type="backing"
                  label={<Trans>Backing Composition</Trans>}
                  title={<Trans>Direct exposure to tokens</Trans>}
                  composition={backingComposition}
                />
                <MarketComposition
                  type="market"
                  label={<Trans>Market Composition</Trans>}
                  title={<Trans>Market exposure to Trader PnL</Trans>}
                  composition={marketComposition}
                />
              </div>
            </PoolsDetailsCard>
          </div>

          <div className="PoolsDetails-swap-box">
            <GmSwapBox
              selectedMarketAddress={market}
              onSelectMarket={setMarket}
              selectedMarketForGlv={selectedMarketForGlv}
              onSelectedMarketForGlv={setSelectedMarketForGlv}
              operation={operation}
              mode={mode}
              onSetMode={setMode}
              onSetOperation={setOperation}
            />
          </div>
        </div>

        <PoolsDetailsCard title={<Trans>About</Trans>}>
          <PoolsDetailsAbout
            marketInfo={marketInfo}
            marketToken={marketToken}
            marketsInfoData={marketsInfoData}
            marketTokensData={depositMarketTokensData}
          />
        </PoolsDetailsCard>
      </div>
      <Footer />
    </SEO>
  );
}
