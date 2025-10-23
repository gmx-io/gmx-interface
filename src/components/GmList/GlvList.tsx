import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import {
  selectGlvInfo,
  selectGlvInfoLoading,
  selectProgressiveDepositMarketTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import PoolsCard from "pages/Pools/PoolsCard";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import Loader from "components/Loader/Loader";
import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

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
  performance,
  performanceSnapshots,
}: Props) {
  const glvsInfo = useSelector(selectGlvInfo);
  const glvsLoading = useSelector(selectGlvInfoLoading);
  const progressiveMarketTokensData = useSelector(selectProgressiveDepositMarketTokensData);

  const isLoading = !glvsInfo || !progressiveMarketTokensData || glvsLoading;

  const sortedGlvTokens = useMemo(() => {
    if (!glvsInfo || !progressiveMarketTokensData) {
      return [];
    }

    return sortGmTokensDefault(glvsInfo, progressiveMarketTokensData);
  }, [glvsInfo, progressiveMarketTokensData]);

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
        isFavorite={undefined}
        onFavoriteClick={undefined}
        performance={performance}
        performanceSnapshots={performanceSnapshots}
      />
    ));

  const isMobile = usePoolsIsMobilePage();

  return (
    <PoolsCard
      title={t`GLV Vaults`}
      className="shrink-0"
      description={
        <Trans>
          Yield-optimized vaults supplying liquidity across multiple GMX
          <br /> markets.
        </Trans>
      }
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
                    <Trans>WALLET</Trans>
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
                      content={<Trans>Graph showing performance vs benchmark over the selected period.</Trans>}
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
