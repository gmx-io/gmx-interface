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
import { sortGmTokensDefault } from "./sortGmTokensDefault";

import { GMListSkeleton } from "components/Skeleton/Skeleton";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { ApyTooltipContent } from "./ApyTooltipContent";
import type { Props } from "./GmList";
import { GmListItem } from "./GmListItem";
import { GmTokensTotalBalanceInfo } from "./GmTokensTotalBalanceInfo";

export function GlvList({
  marketsTokensApyData,
  glvTokensApyData,
  marketsTokensIncentiveAprData,
  glvTokensIncentiveAprData,
  marketsTokensLidoAprData,
  shouldScrollToTop,
  isDeposit,
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
    <div className="overflow-hidden rounded-4 bg-slate-800">
      <TableScrollFadeContainer>
        <table className="w-[max(100%,1100px)]">
          <thead>
            <TableTheadTr bordered>
              <TableTh>
                <Trans>POOL</Trans>
              </TableTh>
              <TableTh>
                <Trans>PRICE</Trans>
              </TableTh>
              <TableTh>
                <Trans>TOTAL SUPPLY</Trans>
              </TableTh>
              <TableTh>
                <TooltipWithPortal
                  handle={<Trans>BUYABLE</Trans>}
                  className="normal-case"
                  position="bottom-end"
                  content={
                    <p className="text-white">
                      <Trans>Available amount to deposit into the specific GM pool.</Trans>
                    </p>
                  }
                />
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
                  handle={t`APY`}
                  className="normal-case"
                  position="bottom-end"
                  content={<ApyTooltipContent />}
                />
              </TableTh>

              <TableTh />
            </TableTheadTr>
          </thead>
          <tbody>
            {sortedGlvTokens.length > 0 &&
              sortedGlvTokens.map((token) => (
                <GmListItem
                  key={token.address}
                  token={token}
                  marketTokensData={marketTokensData}
                  marketsTokensApyData={marketsTokensApyData}
                  glvTokensIncentiveAprData={glvTokensIncentiveAprData}
                  marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
                  marketsTokensLidoAprData={marketsTokensLidoAprData}
                  glvTokensApyData={glvTokensApyData}
                  shouldScrollToTop={shouldScrollToTop}
                  isShiftAvailable={false}
                  isFavorite={undefined}
                  onFavoriteClick={undefined}
                />
              ))}

            {isLoading && <GMListSkeleton count={2} withFavorite={false} />}
          </tbody>
        </table>
      </TableScrollFadeContainer>
    </div>
  );
}
