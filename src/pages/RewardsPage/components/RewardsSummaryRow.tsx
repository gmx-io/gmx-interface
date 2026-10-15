import { Trans } from "@lingui/macro";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

import type { ContractsChainId } from "config/chains";
import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { useRewardsTesterLatestGtPrice as useLatestGtPrice } from "../tester/useRewardsTester"; // rewards-tester
import { convertToUsd } from "domain/synthetics/tokens";
import { isRatioVestingDepositDisabled } from "domain/vesting/ratioVesting";
import { useRewardsTesterRewardsVestingData as useRewardsVestingData } from "../tester/useRewardsTester"; // rewards-tester
import { expandDecimals, formatAmount, formatUsd } from "lib/numbers";
import { useCurrentUnixTimestamp } from "lib/useCurrentUnixTimestamp";
import { sendRewardsNavigationEvent } from "lib/userAnalytics/rewardsEvents";
import { useRewardsTesterIsWalletInitializing as useIsWalletInitializing } from "../tester/useRewardsTester"; // rewards-tester

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import LinkIcon from "img/ic_increaselimit_16.svg?react";
import InfoIconStroke from "img/ic_info_circle_stroke.svg?react";

import { getRewardsPath, REWARDS_VESTING_HIGHLIGHT_ACTION, REWARDS_VESTING_SEARCH_PARAM } from "../rewardsRoutes";
import { AccountValue, type AccountDataState, REWARDS_LINK_CLASSNAME } from "./rewardsTiersShared";

function isAtLeastSmallestShown(amount: bigint, decimals: number) {
  return amount >= expandDecimals(1, decimals - 2);
}

function formatTokenAmount(amount: bigint, decimals: number) {
  if (amount > 0n && !isAtLeastSmallestShown(amount, decimals)) return "< 0.01";

  return formatAmount(amount, decimals, 2, true, { trimTrailingZeros: true });
}

