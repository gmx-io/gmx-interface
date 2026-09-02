import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { formatUsd } from "lib/numbers";

import {
  EarningAttributionNote,
  EarningAttributionScope,
  EarningNotAvailable,
  EarningUnavailableNote,
} from "components/EarningValue/EarningValue";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

import { formatUsdExpanded } from "./EarningsStat";

export type LifetimeEarningsBreakdown = {
  stakingGmxUsd: bigint;
  stakingEsGmxUsd: bigint;
  stakingNativeUsd: bigint;
  gmUsd: bigint | undefined;
  glvUsd: bigint | undefined;
  totalUsd: bigint | undefined;
};

function LeafRow({ label, usd }: { label: ReactNode; usd: bigint | undefined }) {
  return (
    <StatsTooltipRow
      label={label}
      showDollar={false}
      value={usd === undefined ? <EarningNotAvailable /> : <span className="numbers">{formatUsdExpanded(usd)}</span>}
    />
  );
}

function Group({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-8">
      <span className="text-body-medium font-medium text-typography-secondary">{title}</span>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

export function LifetimeEarningsTooltipContent({
  breakdown,
  nativeTokenSymbol,
  isLpUnavailable,
  lpAttributionScope,
}: {
  breakdown: LifetimeEarningsBreakdown;
  nativeTokenSymbol: string;
  isLpUnavailable: boolean;
  lpAttributionScope: EarningAttributionScope | undefined;
}) {
  return (
    <div className="flex flex-col gap-8">
      <Group title={<Trans>Lifetime staking rewards</Trans>}>
        <LeafRow label={<Trans>GMX rewards</Trans>} usd={breakdown.stakingGmxUsd} />
        <LeafRow label={<Trans>esGMX rewards</Trans>} usd={breakdown.stakingEsGmxUsd} />
        <LeafRow label={<Trans>{nativeTokenSymbol} rewards</Trans>} usd={breakdown.stakingNativeUsd} />
      </Group>

      <Group title={<Trans>Lifetime LP rewards</Trans>}>
        <LeafRow label={<Trans>GM pools</Trans>} usd={breakdown.gmUsd} />
        <LeafRow label={<Trans>GLV vaults</Trans>} usd={breakdown.glvUsd} />
      </Group>

      <div className="border-t-1/2 border-slate-600" />

      <StatsTooltipRow
        label={<Trans>Total</Trans>}
        showDollar={false}
        value={
          breakdown.totalUsd === undefined ? (
            <EarningNotAvailable />
          ) : (
            <span className="numbers">{formatUsd(breakdown.totalUsd)}</span>
          )
        }
      />

      <span className="text-typography-tertiary">
        <Trans>GM and GLV include markets you no longer hold.</Trans>
      </span>

      {isLpUnavailable && <EarningUnavailableNote />}
      {lpAttributionScope && <EarningAttributionNote scope={lpAttributionScope} />}
    </div>
  );
}
