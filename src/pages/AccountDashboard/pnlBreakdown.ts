import type { PnlSummaryPoint } from "domain/synthetics/accountStats/usePnlSummaryData";

export type PnlBreakdownFieldKey =
  | "realizedBasePnlUsd"
  | "unrealizedBasePnlUsd"
  | "startUnrealizedBasePnlContributionUsd"
  | "openFeesUsd"
  | "closeFeesUsd"
  | "borrowingFeesUsd"
  | "positiveFundingFeesUsd"
  | "negativeFundingFeesUsd"
  | "liquidationFeesUsd"
  | "realizedFeesRemainderUsd"
  | "unrealizedFeesContributionUsd"
  | "netPriceImpactUsd"
  | "swapFeesUsd"
  | "swapPriceImpactUsd";

export type PnlBreakdownRow = {
  key: PnlBreakdownFieldKey;
  value: bigint;
};

const PNL_BREAKDOWN_BASE_FIELD_KEYS: PnlBreakdownFieldKey[] = [
  "realizedBasePnlUsd",
  "unrealizedBasePnlUsd",
  "startUnrealizedBasePnlContributionUsd",
];

const PNL_BREAKDOWN_FEE_AND_IMPACT_FIELD_KEYS: PnlBreakdownFieldKey[] = [
  "openFeesUsd",
  "closeFeesUsd",
  "borrowingFeesUsd",
  "positiveFundingFeesUsd",
  "negativeFundingFeesUsd",
  "liquidationFeesUsd",
  "realizedFeesRemainderUsd",
  "unrealizedFeesContributionUsd",
  "netPriceImpactUsd",
  "swapFeesUsd",
  "swapPriceImpactUsd",
];

const OPTIONAL_ZERO_VALUE_FIELD_KEYS: PnlBreakdownFieldKey[] = ["positiveFundingFeesUsd", "liquidationFeesUsd"];

export function getPnlBreakdownBaseRows(row: PnlSummaryPoint): PnlBreakdownRow[] {
  return PNL_BREAKDOWN_BASE_FIELD_KEYS.map((key) => ({ key, value: row[key] }));
}

export function getPnlBreakdownFeeAndImpactRows(row: PnlSummaryPoint): PnlBreakdownRow[] {
  return PNL_BREAKDOWN_FEE_AND_IMPACT_FIELD_KEYS.filter(
    (key) => row[key] !== 0n || !OPTIONAL_ZERO_VALUE_FIELD_KEYS.includes(key)
  ).map((key) => ({ key, value: row[key] }));
}

export function getPnlBreakdownComponentTotal(row: PnlSummaryPoint): bigint {
  return [...PNL_BREAKDOWN_BASE_FIELD_KEYS, ...PNL_BREAKDOWN_FEE_AND_IMPACT_FIELD_KEYS].reduce(
    (total, key) => total + row[key],
    0n
  );
}
