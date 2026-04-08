import { Trans, t } from "@lingui/macro";
import { useMemo, useState } from "react";

import { getEpochDuration } from "domain/synthetics/incentives/constants";
import { useAccountRewardsHistory } from "domain/synthetics/incentives/useAccountRewardsHistory";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { formatAmount, formatUsd } from "lib/numbers";

import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

const PER_PAGE = 10;

type Props = {
  chainId: number;
  account?: string;
};

export function RewardsHistoryTab({ chainId, account }: Props) {
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
  const now = Math.floor(Date.now() / 1000);

  if (!account) {
    return (
      <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950 p-24 text-center text-typography-secondary">
        <Trans>Connect your wallet to view rewards history</Trans>
      </div>
    );
  }

  if (history && history.length === 0) {
    return (
      <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950 p-24 text-center text-typography-secondary">
        <Trans>No rewards history yet. Start trading to earn points.</Trans>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-body-large mb-12 font-semibold text-typography-primary">
        <Trans>Rewards History</Trans>
      </h3>

      <div className="mb-12 flex gap-24">
        <div>
          <div className="text-body-small flex items-center gap-4 text-typography-secondary">
            <Trans>All time earned points</Trans>
            <TooltipWithPortal handle={undefined} content={t`Total points earned across all epochs.`} />
          </div>
          <span className="text-h2 font-bold text-typography-primary">{formatAmount(totalEarned, 18, 4, true)}</span>
        </div>
        <div>
          <div className="text-body-small flex items-center gap-4 text-typography-secondary">
            <Trans>Used Points</Trans>
            <TooltipWithPortal handle={undefined} content={t`Total points spent on fee discounts.`} />
          </div>
          <span className="text-h2 font-bold text-typography-primary">{formatAmount(totalUsed, 18, 4, true)}</span>
        </div>
      </div>

      <div className="rounded-8 bg-slate-900">
        <TableScrollFadeContainer>
          <table className="w-full min-w-[900px]">
            <thead>
              <TableTheadTr>
                <TableTh>{t`Epoch`}</TableTh>
                <TableTh>{t`Volume`}</TableTh>
                <TableTh>{t`Earned Points`}</TableTh>
                <TableTh>{t`Spent Points`}</TableTh>
                <TableTh>{t`Expired Points`}</TableTh>
                <TableTh>{t`Points Balance`}</TableTh>
                <TableTh>{t`Earned Rewards`}</TableTh>
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
                    <TableTd>{formatEpochRange(entry.epoch, epochDuration)}</TableTd>
                    <TableTd className="numbers">{formatUsd(entry.volume, { displayDecimals: 0 })}</TableTd>
                    <TableTd className="numbers">{formatAmount(entry.pointsEarned, 18, 4, true)}</TableTd>
                    <TableTd className="numbers">{formatAmount(entry.pointsSpent, 18, 4, true)}</TableTd>
                    <TableTd className="numbers">{formatAmount(entry.pointsExpired, 18, 4, true)}</TableTd>
                    <TableTd className="numbers">
                      {formatAmount(entry.pointsEarned - entry.pointsSpent - entry.pointsExpired, 18, 4, true)}
                    </TableTd>
                    <TableTd className="numbers">{formatAmount(entry.rewardsEarned, 18, 4, true)} GMX ($0.00)</TableTd>
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
                  <TableTd colSpan={8} className="py-16 text-center text-typography-secondary">
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

function formatEpochRange(epochTimestamp: number, epochDuration: number): string {
  const start = new Date(epochTimestamp * 1000);
  const end = new Date((epochTimestamp + epochDuration) * 1000);
  const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${startStr} – ${endStr}`;
}

function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return "";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}
