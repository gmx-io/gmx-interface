import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import {
  selectGlvInfo,
  selectGlvInfoLoading,
  selectProgressiveDepositMarketTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMegaethPointsActive } from "domain/synthetics/common/useMegaethPointsActive";
import PoolsCard from "pages/Pools/PoolsCard";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import Loader from "components/Loader/Loader";
import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import sparkleIcon from "img/sparkle.svg";

import { FeeApyLabel } from "./FeeApyLabel";
import type { Props } from "./GmList";
import { GmListItem } from "./GmListItem";
import { PerformanceLabel } from "./PerformanceLabel";
import { sortGmTokensDefault } from "./sortGmTokensDefault";

export function GlvList({
  marketsTokensApyData,
  glvTokensApyData,
  marketsTokensIncentiveAprData,
  glvTokensIncentiveAprData,
  marketsTokensLidoAprData,
  apyLoading,
  performance,
  performanceLoading,
  performanceSnapshots,
}: Props) {
  const glvsInfo = useSelector(selectGlvInfo);
  const glvsLoading = useSelector(selectGlvInfoLoading);
  const progressiveMarketTokensData = useSelector(selectProgressiveDepositMarketTokensData);
  const multichainMarketTokensBalances = useSelector(selectMultichainMarketTokenBalances);

  const isLoading = !glvsInfo || !progressiveMarketTokensData || glvsLoading;

  const sortedGlvTokens = useMemo(() => {
    if (!glvsInfo || !progressiveMarketTokensData) {
      return [];
    }

    return sortGmTokensDefault({
      marketsInfoData: glvsInfo,
      marketTokensData: progressiveMarketTokensData,
      multichainMarketTokensBalances,
    });
  }, [glvsInfo, progressiveMarketTokensData, multichainMarketTokensBalances]);

  const rows =
    sortedGlvTokens.length > 0 &&
    sortedGlvTokens.map((token) => (
      <GmListItem
        key={token.address}
        token={token}
        marketsTokensApyData={marketsTokensApyData}
        glvTokensIncentiveAprData={glvTokensIncentiveAprData}
        marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
        marketsTokensLidoAprData={marketsTokensLidoAprData}
        glvTokensApyData={glvTokensApyData}
        apyLoading={apyLoading}
        isFavorite={undefined}
        onFavoriteClick={undefined}
        performance={performance}
        performanceLoading={performanceLoading}
        performanceSnapshots={performanceSnapshots}
      />
    ));

  const isMobile = usePoolsIsMobilePage();
  const isMegaethPointsActive = useMegaethPointsActive();

  const titleNode = isMegaethPointsActive ? (
    <span className="flex flex-wrap items-center gap-8">
      <span>{t`GLV vaults`}</span>
      <TooltipWithPortal
        variant="none"
        maxAllowedWidth={350}
        handle={
          <span className="inline-flex items-center gap-3 rounded-4 bg-blue-300/20 px-6 py-2 text-12 font-medium text-blue-300">
            <img className="h-10" src={sparkleIcon} alt="" />
            <Trans>Earns MegaETH points</Trans>
          </span>
        }
        content={
          <Trans>
            Points are based on the time-weighted average value of your share of the GLV [USDM-USDM] vault over the
            epoch.
          </Trans>
        }
      />
    </span>
  ) : (
    t`GLV vaults`
  );

  return (
    <PoolsCard
      title={titleNode}
      className="shrink-0"
      description={<Trans>Yield-optimized vaults supplying liquidity across multiple GMX markets</Trans>}
    >
      {isMobile ? (
        <div className="flex flex-col gap-4">
          {rows}

          {isLoading && <Loader />}
        </div>
      ) : (
        <div className="overflow-hidden rounded-4 p-8 pt-0">
          <TableScrollFadeContainer>
            <table className="w-[max(100%,1000px)]">
              <thead>
                <TableTheadTr>
                  <TableTh className="pl-16">
                    <Trans>VAULT</Trans>
                  </TableTh>
                  <TableTh>
                    <Trans>TVL (SUPPLY)</Trans>
                  </TableTh>
                  <TableTh>
                    <Trans>BALANCE</Trans>
                  </TableTh>
                  <TableTh>
                    <FeeApyLabel upperCase variant="iconStroke" />
                  </TableTh>
                  <TableTh>
                    <PerformanceLabel upperCase variant="iconStroke" />
                  </TableTh>
                  <TableTh>
                    <TooltipWithPortal
                      handle={t`SNAPSHOT`}
                      className="normal-case"
                      position="bottom-end"
                      content={<Trans>Performance vs benchmark over selected period</Trans>}
                      variant="iconStroke"
                    />
                  </TableTh>
                  <TableTh className="pr-16" />
                </TableTheadTr>
              </thead>
              <tbody>
                {rows}

                {isLoading && <GMListSkeleton count={2} withFavorite={false} />}
              </tbody>
            </table>
          </TableScrollFadeContainer>
        </div>
      )}
    </PoolsCard>
  );
}
