import { zeroHash } from "viem";

import type { ContractsChainId } from "configs/chains";
import { isContractsV2_2_1 } from "configs/contracts";
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

export const SUBACCOUNT_APPROVAL_TYPES: SubaccountApprovalTypedData["types"] = {
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

export const SUBACCOUNT_APPROVAL_TYPES_V2_2_1: SubaccountApprovalTypedData["types"] = {
  SubaccountApproval: [
    { name: "account", type: "address" },
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
  ],
};

export function getSubaccountApprovalTypedData(params: {
  chainId: ContractsChainId;
  subaccountAddress: string;
  shouldAdd: boolean;
  expiresAt: bigint;
  maxAllowedCount: bigint;
  nonce: bigint;
  account: string;
  revocationCounter: bigint;
  signingChainId?: number;
}): SubaccountApprovalTypedData {
  const {
    chainId,
    subaccountAddress,
    shouldAdd,
    expiresAt,
    maxAllowedCount,
    nonce,
    account,
    revocationCounter,
    signingChainId,
  } = params;
  const isV2_2_1 = isContractsV2_2_1(chainId);

  const relayRouterAddress = getExpressContractAddress(chainId, {
    isSubaccount: true,
    isMultichain: false,
    scope: "subaccount",
  });

  const domain = getGelatoRelayRouterDomain((signingChainId ?? chainId) as ContractsChainId, relayRouterAddress);

  const types = isV2_2_1 ? SUBACCOUNT_APPROVAL_TYPES_V2_2_1 : SUBACCOUNT_APPROVAL_TYPES;

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
    ...(isV2_2_1
      ? { account, revocationCounter: revocationCounter.toString(), eip6492SignatureWrapperHash: zeroHash }
      : {}),
  };

  return {
    domain,
    types,
    message,
    primaryType: "SubaccountApproval",
  };
}
