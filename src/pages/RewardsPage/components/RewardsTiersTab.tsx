import type { ContractsChainId } from "config/chains";
import type { AccountIncentiveStatus, IncentivesConfig, LeaderboardEntry } from "domain/synthetics/incentives/v2/types";

import { RewardsTierCards } from "./RewardsTierCards";
import { RewardsTiersFaq } from "./RewardsTiersFaq";
import type { AccountDataState } from "./rewardsTiersShared";
import { RewardsTiersSummary } from "./RewardsTiersSummary";
import { RewardsTierTables } from "./RewardsTierTables";

export function RewardsTiersTab({
  chainId,
  config,
  account,
  status,
  allTimeSummary,
  statusLoading,
  summaryLoading,
  statusUnavailable,
  summaryUnavailable,
}: {
  chainId: ContractsChainId;
  config: IncentivesConfig;
  account?: string;
  status?: AccountIncentiveStatus;
  allTimeSummary?: LeaderboardEntry;
  statusLoading: boolean;
  summaryLoading: boolean;
  statusUnavailable: boolean;
  summaryUnavailable: boolean;
}) {
  const statusState: AccountDataState = !account
    ? "disconnected"
    : statusLoading
      ? "loading"
      : statusUnavailable || !status
        ? "unavailable"
        : "ready";
  const summaryState: AccountDataState = !account
    ? "disconnected"
    : summaryLoading
      ? "loading"
      : summaryUnavailable
        ? "unavailable"
        : "ready";
  const vestingState: AccountDataState = !account ? "disconnected" : "unavailable";

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-12" data-testid="rewards-tiers-overview">
        <RewardsTiersSummary allTimeSummary={allTimeSummary} summaryState={summaryState} vestingState={vestingState} />
        <RewardsTierCards config={config} status={status} statusState={statusState} />
      </div>

      <RewardsTierTables chainId={chainId} config={config} status={status} statusState={statusState} />
      <RewardsTiersFaq config={config} />
    </div>
  );
}
