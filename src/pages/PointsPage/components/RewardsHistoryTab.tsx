import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useCallback, useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";

import { ARBITRUM } from "config/chains";
import type { ContractsChainId } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { useGmxPrice } from "domain/legacy";
import { getEpochDuration } from "domain/synthetics/incentives/constants";
import { RewardsHistoryEntry } from "domain/synthetics/incentives/types";
import { useAccountRewardsHistory } from "domain/synthetics/incentives/useAccountRewardsHistory";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { formatAmount, formatAmountHuman, formatPointsAmount, formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";
import useWallet from "lib/wallets/useWallet";

import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { TableListSkeleton } from "components/Skeleton/Skeleton";
import { TableTd, TableTdActionable, TableTh, TableTheadTr, TableTr, TableTrActionable } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { formatTimeLeft, useCurrentUnixTimestamp } from "./epochTiming";
import { formatEpochLabel } from "./RewardsHistoryTab.utils";

const PER_PAGE = 16;
const GMX_DECIMALS = 18;
const GMX_DECIMALS_FACTOR = 10n ** 18n;

function RewardsHistoryMobileSkeletonRow({ invisible }: { invisible?: boolean }) {
  return (
    <tr className={invisible ? undefined : "odd:bg-fill-surfaceElevated50"}>
      <TableTd className="!py-12">
        <Skeleton width={120} inline />
      </TableTd>
      <TableTd className="!py-12 text-right">
        <Skeleton width={80} inline />
      </TableTd>
      <TableTd className="!py-12">
        <Skeleton width={16} inline />
      </TableTd>
    </tr>
  );
}

function RewardsHistoryDesktopSkeletonRow({ invisible }: { invisible?: boolean }) {
  return (
    <tr className={invisible ? undefined : "odd:bg-fill-surfaceElevated50"}>
      <TableTd className="!py-12">
        <Skeleton width={120} inline />
      </TableTd>
      <TableTd className="!py-12">
        <Skeleton width={80} inline />
      </TableTd>
      <TableTd className="!py-12">
        <Skeleton width={80} inline />
      </TableTd>
      <TableTd className="!py-12">
        <Skeleton width={80} inline />
      </TableTd>
      <TableTd className="!py-12">
        <Skeleton width={80} inline />
      </TableTd>
      <TableTd className="!py-12">
        <Skeleton width={80} inline />
      </TableTd>
      <TableTd className="!py-12">
        <Skeleton width={140} inline />
      </TableTd>
      <TableTd className="!py-12">
        <Skeleton width={120} inline />
      </TableTd>
    </tr>
  );
}

type Props = {
  chainId: ContractsChainId;
  account?: string;
};

export function RewardsHistoryTab({ chainId, account }: Props) {
  const { i18n } = useLingui();
  const { active, signer } = useWallet();
  const { data: config } = useIncentivesConfig(chainId);
  const [page, setPage] = useState(1);
  const {
    data: history,
    totalCount,
    error,
    loading,
  } = useAccountRewardsHistory(chainId, {
    account,
    currentEpoch: config?.epochTimestamp,
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });
  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);
  const { isMobile } = useBreakpoints();
  const epochDuration = getEpochDuration(config);

  useEffect(() => {
    setPage(1);
  }, [account]);

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

  const pageCount = totalCount === undefined ? page : Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const pageData = history ?? [];
  const isInitialLoading = loading && !history;
  const hasHistoryFailure = Boolean(error) && (!history || history.length === 0);
  const showHistoryDegradedNotice = Boolean(error) && Boolean(history?.length);
  const now = useCurrentUnixTimestamp();

  if (!account) {
    return (
      <div className="flex grow items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
        <Trans>Connect your wallet to view rewards history</Trans>
      </div>
    );
  }

  if (!error && page === 1 && history && history.length === 0) {
    return (
      <div className="flex grow items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
        <Trans>No rewards history yet. Start trading to earn points.</Trans>
      </div>
    );
  }

  if (hasHistoryFailure) {
    return (
      <div className="flex grow items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
        <Trans>Rewards history is temporarily unavailable. Please try again later.</Trans>
      </div>
    );
  }

  const tdClassName = "!py-12";

  return (
    <div className="flex h-full flex-col rounded-8 bg-slate-900">
      <div className="p-20">
        <h3 className="mb-12 text-16 font-medium text-typography-primary">
          <Trans>Rewards History</Trans>
        </h3>
        {showHistoryDegradedNotice && (
          <div className="rounded-8 border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-20 p-12 text-13 leading-[1.3] text-typography-primary">
            <Trans>Rewards history could not be refreshed. Showing the latest loaded data.</Trans>
          </div>
        )}
      </div>

      <div className="flex grow flex-col rounded-8 bg-slate-900">
        <TableScrollFadeContainer className="grow">
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
                {isInitialLoading ? (
                  <TableListSkeleton count={PER_PAGE} Structure={RewardsHistoryMobileSkeletonRow} />
                ) : (
                  pageData.map((entry) => (
                    <MobileRewardsHistoryRow
                      key={entry.epoch}
                      entry={entry}
                      epochDuration={epochDuration}
                      now={now}
                      locale={i18n.locale}
                      formatRewards={formatRewards}
                    />
                  ))
                )}
                {history && pageData.length < PER_PAGE && (
                  <TableListSkeleton
                    invisible
                    count={PER_PAGE - pageData.length}
                    Structure={RewardsHistoryMobileSkeletonRow}
                  />
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
                {isInitialLoading ? (
                  <TableListSkeleton count={PER_PAGE} Structure={RewardsHistoryDesktopSkeletonRow} />
                ) : (
                  pageData.map((entry) => {
                    const epochEnd = entry.epoch + epochDuration;
                    const isCurrentEpoch = now < epochEnd;
                    const timeLeft = epochEnd - now;

                    return (
                      <TableTr key={entry.epoch}>
                        <TableTd className={cx(tdClassName, "text-typography-secondary")}>
                          {formatEpochLabel(entry.epoch, epochDuration, i18n.locale)}
                        </TableTd>
                        <TableTd className={cx(tdClassName, "numbers")}>
                          {formatAmountHuman(entry.volume, USD_DECIMALS, true, 0)}
                        </TableTd>
                        <TableTd className={cx(tdClassName, "numbers")}>
                          {formatPointsAmount(entry.pointsEarned, GMX_DECIMALS)}
                        </TableTd>
                        <TableTd className={cx(tdClassName, "numbers")}>
                          {formatPointsAmount(entry.pointsSpent, GMX_DECIMALS)}
                        </TableTd>
                        <TableTd className={cx(tdClassName, "numbers")}>
                          {formatPointsAmount(entry.pointsExpired, GMX_DECIMALS)}
                        </TableTd>
                        <TableTd className={cx(tdClassName, "numbers")}>
                          {formatPointsAmount(entry.pointsBalance, GMX_DECIMALS)}
                        </TableTd>
                        <TableTd className={cx(tdClassName, "numbers")}>{formatRewards(entry.rewardsEarned)}</TableTd>
                        <TableTd className={tdClassName}>
                          {isCurrentEpoch ? (
                            <span className="text-13 text-typography-secondary">
                              <Trans>Epoch ends in</Trans>{" "}
                              <span className="text-typography-primary">
                                {formatTimeLeft(timeLeft, { alwaysShowDays: true })}
                              </span>
                            </span>
                          ) : (
                            <span className="text-13 text-typography-secondary">
                              <Trans>Finished</Trans>
                            </span>
                          )}
                        </TableTd>
                      </TableTr>
                    );
                  })
                )}
                {history && pageData.length < PER_PAGE && (
                  <TableListSkeleton
                    invisible
                    count={PER_PAGE - pageData.length}
                    Structure={RewardsHistoryDesktopSkeletonRow}
                  />
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
    <span className="text-13 text-typography-secondary">
      <Trans>Epoch ends in</Trans>{" "}
      <span className="text-typography-primary">{formatTimeLeft(timeLeft, { alwaysShowDays: true })}</span>
    </span>
  ) : (
    <span className="text-13 text-typography-secondary">
      <Trans>Finished</Trans>
    </span>
  );

  return (
    <>
      <TableTrActionable onClick={onClick}>
        <TableTdActionable>{formatEpochLabel(entry.epoch, epochDuration, locale)}</TableTdActionable>
        <TableTdActionable className="text-right numbers">
          {formatPointsAmount(entry.pointsEarned, GMX_DECIMALS)}
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
                  {formatPointsAmount(entry.pointsSpent, GMX_DECIMALS)}
                </span>
              </div>
              <div className="flex justify-between text-13 font-medium text-typography-secondary">
                <Trans>Expired points</Trans>
                <span className="text-14 text-typography-primary numbers">
                  {formatPointsAmount(entry.pointsExpired, GMX_DECIMALS)}
                </span>
              </div>
              <div className="flex justify-between text-13 font-medium text-typography-secondary">
                <Trans>Points balance</Trans>
                <span className="text-14 text-typography-primary numbers">
                  {formatPointsAmount(entry.pointsBalance, GMX_DECIMALS)}
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
