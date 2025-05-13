import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";
import { useAccount } from "wagmi";

import {
  selectChainId,
  selectGlvInfo,
  selectGlvInfoLoading,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getTotalGmInfo, useMarketTokensData } from "domain/synthetics/markets";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";

import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { ApyTooltipContent } from "./ApyTooltipContent";
import type { Props } from "./GmList";
import { GmListItem } from "./GmListItem";
import { GmTokensTotalBalanceInfo } from "./GmTokensTotalBalanceInfo";
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
  gmPerformanceSnapshots
}: Props) {
  const chainId = useSelector(selectChainId);
  const marketsInfo = useSelector(selectGlvInfo);
  const glvsLoading = useSelector(selectGlvInfoLoading);

  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit, withGlv: true });
  const { isConnected } = useAccount();

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

  return (
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
                <TooltipWithPortal
                  handle={t`FEE APY`}
                  className="normal-case"
                  position="bottom-end"
                  content={<ApyTooltipContent />}
                />
              </TableTh>

              <TableTh>
                <TooltipWithPortal
                  handle={t`PERFORMANCE`}
                  className="normal-case"
                  position="bottom-end"
                  renderContent={() => (
                    <Trans>
                      Pools returns in comparison to the benchmark, which is based on UNI V2-style rebalancing of the
                      long-short token in the corresponding GM or GLV."
                    </Trans>
                  )}
                />
              </TableTh>

              <TableTh>
                <TooltipWithPortal
                  handle={t`SNAPSHOT`}
                  className="normal-case"
                  position="bottom-end"
                  renderContent={() => <Trans>Graph showing performance vs benchmark for the selected period.</Trans>}
                />
              </TableTh>

              <TableTh className="!pr-0" />
            </TableTheadTr>
          </thead>
          <tbody>
            {sortedGlvTokens.length > 0 &&
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
              ))}

            {isLoading && <GMListSkeleton count={2} withFavorite={false} />}
          </tbody>
        </table>
      </TableScrollFadeContainer>
    </div>
  );
}
