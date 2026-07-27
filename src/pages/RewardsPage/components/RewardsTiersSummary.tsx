import { Trans } from "@lingui/macro";
import cx from "classnames";
import { Link } from "react-router-dom";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { formatMultiplier } from "domain/synthetics/incentives/v2/utils";
import { formatAmount, formatUsd } from "lib/numbers";
import { sendRewardsNavigationEvent } from "lib/userAnalytics/rewardsEvents";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
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
  projectedMultiplier,
  maxMultiplier,
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
  projectedMultiplier?: bigint;
  maxMultiplier: bigint;
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
  const hasMultiplier = currentMultiplier !== undefined && currentMultiplier > 0n;
  const hasProjectedMultiplier =
    currentMultiplier !== undefined && projectedMultiplier !== undefined && projectedMultiplier !== currentMultiplier;

  if (statusState === "disconnected") {
    return null;
  }

  return (
    <div className="flex min-h-60 items-start gap-20 p-8 max-md:flex-col max-md:items-stretch max-md:gap-12">
      <div
        className="flex w-[140px] min-w-0 shrink-0 flex-col gap-2 max-md:w-full"
        data-testid="rewards-current-multiplier"
      >
        {hasProjectedMultiplier ? (
          <TooltipWithPortal
            handle={
              <span className="flex items-center gap-8 text-24 font-medium numbers">
                <span className="text-typography-disabled">
                  {formatMultiplier(currentMultiplier, multiplierDecimals)}
                </span>
                <ArrowRightIcon
                  className={cx(
                    "size-16 shrink-0 rounded-full p-2",
                    projectedMultiplier > currentMultiplier
                      ? "bg-green-900 text-green-300"
                      : "bg-blue-900 text-blue-100"
                  )}
                />
                <span className={projectedMultiplier > currentMultiplier ? "text-green-300" : "text-blue-100"}>
                  {formatMultiplier(projectedMultiplier, multiplierDecimals)}
                </span>
              </span>
            }
            content={
              projectedMultiplier > currentMultiplier ? (
                <Trans>Your multiplier will increase next epoch.</Trans>
              ) : (
                <Trans>Your multiplier will decrease next epoch.</Trans>
              )
            }
            variant="none"
          />
        ) : (
          <span
            className={cx("text-24 font-medium leading-[1.1] numbers", {
              "text-green-300": hasMultiplier,
            })}
          >
            <AccountValue state={statusState}>
              {formatMultiplier(currentMultiplier ?? 0n, multiplierDecimals)}
            </AccountValue>
          </span>
        )}
        <TooltipWithPortal
          content={
            <Trans>
              Your reward multiplier combines your Volume Tier, Staking Tier, and applicable Activity Boosts. The total
              multiplier is capped at {formatMultiplier(maxMultiplier, multiplierDecimals)}.
            </Trans>
          }
          handle={<Trans>Current Multiplier</Trans>}
          handleClassName="text-12 font-medium text-typography-secondary"
          position="bottom-start"
          variant="iconStroke"
        />
      </div>

      <div className="self-stretch border-l-1/2 border-slate-600 max-md:w-full max-md:border-b-1/2 max-md:border-l-0" />

      <div className="flex w-[140px] min-w-0 shrink-0 flex-col gap-2 max-md:w-full">
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
        className="flex w-[140px] min-w-0 shrink-0 flex-col gap-2 max-md:w-full"
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
