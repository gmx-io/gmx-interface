import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { type ReactNode, useMemo, useState } from "react";

import { getEpochDuration } from "domain/synthetics/incentives/constants";
import { useAccountRewardsHistory } from "domain/synthetics/incentives/useAccountRewardsHistory";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { formatAmount, formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";

import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import ChevronUpIcon from "img/ic_chevron_up.svg?react";

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
  const [expandedEpoch, setExpandedEpoch] = useState<number | null>(null);
  const { isMobile } = useBreakpoints();
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

        <div className="flex gap-24">
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

      {isMobile ? (
        <div>
          <div className="flex items-center px-20 py-8">
            <span className="flex-1 text-12 uppercase text-typography-secondary">{t`Epoch`}</span>
            <span className="pr-32 text-12 uppercase text-typography-secondary">{t`Earned Points`}</span>
          </div>

          <div className="flex flex-col gap-4 px-8 pb-8">
            {pageData.map((entry) => {
              const isExpanded = expandedEpoch === entry.epoch;
              const epochEnd = entry.epoch + epochDuration;
              const isCurrentEpoch = now < epochEnd;
              const timeLeft = epochEnd - now;
              const pointsBalance = entry.pointsEarned - entry.pointsSpent - entry.pointsExpired;

              return (
                <div key={entry.epoch} className={cx("rounded-4", isExpanded ? "bg-slate-800" : "bg-cold-blue-900")}>
                  <button
                    className="flex w-full items-center justify-between px-12 py-10"
                    onClick={() => setExpandedEpoch(isExpanded ? null : entry.epoch)}
                  >
                    <span className="text-14 text-typography-primary">
                      {formatEpochLabel(entry.epoch, epochDuration, i18n.locale)}
                    </span>
                    <div className="flex items-center gap-8">
                      <span className="text-14 text-typography-primary numbers">
                        {formatAmount(entry.pointsEarned, 18, 2, true)}
                      </span>
                      {isExpanded ? (
                        <ChevronUpIcon className="w-16 text-typography-secondary" />
                      ) : (
                        <ChevronDownIcon className="w-16 text-typography-secondary" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="flex flex-col gap-4 px-12 pb-12">
                      <MobileDetailRow label={t`Volume`} value={formatUsd(entry.volume, { displayDecimals: 0 })} />
                      <MobileDetailRow label={t`Spent points`} value={formatAmount(entry.pointsSpent, 18, 2, true)} />
                      <MobileDetailRow
                        label={t`Expired points`}
                        value={formatAmount(entry.pointsExpired, 18, 2, true)}
                      />
                      <MobileDetailRow label={t`Points balance`} value={formatAmount(pointsBalance, 18, 2, true)} />
                      <MobileDetailRow
                        label={t`Earned rewards`}
                        value={`${formatAmount(entry.rewardsEarned, 18, 2, true)} GMX`}
                      />
                      <MobileDetailRow
                        label={t`Status`}
                        value={
                          isCurrentEpoch ? (
                            <span className="text-typography-secondary">
                              <Trans>Epoch ends in:</Trans>{" "}
                              <span className="text-typography-primary">{formatTimeLeft(timeLeft)}</span>
                            </span>
                          ) : (
                            <span className="text-typography-secondary">
                              <Trans>Finished</Trans>
                            </span>
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {!history && (
              <div className="py-16 text-center text-typography-secondary">
                <Trans>Loading...</Trans>
              </div>
            )}
          </div>

          <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      ) : (
        <div className="rounded-8 bg-slate-900">
          <TableScrollFadeContainer>
            <table className="w-full min-w-[720px]">
              <thead>
                <TableTheadTr>
                  <TableTh>{t`Epoch`}</TableTh>
                  <TableTh>{t`Earned Points`}</TableTh>
                  <TableTh>{t`Spent Points`}</TableTh>
                  <TableTh>{t`Rewards Earned`}</TableTh>
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
                      <TableTd className="numbers">{formatAmount(entry.rewardsClaimed, 18, 4, true)} GMX</TableTd>
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
                    <TableTd colSpan={6} className="py-16 text-center text-typography-secondary">
                      <Trans>Loading...</Trans>
                    </TableTd>
                  </TableTr>
                )}
              </tbody>
            </table>
          </TableScrollFadeContainer>
          <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

function MobileDetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-14 font-medium text-typography-primary">{label}</span>
      <span className="text-14 text-typography-primary numbers">{value}</span>
    </div>
  );
}

function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return "";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}
