import { formatUnits } from "viem";

import { serializeCsv } from "lib/csv";
import { GMX_DECIMALS } from "lib/legacy";
import { USD_DECIMALS } from "lib/numbers";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "./constants";
import type { IncentiveAccountEpochAuditEntry, IncentiveDistributionRow, IncentivesConfig } from "./types";
import { formatMultiplier } from "./utils";

export const INCENTIVE_DISTRIBUTION_COLUMNS = [
  "wallet",
  "esGMX",
  "GT",
  "volume_usd",
  "volume_multiplier",
  "staking_gmx",
  "staking_multiplier",
  "total_multiplier",
  "eligible_referral_volume_usd",
  "eligible_fees_usd",
] as const satisfies readonly (keyof IncentiveDistributionRow)[];

export function getIncentiveDistributionRows(
  entries: IncentiveAccountEpochAuditEntry[],
  config: IncentivesConfig
): IncentiveDistributionRow[] {
  return entries
    .slice()
    .sort((a, b) => (a.esGmxRewards > b.esGmxRewards ? -1 : a.esGmxRewards < b.esGmxRewards ? 1 : 0))
    .map((entry) => {
      const volumeMultiplier = entry.volumeTier
        ? config.volumeTiers.find((tier) => tier.tier === entry.volumeTier)?.multiplier
        : 0n;
      const stakingMultiplier = entry.stakingTier
        ? config.stakingTiers.find((tier) => tier.tier === entry.stakingTier)?.multiplier
        : 0n;
      const hasEpochConfig = entry.epochTimestamp >= config.epochStartTimestamp;
      const multiplier = (value: bigint | undefined) =>
        value === undefined || config.multiplierDecimals <= 0n
          ? ""
          : formatMultiplier(value, config.multiplierDecimals).slice(0, -1);

      return {
        wallet: entry.account,
        esGMX: formatUnits(entry.esGmxRewards, ES_GMX_DECIMALS),
        GT: formatUnits(entry.gtRewards, GT_DECIMALS),
        volume_usd: formatUnits(entry.tierVolume, USD_DECIMALS),
        volume_multiplier: hasEpochConfig ? multiplier(volumeMultiplier) : "",
        staking_gmx: entry.avgStakedGmx == null ? "" : formatUnits(entry.avgStakedGmx, GMX_DECIMALS),
        staking_multiplier: hasEpochConfig ? multiplier(stakingMultiplier) : "",
        total_multiplier: multiplier(
          Number.isSafeInteger(entry.avgMultiplier) ? BigInt(entry.avgMultiplier) : undefined
        ),
        eligible_referral_volume_usd: formatUnits(entry.referralVolume, USD_DECIMALS),
        eligible_fees_usd: formatUnits(entry.fees, USD_DECIMALS),
      };
    });
}

export function getIncentiveDistributionCsv(rows: IncentiveDistributionRow[], detailed: boolean) {
  return serializeCsv(detailed ? INCENTIVE_DISTRIBUTION_COLUMNS : INCENTIVE_DISTRIBUTION_COLUMNS.slice(0, 2), rows);
}
