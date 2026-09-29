import { Plural, Trans } from "@lingui/macro";
import cx from "classnames";
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
      className="rewards-epoch-payout text-white underline decoration-dotted underline-offset-[3px]"
      tooltipClassName={cx(
        "rewards-epoch-tooltip",
        "[&>svg]:hidden",
        "[.Tooltip-popup&]:rounded-6 [.Tooltip-popup&]:px-10 [.Tooltip-popup&]:py-6 [.Tooltip-popup&]:text-14 [.Tooltip-popup&]:leading-[18px]",
        "[.Tooltip-popup&]:tracking-[normal] [.Tooltip-popup&]:text-slate-400 [.Tooltip-popup&]:[background:#1e2033]",
        "[.Tooltip-popup&]:[border:1px_solid_#3c4067]"
      )}
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
    <span
      className="rewards-epoch-payout text-white underline decoration-dotted underline-offset-[3px]"
      title={formatUsd(stats.data.rewardsUsd)}
    >
      {payoutValue}
    </span>
  );
  const traders = (
    <span className="rewards-epoch-traders text-white">
      <Plural value={stats.data.traderCount} one="# trader" other="# traders" />
    </span>
  );

  return (
    <div
      className="rewards-epoch-summary text-18 mb-24 flex min-h-25 items-center gap-8 leading-[1.36] text-blue-100 max-mobile:mb-16 max-mobile:min-h-24 max-mobile:text-16 max-mobile:leading-[24px] [&>img]:shrink-0"
      aria-live="polite"
      aria-busy={stats.isValidating}
    >
      <img src={epochReturn} alt="" width={20} height={20} />
      <p>
        <Trans>
          Last epoch, {payout} came back to {traders}
        </Trans>
      </p>
    </div>
  );
}