function AllTimeRewardsBreakdown({
  allTimeSummary,
  gmxPrice,
  gtPrice,
}: {
  allTimeSummary?: LeaderboardEntry;
  gmxPrice?: bigint;
  gtPrice?: bigint;
}) {
  const esGmxRewards = allTimeSummary?.esGmxRewards ?? 0n;
  const gtRewards = allTimeSummary?.gtRewards ?? 0n;
  const esGmxRewardsUsd = convertToUsd(esGmxRewards, ES_GMX_DECIMALS, gmxPrice);
  const gtRewardsUsd = convertToUsd(gtRewards, GT_DECIMALS, gtPrice);

  return (
    <div className="flex w-[300px] flex-col text-12">
      <div className="flex h-24 items-center justify-between gap-16">
        <span className="font-medium text-typography-secondary">
          <Trans>All-time esGMX</Trans>
        </span>
        <span className="flex items-center gap-4 numbers">
          {formatAmount(esGmxRewards, ES_GMX_DECIMALS, 4, true, { trimTrailingZeros: true })} esGMX
          {esGmxRewardsUsd !== undefined ? (
            <span className="text-typography-secondary">
              ({formatUsd(esGmxRewardsUsd, { fallbackToZero: true, displayDecimals: 2 })})
            </span>
          ) : null}
        </span>
      </div>
      <div className="flex h-24 items-center justify-between gap-16">
        <span className="font-medium text-typography-secondary">
          <Trans>All-time GT</Trans>
        </span>
        <span className="flex items-center gap-4 numbers">
          {formatAmount(gtRewards, GT_DECIMALS, 4, true, { trimTrailingZeros: true })} GT
          {gtRewardsUsd !== undefined ? (
            <span className="text-typography-secondary">
              ({formatUsd(gtRewardsUsd, { fallbackToZero: true, displayDecimals: 2 })})
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  tooltip,
  tooltipDisabled,
  value,
  subValue,
  action,
  qa,
}: {
  label: React.ReactNode;
  tooltip: React.ReactNode;
  tooltipDisabled?: boolean;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  action?: React.ReactNode;
  qa?: string;
}) {
  return (
    <div className="flex min-w-0 shrink-0 flex-col items-start gap-8" data-qa={qa}>
      <TooltipWithPortal
        content={tooltip}
        contentClassName="!gap-4"
        disabled={tooltipDisabled}
        handle={
          <button type="button" disabled={tooltipDisabled} className="inline-flex h-16 items-center gap-4 text-left">
            <span className="text-typography-secondary dark:text-typography-secondary/60">{label}</span>
            <InfoIconStroke className="size-12 shrink-0 text-typography-secondary" />
          </button>
        }
        handleClassName="text-body-medium font-medium"
        position="bottom-start"
        variant="none"
      />
      <div className="flex flex-col gap-4">
        <span className="text-h1 whitespace-nowrap text-typography-primary numbers max-md:text-24">{value}</span>
        {subValue !== undefined ? (
          <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
            <span className="text-12 font-medium leading-[1.25] text-typography-secondary numbers dark:text-typography-secondary/60">
              {subValue}
            </span>
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryDivider() {
  return (
    <div className="shrink-0 self-stretch border-l-1/2 border-slate-600 max-md:w-full max-md:border-l-0 max-md:border-t-1/2" />
  );
}

export function RewardsSummaryRow({
  chainId,
  account,
  allTimeSummary,
  summaryState,
}: {
  chainId: ContractsChainId;
  account?: string;
  allTimeSummary?: LeaderboardEntry;
  summaryState: AccountDataState;
}) {
  const { pathname, search } = useLocation();
  const now = useCurrentUnixTimestamp();
  const isWalletInitializing = useIsWalletInitializing();
  const {
    data: vestingData,
    isLoading: vestingLoading,
    vestableEsGmx,
    vestableEsGmxUsd,
  } = useRewardsVestingData(account, chainId);
  // Until the current GT balance is available here, show all GT earned.
  const gtBalance = allTimeSummary?.gtRewards ?? 0n;
  const { data: gtPrice, loading: gtPriceLoading } = useLatestGtPrice(chainId, {
    enabled: Boolean(account) && gtBalance > 0n,
  });

  const vestingTabLocation = useMemo(() => {
    const searchParams = new URLSearchParams(search);
    searchParams.set(REWARDS_VESTING_SEARCH_PARAM, REWARDS_VESTING_HIGHLIGHT_ACTION);

    return { pathname: getRewardsPath("history"), search: `?${searchParams.toString()}` };
  }, [search]);

  if (!account || isWalletInitializing) {
    return null;
  }

  const vestingState: AccountDataState = vestingData ? "ready" : vestingLoading ? "loading" : "unavailable";
  const vestingUsdState: AccountDataState =
    vestingState === "ready" && vestableEsGmxUsd === undefined ? "unavailable" : vestingState;
  const hasVestableEsGmx = vestingState === "ready" && isAtLeastSmallestShown(vestableEsGmx ?? 0n, ES_GMX_DECIMALS);
  const hasVestingPosition = (vestingData?.vestingInfo.vestedAmount ?? 0n) > 0n;
  const depositsDisabled = vestingData?.ratioVesting
    ? isRatioVestingDepositDisabled(vestingData.ratioVesting, BigInt(now))
    : false;
  // The Vesting tab has its own vest button right below the row.
  const isVestingTab = pathname.startsWith(getRewardsPath("history"));
  const showVestingAction = hasVestableEsGmx && !depositsDisabled && !isVestingTab;

  const gtBalanceUsd = gtBalance === 0n ? 0n : convertToUsd(gtBalance, GT_DECIMALS, gtPrice?.priceUsd);
  const gtUsdState: AccountDataState =
    summaryState === "ready" && gtBalanceUsd === undefined
      ? gtPriceLoading
        ? "loading"
        : "unavailable"
      : summaryState;
  const hasGtBalance = summaryState === "ready" && isAtLeastSmallestShown(gtBalance, GT_DECIMALS);

  return (
    <div className="flex py-32 max-md:py-20" data-qa="rewards-summary-row">
      <div className="flex items-stretch gap-40 max-lg:gap-24 max-md:w-full max-md:flex-col max-md:gap-16">
        <SummaryItem
          qa="rewards-summary-all-time"
          label={<Trans>All-time rewards</Trans>}
          tooltip={
            <AllTimeRewardsBreakdown
              allTimeSummary={allTimeSummary}
              gmxPrice={vestingData?.gmxPrice}
              gtPrice={gtPrice?.priceUsd}
            />
          }
          tooltipDisabled={summaryState !== "ready"}
          value={
            <AccountValue state={summaryState}>
              {formatUsd(allTimeSummary?.rewardsUsd, { fallbackToZero: true, displayDecimals: 2, minThreshold: "0" })}
            </AccountValue>
          }
        />

        <SummaryDivider />

        <SummaryItem
          qa="rewards-summary-vestable-esgmx"
          label={<Trans>Available to vest</Trans>}
          tooltip={<Trans>esGMX available to begin vesting.</Trans>}
          value={
            <AccountValue state={vestingState}>
              {formatTokenAmount(vestableEsGmx ?? 0n, ES_GMX_DECIMALS)} esGMX
            </AccountValue>
          }
          subValue={
            <AccountValue state={vestingUsdState}>{formatUsd(vestableEsGmxUsd, { fallbackToZero: true })}</AccountValue>
          }
          action={
            showVestingAction ? (
              <Link
                to={vestingTabLocation}
                className={REWARDS_LINK_CLASSNAME}
                onClick={() => sendRewardsNavigationEvent({ source: "TiersSummary" })}
              >
                {hasVestingPosition ? <Trans>Vest more</Trans> : <Trans>Start vesting</Trans>}
                <LinkIcon className="size-12 shrink-0" />
              </Link>
            ) : null
          }
        />

        <SummaryDivider />

        <SummaryItem
          qa="rewards-summary-gt-balance"
          label={<Trans>GT balance</Trans>}
          tooltip={<Trans>GT you hold. You can sell it for USDC in the daily GT buyback.</Trans>}
          value={<AccountValue state={summaryState}>{formatTokenAmount(gtBalance, GT_DECIMALS)} GT</AccountValue>}
          subValue={<AccountValue state={gtUsdState}>{formatUsd(gtBalanceUsd, { fallbackToZero: true })}</AccountValue>}
          action={
            hasGtBalance ? (
              <Link to="/earn/portfolio" className={REWARDS_LINK_CLASSNAME}>
                <Trans>Sell through buyback</Trans>
                <LinkIcon className="size-12 shrink-0" />
              </Link>
            ) : null
          }
        />
      </div>
    </div>
  );
}
