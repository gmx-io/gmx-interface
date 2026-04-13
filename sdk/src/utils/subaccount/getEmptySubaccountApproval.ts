import { zeroHash } from "viem";
import { SUBACCOUNT_ORDER_ACTION } from "configs/dataStore";
import type { ContractsChainId } from "configs/chains";
import type { SubaccountApproval } from "./types";

/**
 * Returns a subaccount approval with zeroed-out fields.
 * Used as a placeholder for gas estimation when no real approval is available.
 */
export function getEmptySubaccountApproval(
  chainId: ContractsChainId,
  subaccountAddress: string
): SubaccountApproval & { signature: string } {
  return {
    subaccount: subaccountAddress,
    shouldAdd: true,
    expiresAt: 0n,
    maxAllowedCount: 0n,
    actionType: SUBACCOUNT_ORDER_ACTION,
    nonce: 0n,
    desChainId: BigInt(chainId),
    deadline: 0n,
    integrationId: zeroHash,
    signature: "0x",
  };
}
