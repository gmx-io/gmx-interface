import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig, RewardsHistoryEntry } from "domain/synthetics/incentives/v2/types";
import { useAccountRewardsHistory } from "domain/synthetics/incentives/v2/useAccountRewardsHistory";
import { useEpochRolloverRevalidation } from "domain/synthetics/incentives/v2/useEpochRolloverRevalidation";
import { formatEpochLabel, getRewardsHistoryStatus } from "domain/synthetics/incentives/v2/utils";
import { formatTimeLeft } from "lib/dates";
import { formatAmount, formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";
import { useCurrentUnixTimestamp } from "lib/useCurrentUnixTimestamp";

import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { TableListSkeleton } from "components/Skeleton/Skeleton";
import { TableTd, TableTdActionable, TableTh, TableTheadTr, TableTr, TableTrActionable } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

const PAGE_SIZE = 16;

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
        <Skeleton width={120} inline />
      </TableTd>
    </tr>
  );
}

type Props = {
  chainId: number;
  account?: string;
  config: IncentivesConfig;
};

export function RewardsHistoryTab({ chainId, account, config }: Props) {
  const { i18n } = useLingui();
  const { isMobile } = useBreakpoints();
  const [page, setPage] = useState(1);
  const { data, totalCount, error, loading, isValidating, mutate, endpoint } = useAccountRewardsHistory(chainId, {
    account,
    currentEpoch: config.epochTimestamp,
    programStartTimestamp: config.programStartTimestamp,
    epochDuration: config.epochDuration,
    enabled: Boolean(account),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const epochTimestampRef = useRef(config.epochTimestamp);
  const now = useCurrentUnixTimestamp();

  useEffect(() => setPage(1), [account]);

  useEffect(() => {
    if (epochTimestampRef.current === config.epochTimestamp) return;

    epochTimestampRef.current = config.epochTimestamp;
    if (page !== 1) {
      setPage(1);
    }
  }, [config.epochTimestamp, page]);

  useEpochRolloverRevalidation({
    epochTimestamp: config.epochTimestamp,
    enabled: Boolean(account) && page === 1,
    scopeKey: `${chainId}:${account ?? ""}:${endpoint ?? ""}`,
    revalidate: mutate,
  });

  const pageCount = totalCount === undefined ? page : Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageData = data ?? [];
  const isInitialLoading = loading && data === undefined;
  const hasInitialError = Boolean(error && data === undefined);
  const hasCachedError = Boolean(error && data !== undefined);
  const showEmpty = !loading && data !== undefined && pageData.length === 0;

  if (!account) {
    return (
      <div className="flex grow items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
        <Trans>Connect your wallet to view rewards history</Trans>
      </div>
    );
  }

  if (hasInitialError && page === 1) {
    return (
      <div className="flex grow items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
        <Trans>Rewards history is temporarily unavailable. Please try again later.</Trans>
      </div>
    );
  }

  if (showEmpty && !hasCachedError && page === 1) {
    return (
      <div className="flex grow items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
        <Trans>No rewards history yet. Start trading to earn rewards.</Trans>
      </div>
    );
  }

  const tdClassName = "!py-12";

  return (
    <div className="flex h-full flex-col rounded-8 bg-slate-900">
      <div className="px-20 pb-12 pt-20">
        <div className="flex items-center justify-between gap-12">
          <h3 className="text-16 font-medium text-typography-primary">
            <Trans>Rewards History</Trans>
          </h3>
          {isValidating && data ? (
            <div className="text-caption text-typography-secondary">
              <Trans>Updating...</Trans>
            </div>
          ) : null}
        </div>
        {hasCachedError ? (
          <div className="mt-12 rounded-8 border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-20 p-12 text-13 leading-[1.3] text-typography-primary">
            <Trans>Rewards history could not be refreshed. Showing the latest loaded data.</Trans>
          </div>
        ) : null}
      </div>

      <div className="flex grow flex-col rounded-8 bg-slate-900">
        {hasInitialError ? (
          <div className="flex grow items-center justify-center p-24 text-center text-typography-secondary">
            <Trans>Rewards history is temporarily unavailable. Please try again later.</Trans>
          </div>
        ) : showEmpty ? (
          <div className="flex grow items-center justify-center p-24 text-center text-typography-secondary">
            <Trans>No rewards history yet. Start trading to earn rewards.</Trans>
          </div>
        ) : (
          <TableScrollFadeContainer className="grow" ariaLabel={t`Rewards history table`}>
            {isMobile ? (
              <table className="w-full">
                <thead>
                  <TableTheadTr>
                    <TableTh>{t`Epoch`}</TableTh>
                    <TableTh className="text-right">{t`Rewards USD`}</TableTh>
                    <TableTh className="w-24" />
                  </TableTheadTr>
                </thead>
                <tbody>
                  {isInitialLoading ? (
                    <TableListSkeleton count={PAGE_SIZE} Structure={RewardsHistoryMobileSkeletonRow} />
                  ) : (
                    pageData.map((entry) => (
                      <MobileRewardsHistoryRow
                        key={entry.epoch}
                        entry={entry}
                        epochDuration={config.epochDuration}
                        now={now}
                        locale={i18n.locale}
                      />
                    ))
                  )}
                  {data && pageData.length < PAGE_SIZE ? (
                    <TableListSkeleton
                      invisible
                      count={PAGE_SIZE - pageData.length}
                      Structure={RewardsHistoryMobileSkeletonRow}
                    />
                  ) : null}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[960px] table-fixed">
                <thead>
                  <TableTheadTr>
                    <TableTh>{t`Epoch`}</TableTh>
                    <TableTh>{t`Volume`}</TableTh>
                    <TableTh>{t`Referral volume`}</TableTh>
                    <TableTh>{t`esGMX accrued`}</TableTh>
                    <TableTh>{t`GT allocated`}</TableTh>
                    <TableTh>{t`Rewards USD`}</TableTh>
                    <TableTh className="!text-left">{t`Status`}</TableTh>
                  </TableTheadTr>
                </thead>
                <tbody>
                  {isInitialLoading ? (
                    <TableListSkeleton count={PAGE_SIZE} Structure={RewardsHistoryDesktopSkeletonRow} />
                  ) : (
                    pageData.map((entry) => (
                      <DesktopRewardsHistoryRow
                        key={entry.epoch}
                        entry={entry}
                        epochDuration={config.epochDuration}
                        now={now}
                        locale={i18n.locale}
                        tdClassName={tdClassName}
                      />
                    ))
                  )}
                  {data && pageData.length < PAGE_SIZE ? (
                    <TableListSkeleton
                      invisible
                      count={PAGE_SIZE - pageData.length}
                      Structure={RewardsHistoryDesktopSkeletonRow}
                    />
                  ) : null}
                </tbody>
              </table>
            )}
          </TableScrollFadeContainer>
        )}
        <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}

function DesktopRewardsHistoryRow({
  entry,
  epochDuration,
  now,
  locale,
  tdClassName,
}: {
  entry: RewardsHistoryEntry;
  epochDuration: number;
  now: number;
  locale: string;
  tdClassName: string;
}) {
  return (
    <TableTr>
      <TableTd className={cx(tdClassName, "text-typography-secondary")}>
        {formatEpochLabel(entry.epoch, epochDuration, locale)}
      </TableTd>
      <TableTd className={cx(tdClassName, "numbers")}>
        {formatUsd(entry.tradingVolume, { fallbackToZero: true, displayDecimals: 0 })}
      </TableTd>
      <TableTd className={cx(tdClassName, "numbers")}>
        {formatUsd(entry.referralVolume, { fallbackToZero: true, displayDecimals: 0 })}
      </TableTd>
      <TableTd className={cx(tdClassName, "numbers")}>
        {formatAmount(entry.esGmxRewards, ES_GMX_DECIMALS, 4, true, { trimTrailingZeros: true })}
      </TableTd>
      <TableTd className={cx(tdClassName, "numbers")}>
        {formatAmount(entry.gtRewards, GT_DECIMALS, 4, true, { trimTrailingZeros: true })}
      </TableTd>
      <TableTd className={cx(tdClassName, "numbers")}>
        {formatUsd(entry.rewardsUsd, { fallbackToZero: true, displayDecimals: 2 })}
      </TableTd>
      <TableTd className={cx(tdClassName, "!text-left")}>{getStatusContent(entry.epoch, epochDuration, now)}</TableTd>
    </TableTr>
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
  const onClick = useCallback(() => setIsExpanded((prev) => !prev), []);
  const detailsId = `rewards-history-details-${entry.epoch}`;

  return (
    <>
      <TableTrActionable onClick={onClick}>
        <TableTdActionable>{formatEpochLabel(entry.epoch, epochDuration, locale)}</TableTdActionable>
        <TableTdActionable className="text-right numbers">
          {formatUsd(entry.rewardsUsd, { fallbackToZero: true, displayDecimals: 2 })}
        </TableTdActionable>
        <TableTdActionable className="w-24">
          <button
            type="button"
            className="flex size-24 items-center justify-center rounded-4"
            aria-label={t`Toggle reward details`}
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
          >
            <ChevronDownIcon className={cx("size-16 text-typography-secondary", { "rotate-180": isExpanded })} />
          </button>
        </TableTdActionable>
      </TableTrActionable>
      {isExpanded ? (
        <tr id={detailsId}>
          <td colSpan={3} className="px-20 py-10">
            <div className="flex flex-col gap-12">
              <MobileRewardDetail label={<Trans>Volume</Trans>}>
                {formatUsd(entry.tradingVolume, { fallbackToZero: true, displayDecimals: 0 })}
              </MobileRewardDetail>
              <MobileRewardDetail label={<Trans>Referral volume</Trans>}>
                {formatUsd(entry.referralVolume, { fallbackToZero: true, displayDecimals: 0 })}
              </MobileRewardDetail>
              <MobileRewardDetail label={<Trans>esGMX accrued</Trans>}>
                {formatAmount(entry.esGmxRewards, ES_GMX_DECIMALS, 4, true, { trimTrailingZeros: true })}
              </MobileRewardDetail>
              <MobileRewardDetail label={<Trans>GT allocated</Trans>}>
                {formatAmount(entry.gtRewards, GT_DECIMALS, 4, true, { trimTrailingZeros: true })}
              </MobileRewardDetail>
              <MobileRewardDetail label={<Trans>Rewards USD</Trans>}>
                {formatUsd(entry.rewardsUsd, { fallbackToZero: true, displayDecimals: 2 })}
              </MobileRewardDetail>
              <MobileRewardDetail label={<Trans>Status</Trans>}>
                {getStatusContent(entry.epoch, epochDuration, now)}
              </MobileRewardDetail>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function MobileRewardDetail({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-12 text-13 font-medium text-typography-secondary">
      {label}
      <span className="text-14 text-typography-primary numbers">{children}</span>
    </div>
  );
}

function getStatusContent(epoch: number, epochDuration: number, now: number) {
  const epochEnd = epoch + epochDuration;

  if (getRewardsHistoryStatus(epoch, epochDuration, now) === "ongoing") {
    return (
      <span className="text-13 text-typography-secondary">
        <Trans>Epoch ends in</Trans>{" "}
        <span className="text-typography-primary">{formatTimeLeft(epochEnd - now, { alwaysShowDays: true })}</span>
      </span>
    );
  }

  return (
    <span className="text-13 text-typography-secondary">
      <Trans>Finished</Trans>
    </span>
  );
}
