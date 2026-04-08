import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import { formatMultiplier, MAX_MULTIPLIER, MULTIPLIER_DECIMALS } from "domain/synthetics/incentives/constants";
import { formatAmount } from "lib/numbers";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

type Props = {
  multiplier?: number;
  pointsBalance?: bigint;
  account?: string;
};

export function MainDataSection({ multiplier, pointsBalance, account }: Props) {
  const displayMultiplier = multiplier !== undefined ? formatMultiplier(multiplier) : "0.0x";
  const displayPoints = pointsBalance ? formatAmount(pointsBalance, 18, 4, true) : "0.0000";

  return (
    <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1">
      <div className="flex flex-col gap-8 rounded-8 border-1/2 border-slate-600 bg-slate-950 p-20">
        <div className="flex items-center gap-8">
          <span className="text-body-medium text-typography-secondary">
            <Trans>Your Multiplier</Trans>
          </span>
          <TooltipWithPortal
            handle={undefined}
            content={t`Your total multiplier is the sum of your Volume Tier, Staking Tier, and Activity Boosts, capped at 4.0x. A higher multiplier means more points per dollar of trading fees.`}
          />
        </div>
        <span
          className={cx("text-h1 font-bold", {
            "text-typography-primary": account && multiplier !== undefined,
            "text-typography-secondary": !account || multiplier === undefined,
          })}
        >
          {displayMultiplier}
        </span>
        {!account && (
          <span className="text-body-small text-typography-secondary">
            <Trans>Connect wallet to see your multiplier</Trans>
          </span>
        )}
        {account && multiplier !== undefined && multiplier > 0 && <MultiplierBreakdown multiplier={multiplier} />}
      </div>

      <div className="flex flex-col gap-8 rounded-8 border-1/2 border-slate-600 bg-slate-950 p-20">
        <div className="flex items-center gap-8">
          <span className="text-body-medium text-typography-secondary">
            <Trans>Points Balance</Trans>
          </span>
          <TooltipWithPortal
            handle={undefined}
            content={t`Points are earned weekly based on trading fees and your multiplier. Points are pegged 1:1 to GMX price and expire after 13 weeks. Points automatically discount up to 50% of your open/close trading fees.`}
          />
        </div>
        <span
          className={cx("text-h1 font-bold", {
            "text-typography-primary": account && pointsBalance !== undefined && pointsBalance > 0n,
            "text-typography-secondary": !account || pointsBalance === undefined || pointsBalance === 0n,
          })}
        >
          {displayPoints}
        </span>
        {!account && (
          <span className="text-body-small text-typography-secondary">
            <Trans>Connect wallet to see your points</Trans>
          </span>
        )}
      </div>
    </div>
  );
}

function MultiplierBreakdown({ multiplier }: { multiplier: number }) {
  const value = multiplier / MULTIPLIER_DECIMALS;
  const maxValue = MAX_MULTIPLIER / MULTIPLIER_DECIMALS;
  const percentage = Math.min((value / maxValue) * 100, 100);

  const progressStyle = useMemo(() => ({ width: `${percentage}%` }), [percentage]);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-body-small flex items-center justify-between text-typography-secondary">
        <span>
          <Trans>Current</Trans>
        </span>
        <span>
          <Trans>Max 4.0x</Trans>
        </span>
      </div>
      <div className="relative h-4 overflow-hidden rounded-2 bg-slate-700">
        <div
          className="absolute left-0 top-0 h-full rounded-2 bg-blue-300 transition-[width] duration-300"
          style={progressStyle}
        />
      </div>
    </div>
  );
}
