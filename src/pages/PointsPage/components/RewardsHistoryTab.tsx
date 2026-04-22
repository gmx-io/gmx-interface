import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";

import { ARBITRUM } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { useGmxPrice } from "domain/legacy";
import { getEpochDuration } from "domain/synthetics/incentives/constants";
import { RewardsHistoryEntry } from "domain/synthetics/incentives/types";
import { useAccountRewardsHistory } from "domain/synthetics/incentives/useAccountRewardsHistory";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { formatAmount, formatAmountHuman, formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";
import useWallet from "lib/wallets/useWallet";

import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { TableTd, TableTdActionable, TableTh, TableTheadTr, TableTr, TableTrActionable } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { formatTimeLeft, useCurrentUnixTimestamp } from "./epochTiming";
import { formatEpochLabel } from "./RewardsHistoryTab.utils";

const PER_PAGE = 10;
const GMX_DECIMALS = 18;
const GMX_DECIMALS_FACTOR = 10n ** 18n;

type Props = {
  chainId: number;
  account?: string;
};

export function RewardsHistoryTab({ chainId, account }: Props) {
  const { i18n } = useLingui();
  const { active, signer } = useWallet();
  const { data: config } = useIncentivesConfig(chainId);
  const { data: history } = useAccountRewardsHistory(chainId, { account });
  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);
  const [page, setPage] = useState(1);
  const { isMobile } = useBreakpoints();
  const epochDuration = getEpochDuration(config);

  const formatRewards = useCallback(
    (rewardsEarned: bigint) => {
      const gmxLabel = `${formatAmount(rewardsEarned, GMX_DECIMALS, 2, true)} GMX`;
      const usdValue =
        gmxPrice !== undefined && gmxPrice > 0n ? (rewardsEarned * gmxPrice) / GMX_DECIMALS_FACTOR : undefined;
      const usdLabel = formatUsd(usdValue, { fallbackToZero: true, displayDecimals: 2 });
      return `${gmxLabel} (${usdLabel})`;
    },
    [gmxPrice]
  );

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
                    formatRewards={formatRewards}
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
            <table className="w-full min-w-[960px]">
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
                      <TableTd>{formatEpochLabel(entry.epoch, epochDuration, i18n.locale)}</TableTd>
                      <TableTd className="numbers">{formatAmountHuman(entry.volume, USD_DECIMALS, true, 0)}</TableTd>
                      <TableTd className="numbers">{formatAmount(entry.pointsEarned, GMX_DECIMALS, 2, true)}</TableTd>
                      <TableTd className="numbers">{formatAmount(entry.pointsSpent, GMX_DECIMALS, 2, true)}</TableTd>
                      <TableTd className="numbers">{formatAmount(entry.pointsExpired, GMX_DECIMALS, 2, true)}</TableTd>
                      <TableTd className="numbers">{formatAmount(entry.pointsBalance, GMX_DECIMALS, 2, true)}</TableTd>
                      <TableTd className="numbers">{formatRewards(entry.rewardsEarned)}</TableTd>
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
                    <TableTd colSpan={8} className="py-16 text-center text-typography-secondary">
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
  formatRewards,
}: {
  entry: RewardsHistoryEntry;
  epochDuration: number;
  now: number;
  locale: string;
  formatRewards: (rewardsEarned: bigint) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const onClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const epochEnd = entry.epoch + epochDuration;
  const isCurrentEpoch = now < epochEnd;
  const timeLeft = epochEnd - now;

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
                  {formatAmount(entry.pointsBalance, 18, 2, true)}
                </span>
              </div>
              <div className="flex justify-between text-13 font-medium text-typography-secondary">
                <Trans>Earned rewards</Trans>
                <span className="text-14 text-typography-primary numbers">{formatRewards(entry.rewardsEarned)}</span>
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
