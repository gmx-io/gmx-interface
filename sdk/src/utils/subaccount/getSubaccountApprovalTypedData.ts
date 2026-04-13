import { zeroHash } from "viem";

import type { ContractsChainId } from "configs/chains";
import { SUBACCOUNT_ORDER_ACTION } from "configs/dataStore";
import { getExpressContractAddress, getGelatoRelayRouterDomain } from "utils/express";

export type SubaccountApprovalTypedData = {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: Record<string, { name: string; type: string }[]>;
  message: Record<string, any>;
  primaryType: string;
};

export function getSubaccountApprovalTypedData(params: {
  chainId: ContractsChainId;
  subaccountAddress: string;
  shouldAdd: boolean;
  expiresAt: bigint;
  maxAllowedCount: bigint;
  nonce: bigint;
  signingChainId?: number;
}): SubaccountApprovalTypedData {
  const { chainId, subaccountAddress, shouldAdd, expiresAt, maxAllowedCount, nonce, signingChainId } = params;

  const relayRouterAddress = getExpressContractAddress(chainId, {
    isSubaccount: true,
    isMultichain: false,
    scope: "subaccount",
  });

  const domain = getGelatoRelayRouterDomain((signingChainId ?? chainId) as ContractsChainId, relayRouterAddress);

  const types = {
    SubaccountApproval: [
      { name: "subaccount", type: "address" },
      { name: "shouldAdd", type: "bool" },
      { name: "expiresAt", type: "uint256" },
      { name: "maxAllowedCount", type: "uint256" },
      { name: "actionType", type: "bytes32" },
      { name: "nonce", type: "uint256" },
      { name: "desChainId", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "integrationId", type: "bytes32" },
    ],
  };

  const message = {
    subaccount: subaccountAddress,
    shouldAdd,
    expiresAt: expiresAt.toString(),
    maxAllowedCount: maxAllowedCount.toString(),
    actionType: SUBACCOUNT_ORDER_ACTION,
    nonce: nonce.toString(),
    desChainId: chainId.toString(),
    deadline: expiresAt.toString(),
    integrationId: zeroHash,
  };

  return {
    domain: {
      name: domain.name as string,
      version: domain.version as string,
      chainId: Number(domain.chainId),
      verifyingContract: domain.verifyingContract as string,
    },
    types,
    message,
    primaryType: "SubaccountApproval",
  };
}
