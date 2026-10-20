import { Trans } from "@lingui/macro";
import cx from "classnames";

import { formatMultiplier } from "domain/synthetics/incentives/v2/utils";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import InfoIconStroke from "img/ic_info_circle_stroke.svg?react";

import { AccountValue, type AccountDataState } from "./rewardsTiersShared";

export function RewardsTiersSummary({
  currentMultiplier,
  projectedMultiplier,
  maxMultiplier,
  multiplierDecimals,
  statusState,
}: {
  currentMultiplier?: bigint;
  projectedMultiplier?: bigint;
  maxMultiplier: bigint;
  multiplierDecimals: bigint;
  statusState: AccountDataState;
}) {
  const hasMultiplier = currentMultiplier !== undefined && currentMultiplier > 0n;
  const hasProjectedMultiplier =
    currentMultiplier !== undefined && projectedMultiplier !== undefined && projectedMultiplier !== currentMultiplier;

  if (statusState === "disconnected") {
    return null;
  }

  return (
    <div className="flex min-h-60 w-full items-center gap-20 p-4">
      <div className="flex min-w-0 flex-col items-start gap-8" data-testid="rewards-current-multiplier">
        <TooltipWithPortal
          content={
            <Trans>
              Your reward multiplier combines your volume tier, staking tier, and applicable activity boosts. The total
              multiplier is capped at {formatMultiplier(maxMultiplier, multiplierDecimals)}.
            </Trans>
          }
          handle={
            <span className="inline-flex h-16 items-center gap-4">
              <span className="text-typography-secondary dark:text-typography-secondary/60">
                <Trans>Current multiplier</Trans>
              </span>
              <InfoIconStroke className="size-12 shrink-0 text-typography-secondary" />
            </span>
          }
          handleClassName="text-body-medium font-medium"
          position="bottom-start"
          variant="none"
        />
        {hasProjectedMultiplier ? (
          <TooltipWithPortal
            handle={
              <span className="text-h1 flex items-center gap-8 whitespace-nowrap numbers max-md:text-24">
                <span
                  className={hasMultiplier ? "text-green-500 dark:text-green-300" : "text-blue-700 dark:text-blue-100"}
                >
                  {formatMultiplier(currentMultiplier, multiplierDecimals)}
                </span>
                <ArrowRightIcon
                  data-testid="multiplier-transition-arrow"
                  className="size-16 shrink-0 rounded-full bg-slate-700 p-2 text-typography-secondary"
                />
                <span className="text-blue-700 dark:text-blue-100">
                  {formatMultiplier(projectedMultiplier, multiplierDecimals)}
                </span>
              </span>
            }
            content={
              <div className="text-12">
                {projectedMultiplier > currentMultiplier ? (
                  <Trans>Your multiplier will increase next epoch.</Trans>
                ) : (
                  <Trans>Your multiplier will decrease next epoch.</Trans>
                )}{" "}
                <span className="text-typography-secondary">
                  <Trans>Due to changes in your volume and staking tiers.</Trans>
                </span>
              </div>
            }
            variant="none"
          />
        ) : (
          <span
            className={cx(
              "text-h1 whitespace-nowrap numbers max-md:text-24",
              hasMultiplier ? "text-green-500 dark:text-green-300" : "text-blue-700 dark:text-blue-100"
            )}
          >
            <AccountValue state={statusState}>
              {formatMultiplier(currentMultiplier ?? 0n, multiplierDecimals)}
            </AccountValue>
          </span>
        )}
      </div>
    </div>
  );
}
