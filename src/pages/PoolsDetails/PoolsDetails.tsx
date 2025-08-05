import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa";

import { usePoolsDetailsContext } from "context/PoolsDetailsContext/PoolsDetailsContext";
import {
  selectDepositMarketTokensData,
  selectGlvAndMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getTokenData } from "domain/synthetics/tokens";
import { useBreakpoints } from "lib/breakpoints";
import { getPageTitle } from "lib/legacy";
import { getByKey } from "lib/objects";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Button from "components/Button/Button";
import ButtonLink from "components/Button/ButtonLink";
import Loader from "components/Common/Loader";
import SEO from "components/Common/SEO";
import SideNav from "components/SideNav/SideNav";
import { ChainContentHeader } from "components/Synthetics/ChainContentHeader/ChainContentHeader";
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

  const { isDesktop } = useBreakpoints();

  const isInCurtain = isDesktop;

  return (
    <AppPageLayout
      className="max-lg:pb-40"
      sideNav={<SideNav className="max-xl:pb-40" />}
      header={<ChainContentHeader />}
    >
      <SEO title={getPageTitle("V2 Pools")}>
        <div className={cx("flex flex-col gap-8")}>
          <ButtonLink to="/pools">
            <Button variant="secondary" className="flex items-center gap-8">
              <FaArrowLeft size={14} />
              Back to Pools
            </Button>
          </ButtonLink>
          {glvOrMarketInfo ? (
            <>
              <PoolsDetailsHeader glvOrMarketInfo={glvOrMarketInfo} marketToken={marketToken} />

              <div className={cx("flex justify-between gap-8", { "flex-wrap": isInCurtain })}>
                <div className="flex grow flex-col gap-8">
                  {glvOrMarketInfo && <MarketGraphs glvOrMarketInfo={glvOrMarketInfo} />}

                  <div className={cx("grid gap-8", { "grid-cols-1": isMobile, "grid-cols-2": !isMobile })}>
                    <MarketComposition
                      type="backing"
                      label={<Trans>Backing Composition</Trans>}
                      title={<Trans>Exposure to Backing Tokens</Trans>}
                      composition={backingComposition}
                    />

                    <MarketComposition
                      type="market"
                      label={<Trans>Market Composition</Trans>}
                      title={<Trans>Exposure to Market Traders’ PnL</Trans>}
                      composition={marketComposition}
                    />
                  </div>
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
        </div>
      </SEO>
    </AppPageLayout>
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
