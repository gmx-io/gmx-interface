import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { useMedia } from "react-use";

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
import { GmSwapBox, GmSwapBoxProps } from "components/Synthetics/GmSwap/GmSwapBox/GmSwapBox";
import { GmSwapBoxHeader } from "components/Synthetics/GmSwap/GmSwapBox/GmSwapBoxHeader";
import { useCompositionData } from "components/Synthetics/MarketStats/hooks/useCompositionData";
import { MarketComposition } from "components/Synthetics/MarketStats/MarketComposition";
import { MarketGraphs } from "components/Synthetics/MarketStats/MarketGraphs";
import { Curtain } from "components/Synthetics/TradeBox/Curtain";

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

  const isMobile = useMedia("(max-width: 768px)");

  return (
    <SEO title={getPageTitle("V2 Pools")}>
      <div className={cx("default-container page-layout flex flex-col", { "gap-12": isMobile, "gap-16": !isMobile })}>
        <ButtonLink to="/pools" className="inline-flex w-fit gap-4 rounded-4 bg-slate-700 px-16 py-12">
          <FaArrowLeft size={16} />
          Back to Pools
        </ButtonLink>
        <PoolsDetailsHeader marketInfo={marketInfo} marketToken={marketToken} />

        <div className="PoolsDetails-content mb-15 gap-12">
          <div className="flex grow flex-col gap-16">
            {marketInfo && <MarketGraphs marketInfo={marketInfo} />}
            <PoolsDetailsCard title={<Trans>Composition</Trans>} childrenContainerClassName="!p-0">
              <div className={cx("grid", { "grid-cols-1": isMobile, "grid-cols-2": !isMobile })}>
                <div className={cx("border-stroke-primary", { "border-r": !isMobile, "border-b": isMobile })}>
                  <MarketComposition
                    type="backing"
                    label={<Trans>Backing Composition</Trans>}
                    title={<Trans>Direct exposure to tokens</Trans>}
                    composition={backingComposition}
                  />
                </div>
                <MarketComposition
                  type="market"
                  label={<Trans>Market Composition</Trans>}
                  title={<Trans>Market exposure to Trader PnL</Trans>}
                  composition={marketComposition}
                />
              </div>
            </PoolsDetailsCard>

            <PoolsDetailsCard title={<Trans>About</Trans>}>
              <PoolsDetailsAbout
                marketInfo={marketInfo}
                marketToken={marketToken}
                marketsInfoData={marketsInfoData}
                marketTokensData={depositMarketTokensData}
              />
            </PoolsDetailsCard>
          </div>

          <PoolsDetailsGmSwapBox
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
      <Footer />
    </SEO>
  );
}

const PoolsDetailsGmSwapBox = (props: GmSwapBoxProps) => {
  const isInCurtain = useMedia("(max-width: 1180px)");

  if (!isInCurtain) {
    return (
      <div className="PoolsDetails-swap-box">
        <GmSwapBoxHeader {...props} />
        <GmSwapBox {...props} />
      </div>
    );
  }

  return (
    <Curtain header={<GmSwapBoxHeader {...props} isInCurtain />} dataQa="tradebox">
      <GmSwapBox {...props} />
    </Curtain>
  );
};
