import { convertToUsd } from "sdk/utils/tokens";
import type { ProgressiveTokenData } from "sdk/utils/tokens/types";
import type { FundingPayout } from "sdk/utils/trade/types";

export function getFundingPayoutOutputs({
  fundingPayout,
  longToken,
  shortToken,
}: {
  fundingPayout: FundingPayout | undefined;
  longToken: ProgressiveTokenData;
  shortToken: ProgressiveTokenData;
}) {
  const outputs: { token: ProgressiveTokenData; amount: bigint }[] = [];

  for (const [token, amount] of [
    [longToken, fundingPayout?.longTokenAmount ?? 0n],
    [shortToken, fundingPayout?.shortTokenAmount ?? 0n],
  ] as const) {
    if (amount <= 0n) continue;

    const output = outputs.find((item) => item.token.address === token.address);
    if (output) {
      output.amount += amount;
    } else {
      outputs.push({ token, amount });
    }
  }

  return outputs.map((output) => ({
    ...output,
    usd:
      output.token.prices && output.token.prices.minPrice > 0n
        ? convertToUsd(output.amount, output.token.decimals, output.token.prices.minPrice)
        : undefined,
  }));
}
