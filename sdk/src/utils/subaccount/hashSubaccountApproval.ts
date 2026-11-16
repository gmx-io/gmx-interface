import { encodeAbiParameters, keccak256, zeroHash } from "viem";

import type { ContractsChainId } from "configs/chains";
import { isContractsV2_2_1 } from "configs/contracts";

const SUBACCOUNT_APPROVAL_COMPONENTS = [
  { name: "subaccount", type: "address" },
  { name: "shouldAdd", type: "bool" },
  { name: "expiresAt", type: "uint256" },
  { name: "maxAllowedCount", type: "uint256" },
  { name: "actionType", type: "bytes32" },
  { name: "nonce", type: "uint256" },
  { name: "desChainId", type: "uint256" },
  { name: "deadline", type: "uint256" },
  { name: "integrationId", type: "bytes32" },
  { name: "signature", type: "bytes" },
] as const;

const SUBACCOUNT_APPROVAL_COMPONENTS_V2_2_1 = [
  { name: "subaccount", type: "address" },
  { name: "shouldAdd", type: "bool" },
  { name: "expiresAt", type: "uint256" },
  { name: "maxAllowedCount", type: "uint256" },
  { name: "actionType", type: "bytes32" },
  { name: "nonce", type: "uint256" },
  { name: "desChainId", type: "uint256" },
  { name: "deadline", type: "uint256" },
  { name: "integrationId", type: "bytes32" },
  { name: "revocationCounter", type: "uint256" },
  { name: "eip6492SignatureWrapperHash", type: "bytes32" },
  { name: "signature", type: "bytes" },
] as const;

export function hashSubaccountApproval(chainId: ContractsChainId, approval: Record<string, any>): string {
  if (!approval || !approval.subaccount) {
    return zeroHash;
  }

  const components = isContractsV2_2_1(chainId)
    ? SUBACCOUNT_APPROVAL_COMPONENTS_V2_2_1
    : SUBACCOUNT_APPROVAL_COMPONENTS;

  const encodedData = encodeAbiParameters([{ type: "tuple", components }], [approval as any]);

  return keccak256(encodedData);
}
