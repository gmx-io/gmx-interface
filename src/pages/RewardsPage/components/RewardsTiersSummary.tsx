import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { formatMultiplier } from "domain/synthetics/incentives/v2/utils";
import { formatAmount, formatUsd } from "lib/numbers";
import { sendRewardsNavigationEvent } from "lib/userAnalytics/rewardsEvents";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import InfoIconStroke from "img/ic_info_circle_stroke.svg?react";

import { getStartRewardsVestingPath } from "../rewardsRoutes";
import { AccountValue, type AccountDataState } from "./rewardsTiersShared";

function AllTimeRewardsTooltip({ allTimeSummary }: { allTimeSummary?: LeaderboardEntry }) {
  return (
    <div className="flex w-[300px] flex-col text-12">
      <div className="flex h-24 items-center justify-between gap-16">
        <span className="font-medium text-typography-secondary">
          <Trans>All-time esGMX</Trans>
        </span>
        <span className="numbers">
          {formatAmount(allTimeSummary?.esGmxRewards ?? 0n, ES_GMX_DECIMALS, 4, true, {
            trimTrailingZeros: true,
          })}{" "}
          esGMX
        </span>
      </div>
      <div className="flex h-24 items-center justify-between gap-16">
        <span className="font-medium text-typography-secondary">
          <Trans>All-time GT</Trans>
        </span>
        <span className="numbers">
          {formatAmount(allTimeSummary?.gtRewards ?? 0n, GT_DECIMALS, 4, true, {
            trimTrailingZeros: true,
          })}{" "}
          GT
        </span>
      </div>
    </div>
  );
}

export function RewardsTiersSummary({
  allTimeSummary,
  currentMultiplier,
  multiplierDecimals,
  statusState,
  summaryState,
  vestingState,
  vestableEsGmx,
  vestableEsGmxUsd,
  hasVestingPosition,
}: {
  allTimeSummary?: LeaderboardEntry;
  currentMultiplier?: bigint;
  multiplierDecimals: bigint;
  statusState: AccountDataState;
  summaryState: AccountDataState;
  vestingState: AccountDataState;
  vestableEsGmx?: bigint;
  vestableEsGmxUsd?: bigint;
  hasVestingPosition?: boolean;
}) {
  const vestingUsdState: AccountDataState =
    vestingState === "ready" && vestableEsGmxUsd === undefined ? "unavailable" : vestingState;

  if (statusState === "disconnected") {
    return null;
  }

  return (
    <div className="flex min-h-60 items-start gap-20 p-8 max-md:flex-col max-md:items-stretch max-md:gap-12">
      <div className="flex w-[240px] min-w-0 shrink-0 flex-col gap-2 max-md:w-full">
        <span className="text-12 font-medium text-typography-secondary">
          <Trans>Current Multiplier</Trans>
        </span>
        <span className="text-16 font-medium leading-[1.25] numbers">
          <AccountValue state={statusState}>
            {formatMultiplier(currentMultiplier ?? 0n, multiplierDecimals)}
          </AccountValue>
        </span>
      </div>

      <div className="self-stretch border-l-1/2 border-slate-600 max-md:w-full max-md:border-b-1/2 max-md:border-l-0" />

      <div className="flex w-[240px] min-w-0 shrink-0 flex-col gap-2 max-md:w-full">
        <TooltipWithPortal
          content={<AllTimeRewardsTooltip allTimeSummary={allTimeSummary} />}
          contentClassName="!gap-4"
          disabled={summaryState !== "ready"}
          handle={
            <button
              type="button"
              disabled={summaryState !== "ready"}
              className="inline-flex items-center gap-2 text-left"
            >
              <Trans>All-time Rewards</Trans>
              <InfoIconStroke className="size-16" />
            </button>
          }
          handleClassName="text-12 font-medium text-typography-secondary"
          position="bottom-start"
          variant="none"
        />
        <span className="text-16 font-medium leading-[1.25] numbers">
          <AccountValue state={summaryState}>
            {formatUsd(allTimeSummary?.rewardsUsd, { fallbackToZero: true, displayDecimals: 0 })}
          </AccountValue>
        </span>
      </div>

      <div className="self-stretch border-l-1/2 border-slate-600 max-md:w-full max-md:border-b-1/2 max-md:border-l-0" />

      <div
        className="flex w-[240px] min-w-0 shrink-0 flex-col gap-2 max-md:w-full"
        data-testid="rewards-vestable-summary"
      >
        <TooltipWithPortal
          content={<Trans>esGMX available to begin vesting.</Trans>}
          contentClassName="!gap-4"
          handle={
            <button type="button" className="inline-flex items-center gap-2 text-left">
              <Trans>Vestable esGMX</Trans>
              <InfoIconStroke className="size-16" />
            </button>
          }
          handleClassName="text-12 font-medium text-typography-secondary"
          position="bottom-start"
          variant="none"
        />
        <div className="flex items-end gap-12 max-sm:flex-wrap">
          {vestingState === "ready" ? (
            <>
              <div className="flex items-end gap-6">
                <span className="text-16 font-medium leading-[1.25] numbers">
                  {formatAmount(vestableEsGmx ?? 0n, ES_GMX_DECIMALS, 2, true)} esGMX
                </span>
                <div className="flex items-start py-1 text-12 font-medium leading-[1.25]">
                  <span className="text-typography-secondary numbers">
                    <AccountValue state={vestingUsdState}>
                      {formatUsd(vestableEsGmxUsd, { fallbackToZero: true })}
                    </AccountValue>
                  </span>
                </div>
              </div>
              {(vestableEsGmx ?? 0n) > 0n ? (
                <Link
                  to={getStartRewardsVestingPath()}
                  className="pb-1 text-12 font-medium leading-[1.25] text-rewards-blue-300"
                  onClick={() => sendRewardsNavigationEvent({ source: "TiersSummary" })}
                >
                  {hasVestingPosition ? <Trans>Vest more</Trans> : <Trans>Start vesting</Trans>}
                </Link>
              ) : null}
            </>
          ) : (
            <span className="text-16 font-medium leading-[1.25] numbers">
              <AccountValue state={vestingState}>-</AccountValue>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
