import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";

import { getEpochDuration } from "domain/synthetics/incentives/constants";
import { RewardsHistoryEntry } from "domain/synthetics/incentives/types";
import { useAccountRewardsHistory } from "domain/synthetics/incentives/useAccountRewardsHistory";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { formatAmount, formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";

import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { TableTd, TableTdActionable, TableTh, TableTheadTr, TableTr, TableTrActionable } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { formatTimeLeft, useCurrentUnixTimestamp } from "./epochTiming";
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

      <div className="rounded-8 bg-slate-900">
        <TableScrollFadeContainer>
          {isMobile ? (
            <table className="w-full">
              <thead>
                <TableTheadTr>
                  <TableTh>{t`Epoch`}</TableTh>
                  <TableTh className="text-right">{t`Earned Points`}</TableTh>
                  <TableTh className="w-24" />
                </TableTheadTr>
              </thead>
              <tbody>
                {pageData.map((entry) => (
                  <MobileRewardsHistoryRow
                    key={entry.epoch}
                    entry={entry}
                    epochDuration={epochDuration}
                    now={now}
                    locale={i18n.locale}
                  />
                ))}
                {!history && (
                  <tr>
                    <td colSpan={3} className="py-16 text-center text-typography-secondary">
                      <Trans>Loading...</Trans>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
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
                          <span className="text-12 text-typography-secondary">
                            <Trans>Epoch ends in</Trans>{" "}
                            <span className="text-typography-primary">
                              {formatTimeLeft(timeLeft, { alwaysShowDays: true })}
                            </span>
                          </span>
                        ) : (
                          <span className="text-12 text-typography-secondary">
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
          )}
        </TableScrollFadeContainer>
        <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}

function MobileRewardsHistoryRow({
  entry,
  epochDuration,
  now,
  locale,
}: {
  entry: RewardsHistoryEntry;
  epochDuration: number;
  now: number;
  locale: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const onClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const epochEnd = entry.epoch + epochDuration;
  const isCurrentEpoch = now < epochEnd;
  const timeLeft = epochEnd - now;
  const pointsBalance = entry.pointsEarned - entry.pointsSpent - entry.pointsExpired;

  const statusContent = isCurrentEpoch ? (
    <span className="text-12 text-typography-secondary">
      <Trans>Epoch ends in</Trans>{" "}
      <span className="text-typography-primary">{formatTimeLeft(timeLeft, { alwaysShowDays: true })}</span>
    </span>
  ) : (
    <span className="text-12 text-typography-secondary">
      <Trans>Finished</Trans>
    </span>
  );

  return (
    <>
      <TableTrActionable onClick={onClick}>
        <TableTdActionable>{formatEpochLabel(entry.epoch, epochDuration, locale)}</TableTdActionable>
        <TableTdActionable className="text-right numbers">
          {formatAmount(entry.pointsEarned, 18, 2, true)}
        </TableTdActionable>
        <TableTdActionable className="w-24">
          <ChevronDownIcon className={cx("size-16 text-typography-secondary", { "rotate-180": isExpanded })} />
        </TableTdActionable>
      </TableTrActionable>
      {isExpanded && (
        <tr>
          <td colSpan={3} className="px-20 py-10">
            <div className="flex flex-col gap-12">
              <div className="flex justify-between text-13 font-medium text-typography-secondary">
                <Trans>Volume</Trans>
                <span className="text-14 text-typography-primary numbers">
                  {formatUsd(entry.volume, { displayDecimals: 0 })}
                </span>
              </div>
              <div className="flex justify-between text-13 font-medium text-typography-secondary">
                <Trans>Spent points</Trans>
                <span className="text-14 text-typography-primary numbers">
                  {formatAmount(entry.pointsSpent, 18, 2, true)}
                </span>
              </div>
              <div className="flex justify-between text-13 font-medium text-typography-secondary">
                <Trans>Expired points</Trans>
                <span className="text-14 text-typography-primary numbers">
                  {formatAmount(entry.pointsExpired, 18, 2, true)}
                </span>
              </div>
              <div className="flex justify-between text-13 font-medium text-typography-secondary">
                <Trans>Points balance</Trans>
                <span className="text-14 text-typography-primary numbers">
                  {formatAmount(pointsBalance, 18, 2, true)}
                </span>
              </div>
              <div className="flex justify-between text-13 font-medium text-typography-secondary">
                <Trans>Earned rewards</Trans>
                <span className="text-14 text-typography-primary numbers">
                  {formatAmount(entry.rewardsEarned, 18, 2, true)} GMX
                </span>
              </div>
              <div className="flex justify-between text-13 font-medium text-typography-secondary">
                <Trans>Status</Trans>
                <span className="text-14 text-typography-primary">{statusContent}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
