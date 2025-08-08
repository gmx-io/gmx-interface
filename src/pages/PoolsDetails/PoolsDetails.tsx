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
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import ButtonLink from "components/Button/ButtonLink";
import Loader from "components/Common/Loader";
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

export function PoolsDetails() {
  const glvAndMarketsInfoData = useSelector(selectGlvAndMarketsInfoData);

  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);

  const { operation, mode, glvOrMarketAddress, setOperation, setMode, setGlvOrMarketAddress } =
    usePoolsDetailsContext();

  const [selectedMarketForGlv, setSelectedMarketForGlv] = useState<string | undefined>(undefined);

  const glvOrMarketInfo = getByKey(glvAndMarketsInfoData, glvOrMarketAddress);

  const marketToken = getTokenData(depositMarketTokensData, glvOrMarketAddress);

  const { backing: backingComposition, market: marketComposition } = useCompositionData({
    glvOrMarketInfo: glvOrMarketInfo,
    glvAndMarketsInfoData: glvAndMarketsInfoData,
    marketTokensData: depositMarketTokensData,
  });

  const isMobile = usePoolsIsMobilePage();

  const isInCurtain = useMedia("(max-width: 1180px)");

  return (
    <SEO title={getPageTitle("V2 Pools")}>
      <div className={cx("default-container page-layout flex flex-col", { "gap-12": isMobile, "gap-16": !isMobile })}>
        <ButtonLink
          to="/pools"
          className="inline-flex w-fit gap-4 rounded-4 bg-slate-700 px-16 py-12 hover:bg-cold-blue-700"
        >
          <FaArrowLeft size={16} />
          <Trans>Back to Pools</Trans>
        </ButtonLink>
        {glvOrMarketInfo ? (
          <>
            <PoolsDetailsHeader glvOrMarketInfo={glvOrMarketInfo} marketToken={marketToken} />

            <div className={cx("mb-15 flex justify-between gap-12", { "flex-wrap": isInCurtain })}>
              <div className="flex grow flex-col gap-16">
                {glvOrMarketInfo && <MarketGraphs glvOrMarketInfo={glvOrMarketInfo} />}
                <PoolsDetailsCard title={<Trans>Composition</Trans>} childrenContainerClassName="!p-0">
                  <div className={cx("grid", { "grid-cols-1": isMobile, "grid-cols-2": !isMobile })}>
                    <div className={cx("border-stroke-primary", { "border-r": !isMobile, "border-b": isMobile })}>
                      <MarketComposition
                        type="backing"
                        label={<Trans>Backing Composition</Trans>}
                        title={<Trans>Exposure to Backing Tokens</Trans>}
                        composition={backingComposition}
                      />
                    </div>
                    <MarketComposition
                      type="market"
                      label={<Trans>Market Composition</Trans>}
                      title={<Trans>Exposure to Market Traders’ PnL</Trans>}
                      composition={marketComposition}
                    />
                  </div>
                </PoolsDetailsCard>

                <PoolsDetailsCard title={<Trans>About</Trans>}>
                  <PoolsDetailsAbout
                    glvOrMarketInfo={glvOrMarketInfo}
                    marketToken={marketToken}
                    marketsInfoData={glvAndMarketsInfoData}
                    marketTokensData={depositMarketTokensData}
                  />
                </PoolsDetailsCard>
              </div>

              <PoolsDetailsGmSwapBox
                selectedGlvOrMarketAddress={glvOrMarketAddress}
                onSelectGlvOrMarket={setGlvOrMarketAddress}
                selectedMarketForGlv={selectedMarketForGlv}
                onSelectedMarketForGlv={setSelectedMarketForGlv}
                operation={operation}
                mode={mode}
                onSetMode={setMode}
                onSetOperation={setOperation}
                isInCurtain={isInCurtain}
              />
            </div>
          </>
        ) : (
          <Loader />
        )}
        <Footer />
      </div>
    </SEO>
  );
}

const PoolsDetailsGmSwapBox = (props: GmSwapBoxProps & { isInCurtain: boolean }) => {
  const { isInCurtain } = props;

  if (!isInCurtain) {
    return (
      <div
        className={cx({
          "w-full max-w-[44rem]": !isInCurtain,
          "w-full max-w-none": isInCurtain,
        })}
      >
        <GmSwapBoxHeader {...props} />
        <GmSwapBox {...props} />
      </div>
    );
  }

  return (
    <Curtain header={<GmSwapBoxHeader {...props} isInCurtain />}>
      <GmSwapBox {...props} />
    </Curtain>
  );
};
