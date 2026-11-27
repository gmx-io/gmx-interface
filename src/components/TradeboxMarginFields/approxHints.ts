import {
  expandDecimals,
  formatAmountHumanParts,
  formatTokenAmount,
  formatUsdParts,
  joinNumberParts,
  numberParts,
  USD_DECIMALS,
  USD_PART,
  type NumberPart,
} from "lib/numbers";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";
import type { Token } from "sdk/utils/tokens/types";

// The "≈" hints next to amount fields: full numbers under 1 million, the app's short form from 1 million
// ("286.3m", like "$13.5m" in the header), so the typed amount keeps its room on phones. From 999.95b, where the
// short form would read "1000.0b", they read "> 1,000b".
const SHORT_FORM_FROM = 1_000_000n;
const SHORT_FORM_CAP = 999_950_000_000n;

function getHintRange(amount: bigint, decimals: number) {
  const unit = expandDecimals(1, decimals);
  if (amount >= SHORT_FORM_CAP * unit) return "capped";
  if (amount >= SHORT_FORM_FROM * unit) return "short";
  return "full";
}

/** The size of a position in tokens, e.g. "≈286.3m kPEPE"; takes the raw token amount and the index token. */
export function formatTokenAmountHint(amountInTokens: bigint, token: Token): string {
  const amount = amountInTokens / BigInt(token.visualMultiplier ?? 1);
  // a no-break space, like formatTokenAmount, so the number and its token never split
  const label = `\u00a0${getTokenVisualMultiplier(token)}${token.symbol}`;

  switch (getHintRange(amount, token.decimals)) {
    case "capped":
      return `> 1,000b${label}`;
    case "short":
      return `${joinNumberParts(formatAmountHumanParts(amount, token.decimals))}${label}`;
    default:
      return formatTokenAmount(amount, token.decimals, label.slice(1), { useCommas: true }) ?? "0";
  }
}

/** A dollar value next to an amount field, e.g. "≈$286.3m". */
export function formatUsdHintParts(usd: bigint): NumberPart[] {
  switch (getHintRange(usd, USD_DECIMALS)) {
    case "capped":
      return numberParts(">\u00a0", USD_PART, "1,000b");
    case "short":
      return formatAmountHumanParts(usd, USD_DECIMALS, true);
    default:
      return formatUsdParts(usd, { fallbackToZero: true }) ?? [];
  }
}
