import { encodeAbiParameters, keccak256, zeroHash } from "viem";

export function hashSubaccountApproval(approval: Record<string, any>): string {
  if (!approval || !approval.subaccount) {
    return zeroHash;
  }

  const encodedData = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
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
        ],
      },
    ],
    [approval as any]
  );

  return keccak256(encodedData);
}
