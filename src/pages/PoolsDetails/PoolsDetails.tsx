import { Trans } from "@lingui/macro";
import cx from "classnames";
import { Redirect } from "react-router-dom";

import { CONTRACTS_CHAIN_IDS, ContractsChainId } from "config/chains";
import {
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsGlvOrMarketInfo,
} from "context/PoolsDetailsContext/selectors";
import {
  selectChainId,
  selectDepositMarketTokensData,
  selectGlvAndMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isGlvAddress, isGlvInfo } from "domain/synthetics/markets/glv";
import { getTokenData } from "domain/synthetics/tokens";
import { useBreakpoints } from "lib/useBreakpoints";
import useRouteQuery from "lib/useRouteQuery";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";
import { isMarketTokenAddress } from "sdk/configs/markets";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { BreadcrumbItem, Breadcrumbs } from "components/Breadcrumbs/Breadcrumbs";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import ErrorBoundary from "components/Errors/ErrorBoundary";
import { GmSwapBox } from "components/GmSwap/GmSwapBox/GmSwapBox";
import { GmSwapBoxHeader } from "components/GmSwap/GmSwapBox/GmSwapBoxHeader";
import Loader from "components/Loader/Loader";
import { useCompositionData } from "components/MarketStats/hooks/useCompositionData";
import { MarketComposition } from "components/MarketStats/MarketComposition";
import { MarketGraphs } from "components/MarketStats/MarketGraphs";
import SideNav from "components/SideNav/SideNav";
import { Curtain } from "components/TradeBox/Curtain";

import { PoolsDetailsAbout } from "./PoolsDetailsAbout";
import { PoolsDetailsCard } from "./PoolsDetailsCard";
import { PoolsDetailsHeader } from "./PoolsDetailsHeader";

export function PoolsDetails() {
  const chainId = useSelector(selectChainId);
  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);
  const glvAndMarketsInfoData = useSelector(selectGlvAndMarketsInfoData);

  const glvOrMarketAddress = useSelector(selectPoolsDetailsGlvOrMarketAddress);
  const glvOrMarketInfo = useSelector(selectPoolsDetailsGlvOrMarketInfo);
  const searchParams = useRouteQuery();
  const requestedMarketAddress = searchParams.get("market");
  const requestedChainId = Number(searchParams.get("chainId"));
  const isChainChangePending =
    CONTRACTS_CHAIN_IDS.includes(requestedChainId as ContractsChainId) && requestedChainId !== chainId;
  const isValidMarketAddress =
    requestedMarketAddress !== null &&
    (isMarketTokenAddress(chainId, requestedMarketAddress) || isGlvAddress(chainId, requestedMarketAddress));

  const marketToken = getTokenData(depositMarketTokensData, glvOrMarketAddress);

  const { backing: backingComposition, market: marketComposition } = useCompositionData({
    glvOrMarketInfo: glvOrMarketInfo,
    glvAndMarketsInfoData: glvAndMarketsInfoData,
    marketTokensData: depositMarketTokensData,
  });

  const isMobile = usePoolsIsMobilePage();

  const { isDesktop: isInCurtain } = useBreakpoints();

  if (!isValidMarketAddress && !isChainChangePending) {
    return <Redirect to="/pools" />;
  }

  const breadcrumbs = (
    <Breadcrumbs>
      <BreadcrumbItem to="/pools" back>
        <Trans>Pools</Trans>
      </BreadcrumbItem>

      <BreadcrumbItem active>
        {isGlvInfo(glvOrMarketInfo) ? <Trans>GLV vaults</Trans> : <Trans>GM pools</Trans>}
      </BreadcrumbItem>
    </Breadcrumbs>
  );

  return (
    <AppPageLayout
      title="V2 Pools"
      className="max-lg:pb-40"
      sideNav={<SideNav className="max-xl:pb-40" />}
      header={<ChainContentHeader breadcrumbs={breadcrumbs} leftContentClassName="!pl-0 max-md:!pl-8" />}
    >
      <div className={cx("flex flex-col gap-8")}>
        {glvOrMarketInfo ? (
          <>
            <PoolsDetailsHeader glvOrMarketInfo={glvOrMarketInfo} marketToken={marketToken} />

            <div className={cx("flex justify-between gap-8", { "flex-wrap": isInCurtain })}>
              <div className="flex grow flex-col gap-8">
                <ErrorBoundary id="PoolsDetails-MarketGraphs" variant="block" wrapperClassName="rounded-t-8">
                  {glvOrMarketInfo && <MarketGraphs glvOrMarketInfo={glvOrMarketInfo} />}
                </ErrorBoundary>

                <ErrorBoundary id="PoolsDetails-MarketComposition" variant="block" wrapperClassName="rounded-t-8">
                  <div className={cx("grid gap-8", { "grid-cols-1": isMobile, "grid-cols-2": !isMobile })}>
                    <MarketComposition
                      type="backing"
                      label={<Trans>Backing composition</Trans>}
                      title={<Trans>Exposure to backing tokens</Trans>}
                      composition={backingComposition}
                    />

                    <MarketComposition
                      type="market"
                      label={<Trans>Market composition</Trans>}
                      title={<Trans>Exposure to market traders' PnL</Trans>}
                      composition={marketComposition}
                    />
                  </div>
                </ErrorBoundary>
                <PoolsDetailsCard title={<Trans>About</Trans>}>
                  <PoolsDetailsAbout
                    glvOrMarketInfo={glvOrMarketInfo}
                    marketToken={marketToken}
                    marketsInfoData={glvAndMarketsInfoData}
                    marketTokensData={depositMarketTokensData}
                  />
                </PoolsDetailsCard>
              </div>

              <PoolsDetailsGmSwapBox isInCurtain={isInCurtain} />
            </div>
          </>
        ) : (
          <Loader />
        )}
      </div>
    </AppPageLayout>
  );
}

const PoolsDetailsGmSwapBox = ({ isInCurtain }: { isInCurtain: boolean }) => {
  if (!isInCurtain) {
    return (
      <div
        className={cx({
          "w-full max-w-[44rem]": !isInCurtain,
          "w-full max-w-none": isInCurtain,
        })}
      >
        <GmSwapBoxHeader isInCurtain={isInCurtain} />
        <ErrorBoundary id="PoolsDetails-GmSwapBox" variant="block">
          <GmSwapBox />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <Curtain header={<GmSwapBoxHeader isInCurtain={isInCurtain} />}>
      <ErrorBoundary id="PoolsDetails-GmSwapBox" variant="block">
        <GmSwapBox />
      </ErrorBoundary>
    </Curtain>
  );
};
