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
  /** Not needed: the allowance before the permit already covers the spend, or the permit reverted (e.g. nonce used) */
  stalePermits: SignedTokenPermit[];
  /** The allowance would stay below the spend, so the relay call would fail */
  failedPermits: SignedTokenPermit[];
  /**
   * Needed, but can't be used: another call took its nonce, or a wallet transaction may outlive its deadline. A new
   * permit works, so the token keeps its permits
   */
  outdatedPermits: SignedTokenPermit[];
};

export class TokenPermitsCheckError extends Error {
  constructor(
    public failedPermits: SignedTokenPermit[],
    public outdatedPermits: SignedTokenPermit[] = []
  ) {
    super("Token permits failed the pre-send check");
  }
}

/**
 * Executes every permit between two allowance reads in one eth_call, so a permit that would be swallowed by the
 * relay router's try/catch is caught before the order is sent. A permit is left out when the allowance already
 * covers the spend: an unlimited permit would overwrite a newer, smaller approval.
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
  const calls = permits.flatMap((permit) => {
    const allowanceCall = {
      target: permit.token as Address,
      allowFailure: true,
      callData: encodeFunctionData({
        abi: abis.ERC20,
        functionName: "allowance",
        args: [permit.owner as Address, permit.spender as Address],
      }),
    };

    return [
      allowanceCall,
      {
        target: permit.token as Address,
        allowFailure: true,
        callData: encodeFunctionData({
          abi: abis.ERC20PermitInterface,
          functionName: "nonces",
          args: [permit.owner as Address],
        }),
      },
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
      allowanceCall,
    ];
  });

  const { data } = await client.call({
    to: MULTICALL3_ADDRESS,
    data: encodeFunctionData({ abi: abis.Multicall, functionName: "aggregate3", args: [calls] }),
  });

  if (!data) {
    throw new Error("Empty token permits check response");
  }

  const results = decodeFunctionResult({ abi: abis.Multicall, functionName: "aggregate3", data });

  const checkResult: TokenPermitsCheckResult = {
    validPermits: [],
    stalePermits: [],
    failedPermits: [],
    outdatedPermits: [],
  };

  const decodeAllowance = ({ success, returnData }: (typeof results)[number]) =>
    success
      ? (decodeFunctionResult({ abi: abis.ERC20, functionName: "allowance", data: returnData }) as bigint)
      : undefined;

  permits.forEach((permit, index) => {
    const allowanceBefore = decodeAllowance(results[index * 4]);
    const nonceResult = results[index * 4 + 1];
    const permitResult = results[index * 4 + 2];
    const allowance = decodeAllowance(results[index * 4 + 3]);
    const nonce = nonceResult.success
      ? decodeFunctionResult({ abi: abis.ERC20PermitInterface, functionName: "nonces", data: nonceResult.returnData })
      : undefined;

    const requiredAmount =
      Object.entries(requiredAmounts).find(([tokenAddress]) =>
        isAddressEqual(tokenAddress as Address, permit.token as Address)
      )?.[1] ?? 0n;

    if (allowanceBefore !== undefined && allowanceBefore >= requiredAmount) {
      checkResult.stalePermits.push(permit);
    } else if (!permitResult.success && nonce !== undefined && nonce > BigInt(permit.onchainParams.nonce)) {
      checkResult.outdatedPermits.push(permit);
    } else if (allowance === undefined || allowance < requiredAmount) {
      checkResult.failedPermits.push(permit);
    } else if (permitResult.success) {
      checkResult.validPermits.push(permit);
    } else {
      checkResult.stalePermits.push(permit);
    }
  });

  return checkResult;
}
