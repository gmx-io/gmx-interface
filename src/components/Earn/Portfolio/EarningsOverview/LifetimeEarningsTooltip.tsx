import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import {
  EarningAttributionNote,
  EarningAttributionScope,
  EarningNotAvailable,
  EarningUnavailableNote,
} from "components/EarningValue/EarningValue";
import { NumericValue } from "components/NumericValue/NumericValue";
import { UsdValue } from "components/NumericValue/UsdValue";
import {
  TooltipContent,
  TooltipFootnote,
  TooltipRow,
  TooltipRows,
  TooltipTitle,
  TooltipTotal,
} from "components/Tooltip/TooltipBlocks";

import { formatUsdExpandedParts } from "./EarningsStat";

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
    <TooltipRow
      label={label}
      value={
        usd === undefined ? (
          <EarningNotAvailable />
        ) : (
          <NumericValue parts={formatUsdExpandedParts(usd)} className="numbers" />
        )
      }
    />
  );
}

function Group({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <TooltipRows>
      <TooltipTitle>{title}</TooltipTitle>
      {children}
    </TooltipRows>
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
    <TooltipContent>
      <Group title={<Trans>Lifetime staking rewards</Trans>}>
        <LeafRow label={<Trans>GMX rewards</Trans>} usd={breakdown.stakingGmxUsd} />
        <LeafRow label={<Trans>esGMX rewards</Trans>} usd={breakdown.stakingEsGmxUsd} />
        <LeafRow label={<Trans>{nativeTokenSymbol} rewards</Trans>} usd={breakdown.stakingNativeUsd} />
      </Group>

      <Group title={<Trans>Lifetime LP rewards</Trans>}>
        <LeafRow label={<Trans>GM pools</Trans>} usd={breakdown.gmUsd} />
        <LeafRow label={<Trans>GLV vaults</Trans>} usd={breakdown.glvUsd} />
      </Group>

      <TooltipTotal
        label={<Trans>Total</Trans>}
        value={
          breakdown.totalUsd === undefined ? (
            <EarningNotAvailable />
          ) : (
            <UsdValue usd={breakdown.totalUsd} className="numbers" />
          )
        }
      />

      <TooltipFootnote>
        <Trans>GM and GLV include markets you no longer hold</Trans>
      </TooltipFootnote>

      {isLpUnavailable && (
        <TooltipFootnote>
          <EarningUnavailableNote />
        </TooltipFootnote>
      )}
      {lpAttributionScope && (
        <TooltipFootnote>
          <EarningAttributionNote scope={lpAttributionScope} />
        </TooltipFootnote>
      )}
    </TooltipContent>
  );
}
