import { Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import type { TradeRewardsEstimateState } from "domain/synthetics/incentives/v2/useTradeRewardsEstimate";
import { formatEstimatedTradeRewards } from "domain/synthetics/incentives/v2/utils";
import { sendRewardsNavigationEvent } from "lib/userAnalytics/rewardsEvents";

import { MultiplierBadge } from "components/MultiplierBadge/MultiplierBadge";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";

export function RewardsHintRow({
  rewardEstimate,
  marketAddress,
  marketName,
  hideWhenMultiplierIsZero = false,
}: {
  rewardEstimate: TradeRewardsEstimateState;
  marketAddress?: string;
  marketName?: string;
  hideWhenMultiplierIsZero?: boolean;
}) {
  if (!shouldShowRewardsHintRow(rewardEstimate, hideWhenMultiplierIsZero)) {
    return null;
  }

  const hasMultiplier = rewardEstimate.multiplier !== undefined && rewardEstimate.multiplier > 0n;
  const hasEstimatedRewards = rewardEstimate.estimatedRewards !== undefined;

  return (
    <Link
      to="/rewards"
      onClick={() =>
        sendRewardsNavigationEvent({
          source: "FeeBlock",
          hasEstimatedRewards,
          rewardsUsd: rewardEstimate.estimatedRewards?.rewardsUsd,
          multiplier: rewardEstimate.multiplier,
          multiplierDecimals: rewardEstimate.multiplierDecimals,
          ...(marketAddress !== undefined ? { marketAddress } : {}),
          ...(marketName !== undefined ? { marketName } : {}),
        })
      }
      className="flex items-center justify-between gap-8 rounded-8 p-8 text-12 text-typography-secondary transition-colors"
    >
      <span className="flex min-w-0 items-center gap-8">
        {rewardEstimate.multiplierDecimals ? (
          <MultiplierBadge
            multiplier={rewardEstimate.multiplier}
            multiplierDecimals={rewardEstimate.multiplierDecimals}
          />
        ) : null}
        {hasEstimatedRewards ? (
          <span className="truncate">
            <Trans>Estimated rewards</Trans>
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-4">
            <span className="truncate">
              {hasMultiplier ? (
                <Trans>
                  <span className="text-typography-primary">Current multiplier</span> · Earn rewards on eligible trades
                </Trans>
              ) : rewardEstimate.hasKnownMultiplier ? (
                <Trans>
                  <span className="text-typography-primary">Trade or stake</span> to unlock your rewards multiplier
                </Trans>
              ) : (
                <span className="text-typography-primary">
                  <Trans>View tiers and indexed rewards</Trans>
                </span>
              )}
            </span>
            <ArrowRightIcon aria-hidden="true" className="size-16 shrink-0" />
          </span>
        )}
      </span>

      {rewardEstimate.estimatedRewards ? (
        <span className="shrink-0 text-right text-typography-primary numbers">
          {formatEstimatedTradeRewards(rewardEstimate.estimatedRewards)}
        </span>
      ) : null}
    </Link>
  );
}

export function shouldShowRewardsHintRow(rewardEstimate: TradeRewardsEstimateState, hideWhenMultiplierIsZero = false) {
  return rewardEstimate.enabled && (!hideWhenMultiplierIsZero || rewardEstimate.multiplier !== 0n);
}
