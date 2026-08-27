import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { formatUsd } from "lib/numbers";

import { EarningUnavailableNote, EarningValue } from "components/EarningValue/EarningValue";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";

import { EarningsStat, UsdStatValue, UsdText } from "./EarningsStat";
import { EarningsOrigin, OriginChips } from "./OriginChips";

function LpRowLabel({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-4 text-typography-secondary hover:text-typography-primary">
      {children}
      <ArrowRightIcon className="size-14" />
    </Link>
  );
}

function LpRowValue({
  usd,
  isLoading,
  isAvailable,
}: {
  usd: bigint | undefined;
  isLoading: boolean;
  isAvailable: boolean;
}) {
  return (
    <EarningValue value={usd} isLoading={isLoading} isAvailable={isAvailable} skeletonWidth={60}>
      {(value) => <UsdText usd={value} className={cx("numbers", { "text-slate-500": value === 0n })} />}
    </EarningValue>
  );
}

export function LpPanel({
  lifetimeUsd,
  last7dUsd,
  gmLifetimeUsd,
  glvLifetimeUsd,
  expected365dUsd,
  isLoading,
  isUnavailable,
  isExpected365dLoading,
  isExpected365dUnavailable,
  origins,
}: {
  lifetimeUsd: bigint | undefined;
  last7dUsd: bigint | undefined;
  gmLifetimeUsd: bigint | undefined;
  glvLifetimeUsd: bigint | undefined;
  expected365dUsd: bigint | undefined;
  isLoading: boolean;
  isUnavailable: boolean;
  isExpected365dLoading: boolean;
  isExpected365dUnavailable: boolean;
  origins: EarningsOrigin[];
}) {
  const isAvailable = !isUnavailable;

  return (
    <div className="flex h-full flex-col rounded-8 bg-slate-900">
      <div className="flex flex-col gap-12 p-20">
        <div className="flex items-center justify-between gap-8">
          <h3 className="text-body-large font-medium text-typography-primary">
            <Trans>LP</Trans>
          </h3>
          <OriginChips origins={origins} />
        </div>

        <div className="flex gap-28">
          <EarningsStat label={<Trans>Lifetime rewards</Trans>}>
            <UsdStatValue usd={lifetimeUsd} isLoading={isLoading} isAvailable={isAvailable} />
          </EarningsStat>
          <EarningsStat label={<Trans>Last 7 days</Trans>}>
            <UsdStatValue usd={last7dUsd} isLoading={isLoading} isAvailable={isAvailable} highlightPositive />
          </EarningsStat>
        </div>
      </div>

      <div className="border-t-1/2 border-slate-600" />

      <div className="flex flex-col gap-8 p-20">
        <SyntheticsInfoRow
          label={
            <LpRowLabel to="/pools">
              <Trans>GM pools</Trans>
            </LpRowLabel>
          }
          value={<LpRowValue usd={gmLifetimeUsd} isLoading={isLoading} isAvailable={isAvailable} />}
        />
        <SyntheticsInfoRow
          label={
            <LpRowLabel to="/pools">
              <Trans>GLV vaults</Trans>
            </LpRowLabel>
          }
          value={<LpRowValue usd={glvLifetimeUsd} isLoading={isLoading} isAvailable={isAvailable} />}
        />
        {isUnavailable && <EarningUnavailableNote />}
      </div>

      <div className="mt-auto">
        <div className="border-t-1/2 border-slate-600" />
        <div className="flex flex-col gap-8 p-20">
          <SyntheticsInfoRow
            label={
              <TooltipWithPortal
                handle={<Trans>Est. next 365 days</Trans>}
                content={
                  <Trans>
                    Projected fees for the next 365 days: each pool's or vault's base fee APY applied to your current
                    balance. Excludes incentives. An estimate, not a measured figure.
                  </Trans>
                }
              />
            }
            value={
              <EarningValue
                value={expected365dUsd}
                isLoading={isLoading || isExpected365dLoading}
                isAvailable={isAvailable && !isExpected365dUnavailable}
                skeletonWidth={60}
              >
                {(value) => <span className="text-blue-100 numbers">~{formatUsd(value)}</span>}
              </EarningValue>
            }
          />
        </div>
      </div>
    </div>
  );
}
