import { Plural, Trans } from "@lingui/macro";
import { useId } from "react";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useIncentivesEpochStats } from "domain/synthetics/incentives/v2/useIncentivesEpochStats";
import { getPreviousEpochRewardBreakdown } from "domain/synthetics/incentives/v2/utils";
import { formatAmountHuman, formatUsd, USD_DECIMALS } from "lib/numbers";

import Tooltip from "components/Tooltip/Tooltip";

import epochReturn from "img/rewards-landing/epoch-return.svg";

import { RewardsValue } from "./RewardsValue";

export function RewardsEpochSummary({
  endpoint,
  config,
  loading,
}: {
  endpoint?: string;
  config: IncentivesConfig | null | undefined;
  loading: boolean;
}) {
  const stats = useIncentivesEpochStats(endpoint, config);
  const tooltipId = useId();
  const breakdown = stats.data && config ? getPreviousEpochRewardBreakdown(stats.data.rewardsUsd, config) : undefined;
  const esGmx = breakdown ? formatAmountHuman(breakdown.esGmxUsd, USD_DECIMALS, true, 2).toUpperCase() : undefined;
  const gt = breakdown ? formatAmountHuman(breakdown.gtUsd, USD_DECIMALS, true, 2).toUpperCase() : undefined;
  const payoutValue = (
    <RewardsValue loading={loading || stats.isLoading} width="5ch">
      {stats.data ? formatAmountHuman(stats.data.rewardsUsd, USD_DECIMALS, true, 0).toUpperCase() : undefined}
    </RewardsValue>
  );
  const payout = breakdown ? (
    <Tooltip
      as="button"
      type="button"
      className="rewards-epoch-payout"
      tooltipClassName="rewards-epoch-tooltip"
      position="bottom-start"
      withPortal
      closeOnDoubleClick
      aria-describedby={tooltipId}
      content={
        <span id={tooltipId} role="tooltip">
          <Trans>
            {esGmx} esGMX + {gt} GT
          </Trans>
        </span>
      }
    >
      {payoutValue}
    </Tooltip>
  ) : (
    <span className="rewards-epoch-payout" title={formatUsd(stats.data?.rewardsUsd)}>
      {payoutValue}
    </span>
  );
  const traders = (
    <span className="rewards-epoch-traders">
      {stats.data ? (
        <Plural value={stats.data.traderCount} one="# trader" other="# traders" />
      ) : (
        <RewardsValue loading={loading || stats.isLoading} width="10ch" />
      )}
    </span>
  );
  return (
    <div className="rewards-epoch-summary" aria-live="polite" aria-busy={stats.isLoading}>
      <img src={epochReturn} alt="" width={20} height={20} />
      {config && config.epochTimestamp - config.epochDuration < config.programStartTimestamp ? (
        <p>
          <Trans>The first epoch is under way</Trans>
        </p>
      ) : stats.error && !stats.data ? (
        <p>
          <Trans>Previous epoch totals are temporarily unavailable.</Trans>{" "}
          <button type="button" className="rewards-epoch-retry" onClick={() => void stats.mutate()}>
            <Trans>Try again</Trans>
          </button>
        </p>
      ) : (
        <p>
          <Trans>
            Last epoch, {payout} came back to {traders}
          </Trans>
        </p>
      )}
    </div>
  );
}
