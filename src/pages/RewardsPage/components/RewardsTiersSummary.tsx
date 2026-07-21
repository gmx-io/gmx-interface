import { Trans } from "@lingui/macro";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { formatAmount, formatUsd } from "lib/numbers";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

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
  summaryState,
  vestingState,
  vestableEsGmx,
  vestableEsGmxUsd,
}: {
  allTimeSummary?: LeaderboardEntry;
  summaryState: AccountDataState;
  vestingState: AccountDataState;
  vestableEsGmx?: bigint;
  vestableEsGmxUsd?: bigint;
}) {
  const vestingUsdState: AccountDataState =
    vestingState === "ready" && vestableEsGmxUsd === undefined ? "loading" : vestingState;

  return (
    <div
      className="flex min-h-60 items-center gap-16 p-8 max-md:flex-col max-md:items-stretch"
      data-testid="rewards-tiers-summary"
    >
      <div className="flex min-w-0 flex-1 items-end gap-20 max-md:flex-col max-md:items-stretch max-md:gap-12">
        <div className="flex shrink-0 flex-col gap-2" data-testid="rewards-all-time-summary">
          <span className="text-24 font-medium leading-[1.1] numbers">
            <AccountValue state={summaryState}>
              {formatUsd(allTimeSummary?.rewardsUsd, { fallbackToZero: true, displayDecimals: 0 })}
            </AccountValue>
          </span>
          <TooltipWithPortal
            content={<AllTimeRewardsTooltip allTimeSummary={allTimeSummary} />}
            contentClassName="!gap-4"
            handle={<Trans>All-time Rewards</Trans>}
            handleClassName="text-12 font-medium text-typography-secondary"
            position="bottom-start"
            variant="iconStroke"
          />
        </div>

        <div className="self-stretch border-l-1/2 border-slate-600 max-md:w-full max-md:border-b-1/2 max-md:border-l-0" />

        <div className="flex shrink-0 flex-col gap-2" data-testid="rewards-vestable-summary">
          <TooltipWithPortal
            content={<Trans>esGMX available to begin vesting.</Trans>}
            contentClassName="!gap-4"
            handle={<Trans>Vestable esGMX</Trans>}
            handleClassName="text-12 font-medium text-typography-secondary"
            position="bottom-start"
            variant="iconStroke"
          />
          <div className="flex items-end gap-6 max-sm:flex-wrap">
            <span className="text-16 font-medium leading-[1.25] numbers">
              <AccountValue state={vestingState}>
                {formatAmount(vestableEsGmx ?? 0n, ES_GMX_DECIMALS, 2, true)}
              </AccountValue>
            </span>
            <div className="flex items-start gap-4 py-1 text-12 font-medium leading-[1.25]">
              <span className="text-typography-secondary numbers">
                <AccountValue state={vestingUsdState}>
                  {formatUsd(vestableEsGmxUsd, { fallbackToZero: true })}
                </AccountValue>
              </span>
              <span className="inline-flex items-center pr-2 text-typography-disabled">
                <Trans>Coming soon</Trans>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
