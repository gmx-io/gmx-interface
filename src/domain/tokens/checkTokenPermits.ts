import {
  decodeFunctionResult,
  encodeFunctionData,
  isAddressEqual,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

import { abis } from "sdk/abis";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

// canonical Multicall3, deployed at the same address on Arbitrum and Avalanche
export const MULTICALL3_ADDRESS: Address = "0xcA11bde05977b3631167028862bE2a173976CA11";

export type TokenPermitsCheckResult = {
  validPermits: SignedTokenPermit[];
  /** Reverted (e.g. nonce already used), but the existing allowance covers the spend */
  stalePermits: SignedTokenPermit[];
  /** The allowance would stay below the spend, so the relay call would fail */
  failedPermits: SignedTokenPermit[];
};

export class TokenPermitsCheckError extends Error {
  constructor(public failedPermits: SignedTokenPermit[]) {
    super("Token permits failed the pre-send check");
  }
}

/**
 * Executes every permit and reads the resulting allowance in one eth_call, so a permit that would be
 * swallowed by the relay router's try/catch is caught before the order is sent.
 */
export async function checkTokenPermits({
  client,
  permits,
  requiredAmounts,
}: {
  client: Pick<PublicClient, "call">;
  permits: SignedTokenPermit[];
  requiredAmounts: Record<string, bigint>;
}): Promise<TokenPermitsCheckResult> {
  const calls = permits.flatMap((permit) => [
    {
      target: permit.token as Address,
      allowFailure: true,
      callData: encodeFunctionData({
        abi: abis.ERC20PermitInterface,
        functionName: "permit",
        args: [
          permit.owner as Address,
          permit.spender as Address,
          permit.value,
          permit.deadline,
          permit.v,
          permit.r as Hex,
          permit.s as Hex,
        ],
      }),
    },
    {
      target: permit.token as Address,
      allowFailure: true,
      callData: encodeFunctionData({
        abi: abis.ERC20,
        functionName: "allowance",
        args: [permit.owner as Address, permit.spender as Address],
      }),
    },
  ]);

  const { data } = await client.call({
    to: MULTICALL3_ADDRESS,
    data: encodeFunctionData({ abi: abis.Multicall, functionName: "aggregate3", args: [calls] }),
  });

  if (!data) {
    throw new Error("Empty token permits check response");
  }

  const results = decodeFunctionResult({ abi: abis.Multicall, functionName: "aggregate3", data });

  const checkResult: TokenPermitsCheckResult = { validPermits: [], stalePermits: [], failedPermits: [] };

  permits.forEach((permit, index) => {
    const permitResult = results[index * 2];
    const allowanceResult = results[index * 2 + 1];

    const allowance = allowanceResult.success
      ? (decodeFunctionResult({
          abi: abis.ERC20,
          functionName: "allowance",
          data: allowanceResult.returnData,
        }) as bigint)
      : undefined;

    const requiredAmount =
      Object.entries(requiredAmounts).find(([tokenAddress]) =>
        isAddressEqual(tokenAddress as Address, permit.token as Address)
      )?.[1] ?? 0n;

    if (allowance === undefined || allowance < requiredAmount) {
      checkResult.failedPermits.push(permit);
    } else if (permitResult.success) {
      checkResult.validPermits.push(permit);
    } else {
      checkResult.stalePermits.push(permit);
    }
  });

  return checkResult;
}
