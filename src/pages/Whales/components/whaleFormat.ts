import { formatUsd } from "lib/numbers";

// Whale volumes/sizes routinely exceed $1B (especially all-time), where the
// default formatUsd caps the display at ">$1B". Show the real figure instead.
export function formatWhaleUsd(value: bigint | undefined): string | undefined {
  return formatUsd(value, { maxThreshold: null });
}
