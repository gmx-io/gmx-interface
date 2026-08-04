import type { Address, Hex } from "viem";

import { buildErc20ApproveTxn } from "sdk/utils/balances/api";

export type TokenToApprove = {
  tokenAddress: string;
  amount: bigint | undefined;
};

export type PendingTokenApproval = {
  tokenAddress: string;
  amount: bigint;
};

export type TokenApprovalCall = {
  to: Address;
  data: Hex;
  value: bigint;
};

export function mergeTokenApprovals(tokens: TokenToApprove[]): PendingTokenApproval[] {
  const tokenAmounts = new Map<string, bigint>();

  for (const token of tokens) {
    if (!token.tokenAddress) continue;

    const previousAmount = tokenAmounts.get(token.tokenAddress) ?? 0n;
    tokenAmounts.set(token.tokenAddress, previousAmount + (token.amount ?? 0n));
  }

  return Array.from(tokenAmounts, ([tokenAddress, amount]) => ({ tokenAddress, amount }));
}

export function buildTokenApprovalCall({
  tokenAddress,
  spender,
  amount,
}: {
  tokenAddress: string;
  spender: string;
  amount?: bigint;
}): TokenApprovalCall {
  const call = buildErc20ApproveTxn({ tokenAddress, spender, amount });

  return {
    to: call.to as Address,
    data: call.data as Hex,
    value: call.value,
  };
}
