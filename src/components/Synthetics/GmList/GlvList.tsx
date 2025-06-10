import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import {
  selectChainId,
  selectGlvInfo,
  selectGlvInfoLoading,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getTotalGmInfo, useMarketTokensData } from "domain/synthetics/markets";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import useWallet from "lib/wallets/useWallet";
import PoolsCard from "pages/Pools/PoolsCard";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";

import Loader from "components/Common/Loader";
import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { FeeApyLabel } from "./FeeApyLabel";
import type { Props } from "./GmList";
import { GmListItem } from "./GmListItem";
import { GmTokensTotalBalanceInfo } from "./GmTokensTotalBalanceInfo";
import { PerformanceLabel } from "./PerformanceLabel";
import { sortGmTokensDefault } from "./sortGmTokensDefault";

export function GlvList({
  marketsTokensApyData,
  glvTokensApyData,
  marketsTokensIncentiveAprData,
  glvTokensIncentiveAprData,
  marketsTokensLidoAprData,
  isDeposit,
  glvPerformance,
  gmPerformance,
  glvPerformanceSnapshots,
  gmPerformanceSnapshots,
}: Props) {
  const chainId = useSelector(selectChainId);
  const marketsInfo = useSelector(selectGlvInfo);
  const glvsLoading = useSelector(selectGlvInfoLoading);

  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit, withGlv: true });
  const { active: isConnected } = useWallet();

  const userEarnings = useUserEarnings(chainId);

  const isLoading = !marketsInfo || !marketTokensData || glvsLoading;

  const sortedGlvTokens = useMemo(() => {
    if (!marketsInfo || !marketTokensData) {
      return [];
    }

    return sortGmTokensDefault(marketsInfo, marketTokensData);
  }, [marketsInfo, marketTokensData]);

  const userTotalGmInfo = useMemo(() => {
    if (!isConnected) return;
    return getTotalGmInfo(marketTokensData);
  }, [marketTokensData, isConnected]);

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
        glvPerformance={glvPerformance}
        gmPerformance={gmPerformance}
        glvPerformanceSnapshots={glvPerformanceSnapshots}
        gmPerformanceSnapshots={gmPerformanceSnapshots}
      />
    ));

  const isMobile = usePoolsIsMobilePage();

  return (
    <PoolsCard
      title={t`GLV Vaults`}
      description={t`Yield-optimized vaults supplying liquidity across multiple GMX markets.`}
    >
      {isMobile ? (
        <div className="flex flex-col gap-4">
          {rows}

          {isLoading && <Loader />}
        </div>
      ) : (
        <div className="overflow-hidden rounded-4">
          <TableScrollFadeContainer>
            <table className="w-[max(100%,1100px)]">
              <thead>
                <TableTheadTr bordered>
                  <TableTh className="!pl-0">
                    <Trans>VAULT</Trans>
                  </TableTh>
                  <TableTh>
                    <Trans>TVL (SUPPLY)</Trans>
                  </TableTh>
                  <TableTh>
                    <GmTokensTotalBalanceInfo
                      balance={userTotalGmInfo?.balance}
                      balanceUsd={userTotalGmInfo?.balanceUsd}
                      userEarnings={userEarnings}
                      label={t`WALLET`}
                    />
                  </TableTh>
                  <TableTh>
                    <FeeApyLabel upperCase />
                  </TableTh>

                  <TableTh>
                    <PerformanceLabel upperCase />
                  </TableTh>

                  <TableTh>
                    <TooltipWithPortal
                      handle={t`SNAPSHOT`}
                      className="normal-case"
                      position="bottom-end"
                      content={<Trans>Graph showing performance vs benchmark over the selected period.</Trans>}
                    />
                  </TableTh>

                  <TableTh className="!pr-0" />
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
