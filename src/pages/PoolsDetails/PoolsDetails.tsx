import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa";

import { usePoolsDetailsContext } from "context/PoolsDetailsContext/PoolsDetailsContext";
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
import { getByKey } from "lib/objects";

import ButtonLink from "components/Button/ButtonLink";
import SEO from "components/Common/SEO";
import Footer from "components/Footer/Footer";
import { GmSwapBox } from "components/Synthetics/GmSwap/GmSwapBox/GmSwapBox";
import { Operation } from "components/Synthetics/GmSwap/GmSwapBox/types";
import { MarketComposition } from "components/Synthetics/MarketStats/MarketComposition";

import { PoolsDetailsHeader } from "./PoolsDetailsHeader";

import "./PoolsDetails.scss";
import { PoolsDetailsAbout } from "./PoolsDetailsAbout";
import { PoolsDetailsCard } from "./PoolsDetailsCard";

import { Trans } from "@lingui/macro";

export function PoolsDetails() {
  const { chainId } = useChainId();
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

  const { operation, mode, market, setOperation, setMode, setMarket } = usePoolsDetailsContext();

  const [selectedMarketForGlv, setSelectedMarketForGlv] = useState<string | undefined>(undefined);

  const marketInfo = getByKey(marketsInfoData, market);

  const marketToken = getTokenData(
    operation === Operation.Deposit ? depositMarketTokensData : withdrawalMarketTokensData,
    market
  );

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
            <PoolsDetailsCard title={<Trans>Composition</Trans>}>
              <MarketComposition
                marketTokensData={depositMarketTokensData}
                marketsInfoData={marketsInfoData}
                marketInfo={marketInfo}
              />
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
