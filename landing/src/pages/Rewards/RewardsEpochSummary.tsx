import { Plural, Trans } from "@lingui/macro";
import { useId } from "react";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useIncentivesEpochStats } from "domain/synthetics/incentives/v2/useIncentivesEpochStats";
import { getPreviousEpochRewardBreakdown } from "domain/synthetics/incentives/v2/utils";
import { formatAmountHuman, formatUsd, USD_DECIMALS } from "lib/numbers";

import Tooltip from "components/Tooltip/Tooltip";

import epochReturn from "img/rewards-landing/epoch-return.svg";

export function RewardsEpochSummary({
  endpoint,
  config,
}: {
  endpoint?: string;
  config: IncentivesConfig | null | undefined;
}) {
  const stats = useIncentivesEpochStats(endpoint, config);
  const tooltipId = useId();

  if (
    !config ||
    config.epochTimestamp - config.epochDuration < config.programStartTimestamp ||
    !stats.data ||
    stats.data.rewardsUsd <= 0n ||
    stats.data.traderCount <= 0
  ) {
    return null;
  }

  const breakdown = getPreviousEpochRewardBreakdown(stats.data.rewardsUsd, config);
  const esGmx = breakdown ? formatAmountHuman(breakdown.esGmxUsd, USD_DECIMALS, true, 2).toUpperCase() : undefined;
  const gt = breakdown ? formatAmountHuman(breakdown.gtUsd, USD_DECIMALS, true, 2).toUpperCase() : undefined;
  const payoutValue = formatAmountHuman(stats.data.rewardsUsd, USD_DECIMALS, true, 0).toUpperCase();
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
    <span className="rewards-epoch-payout" title={formatUsd(stats.data.rewardsUsd)}>
      {payoutValue}
    </span>
  );
  const traders = (
    <span className="rewards-epoch-traders">
      <Plural value={stats.data.traderCount} one="# trader" other="# traders" />
    </span>
  );

  return (
    <div className="rewards-epoch-summary" aria-live="polite" aria-busy={stats.isValidating}>
      <img src={epochReturn} alt="" width={20} height={20} />
      <p>
        <Trans>
          Last epoch, {payout} came back to {traders}
        </Trans>
      </p>
    </div>
  );
}
