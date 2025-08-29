import { formatAmount, USD_DECIMALS } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

export function formatDelta(
  delta: bigint,
  {
    decimals = USD_DECIMALS,
    displayDecimals = 2,
    useCommas = true,
    ...p
  }: {
    decimals?: number;
    displayDecimals?: number;
    useCommas?: boolean;
    prefixoid?: string;
    signed?: boolean;
    prefix?: string;
    postfix?: string;
  } = {}
) {
  return `${p.prefixoid ? `${p.prefixoid}\u200a` : ""}${p.signed ? (delta === 0n ? "" : delta > 0 ? "+" : "-") : ""}${
    p.prefix || ""
  }\u200a${formatAmount(p.signed ? bigMath.abs(delta) : delta, decimals, displayDecimals, useCommas)}${p.postfix || ""}`;
}

export function getSignedValueClassName(num: bigint) {
  return num === 0n ? "" : num < 0 ? "negative" : "positive";
}
