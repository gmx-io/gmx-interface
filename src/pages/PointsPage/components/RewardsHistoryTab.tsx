import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useMemo, useState } from "react";

import { getEpochDuration } from "domain/synthetics/incentives/constants";
import { useAccountRewardsHistory } from "domain/synthetics/incentives/useAccountRewardsHistory";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { formatAmount } from "lib/numbers";

import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { useCurrentUnixTimestamp } from "./epochTiming";
import { formatEpochLabel } from "./RewardsHistoryTab.utils";

const PER_PAGE = 10;

type Props = {
  chainId: number;
  account?: string;
};

export function RewardsHistoryTab({ chainId, account }: Props) {
  const { i18n } = useLingui();
  const { data: config } = useIncentivesConfig(chainId);
  const { data: history } = useAccountRewardsHistory(chainId, { account });
  const [page, setPage] = useState(1);
  const epochDuration = getEpochDuration(config);

  const sortedHistory = useMemo(() => {
    if (!history) return [];
    return [...history].sort((a, b) => b.epoch - a.epoch);
  }, [history]);

  const { totalEarned, totalUsed } = useMemo(() => {
    if (!history) return { totalEarned: 0n, totalUsed: 0n };
    return history.reduce(
      (acc, e) => ({
        totalEarned: acc.totalEarned + e.pointsEarned,
        totalUsed: acc.totalUsed + e.pointsSpent,
      }),
      { totalEarned: 0n, totalUsed: 0n }
    );
  }, [history]);

  const pageCount = Math.ceil(sortedHistory.length / PER_PAGE);
  const indexFrom = (page - 1) * PER_PAGE;
  const pageData = sortedHistory.slice(indexFrom, indexFrom + PER_PAGE);
  const now = useCurrentUnixTimestamp();

  if (!account) {
    return (
      <div className="flex grow items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
        <Trans>Connect your wallet to view rewards history</Trans>
      </div>
    );
  }

  if (history && history.length === 0) {
    return (
      <div className="flex grow items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
        <Trans>No rewards history yet. Start trading to earn points.</Trans>
      </div>
    );
  }

  return (
    <div className="rounded-8 bg-slate-900">
      <div className="p-20">
        <h3 className="mb-12 text-16 font-medium text-typography-primary">
          <Trans>Rewards History</Trans>
        </h3>

        <div className="mb-12 flex gap-24">
          <div>
            <div className="flex items-center gap-2 text-12 font-medium text-typography-secondary">
              <TooltipWithPortal
                handle={<Trans>All time earned points</Trans>}
                variant="iconStroke"
                content={t`Total points earned across all epochs.`}
              />
            </div>
            <span className="text-16 font-medium text-typography-primary numbers">
              {formatAmount(totalEarned, 18, 4, true)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 text-12 font-medium text-typography-secondary">
              <TooltipWithPortal
                handle={<Trans>Used Points</Trans>}
                variant="iconStroke"
                content={t`Total points spent on fee discounts.`}
              />
            </div>
            <span className="text-16 font-medium text-typography-primary numbers">
              {formatAmount(totalUsed, 18, 4, true)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-8 bg-slate-900">
        <TableScrollFadeContainer>
          <table className="w-full min-w-[720px]">
            <thead>
              <TableTheadTr>
                <TableTh>{t`Epoch`}</TableTh>
                <TableTh>{t`Earned Points`}</TableTh>
                <TableTh>{t`Spent Points`}</TableTh>
                <TableTh>{t`Rewards Claimed`}</TableTh>
                <TableTh>{t`Status`}</TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {pageData.map((entry) => {
                const epochEnd = entry.epoch + epochDuration;
                const isCurrentEpoch = now < epochEnd;
                const timeLeft = epochEnd - now;

                return (
                  <TableTr key={entry.epoch}>
                    <TableTd>{formatEpochLabel(entry.epoch, epochDuration, i18n.locale)}</TableTd>
                    <TableTd className="numbers">{formatAmount(entry.pointsEarned, 18, 4, true)}</TableTd>
                    <TableTd className="numbers">{formatAmount(entry.pointsSpent, 18, 4, true)}</TableTd>
                    <TableTd className="numbers">{formatAmount(entry.rewardsEarned, 18, 4, true)} GMX</TableTd>
                    <TableTd>
                      {isCurrentEpoch ? (
                        <span className="text-body-small text-typography-secondary">
                          <Trans>Epoch ends in</Trans>{" "}
                          <span className="text-typography-primary">{formatTimeLeft(timeLeft)}</span>
                        </span>
                      ) : (
                        <span className="text-body-small text-typography-secondary">
                          <Trans>Finished</Trans>
                        </span>
                      )}
                    </TableTd>
                  </TableTr>
                );
              })}
              {!history && (
                <TableTr>
                  <TableTd colSpan={5} className="py-16 text-center text-typography-secondary">
                    <Trans>Loading...</Trans>
                  </TableTd>
                </TableTr>
              )}
            </tbody>
          </table>
        </TableScrollFadeContainer>
        <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}

function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return "";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}
