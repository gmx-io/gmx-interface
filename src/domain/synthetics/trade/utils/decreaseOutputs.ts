import type { PositionInfo } from "domain/synthetics/positions";
import type { TokenData, TokensData } from "domain/synthetics/tokens";
import { getIsEquivalentTokens } from "sdk/utils/tokens";
import type { DecreasePositionAmounts } from "sdk/utils/trade/types";

export type DecreaseReceiveOutput = {
  type: "primary" | "secondary";
  token: TokenData;
  amount: bigint;
  usd: bigint;
};

export function getDecreaseReceiveOutputs({
  decreaseAmounts,
  tokensData,
}: {
  decreaseAmounts: DecreasePositionAmounts | undefined;
  tokensData: TokensData | undefined;
}): DecreaseReceiveOutput[] {
  if (!decreaseAmounts || !tokensData) {
    return [];
  }

  return [
    { type: "primary" as const, output: decreaseAmounts.primaryOutput },
    { type: "secondary" as const, output: decreaseAmounts.secondaryOutput },
  ].reduce<DecreaseReceiveOutput[]>((acc, { type, output }) => {
    if (output.amount <= 0n) {
      return acc;
    }

    const token = tokensData[output.tokenAddress];
    if (!token) {
      return acc;
    }

    acc.push({
      type,
      token,
      amount: output.amount,
      usd: output.usd,
    });

    return acc;
  }, []);
}

export function getCanSplitReceive(position: PositionInfo | undefined): boolean {
  if (!position?.pnlToken || !position.collateralToken) {
    return false;
  }

  return !getIsEquivalentTokens(position.pnlToken, position.collateralToken);
}

export function getHasSplitReceiveOutputs(outputs: DecreaseReceiveOutput[]): boolean {
  if (outputs.length < 2) {
    return false;
  }

  return outputs.some((output) => !getIsEquivalentTokens(output.token, outputs[0].token));
}
