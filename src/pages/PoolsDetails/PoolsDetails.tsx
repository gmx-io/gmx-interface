import { Trans } from "@lingui/macro";
import cx from "classnames";

import {
  usePoolsDetailsGlvOrMarketAddress,
  usePoolsDetailsMode,
  usePoolsDetailsOperation,
  usePoolsDetailsSelectedMarketForGlv,
} from "context/PoolsDetailsContext/PoolsDetailsContext";
import {
  selectDepositMarketTokensData,
  selectGlvAndMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { getTokenData } from "domain/synthetics/tokens";
import { getPageTitle } from "lib/legacy";
import { getByKey } from "lib/objects";
import { useBreakpoints } from "lib/useBreakpoints";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { BreadcrumbItem, Breadcrumbs } from "components/Breadcrumbs/Breadcrumbs";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import { GmSwapBox, GmSwapBoxProps } from "components/GmSwap/GmSwapBox/GmSwapBox";
import { GmSwapBoxHeader } from "components/GmSwap/GmSwapBox/GmSwapBoxHeader";
import Loader from "components/Loader/Loader";
import { useCompositionData } from "components/MarketStats/hooks/useCompositionData";
import { MarketComposition } from "components/MarketStats/MarketComposition";
import { MarketGraphs } from "components/MarketStats/MarketGraphs";
import SEO from "components/Seo/SEO";
import SideNav from "components/SideNav/SideNav";
import { Curtain } from "components/TradeBox/Curtain";

import { PoolsDetailsAbout } from "./PoolsDetailsAbout";
import { PoolsDetailsCard } from "./PoolsDetailsCard";
import { PoolsDetailsHeader } from "./PoolsDetailsHeader";

export function PoolsDetails() {
  const glvAndMarketsInfoData = useSelector(selectGlvAndMarketsInfoData);

  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);

  const [operation, setOperation] = usePoolsDetailsOperation();
  const [mode, setMode] = usePoolsDetailsMode();
  const [glvOrMarketAddress, setGlvOrMarketAddress] = usePoolsDetailsGlvOrMarketAddress();
  const [selectedMarketForGlv, setSelectedMarketForGlv] = usePoolsDetailsSelectedMarketForGlv();

  const glvOrMarketInfo = getByKey(glvAndMarketsInfoData, glvOrMarketAddress);

  const marketToken = getTokenData(depositMarketTokensData, glvOrMarketAddress);

  const { backing: backingComposition, market: marketComposition } = useCompositionData({
    glvOrMarketInfo: glvOrMarketInfo,
    glvAndMarketsInfoData: glvAndMarketsInfoData,
    marketTokensData: depositMarketTokensData,
  });

  const isMobile = usePoolsIsMobilePage();

  const { isDesktop: isInCurtain } = useBreakpoints();

  const breadcrumbs = (
    <Breadcrumbs>
      <BreadcrumbItem to="/pools" back>
        <Trans>Pools</Trans>
      </BreadcrumbItem>

      <BreadcrumbItem active>
        {isGlvInfo(glvOrMarketInfo) ? <Trans>GLV Vaults</Trans> : <Trans>GM Pools</Trans>}
      </BreadcrumbItem>
    </Breadcrumbs>
  );

  return (
    <AppPageLayout
      className="max-lg:pb-40"
      sideNav={<SideNav className="max-xl:pb-40" />}
      header={<ChainContentHeader breadcrumbs={breadcrumbs} leftContentClassName="!pl-0 max-md:!pl-8" />}
    >
      <SEO title={getPageTitle("V2 Pools")}>
        <div className={cx("flex flex-col gap-8")}>
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
