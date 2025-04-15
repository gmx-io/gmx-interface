import { encodeAbiParameters, keccak256 } from "viem";

import { abis } from "sdk/abis";
import RelayParamsAbi from "sdk/abis/RelayParams.json";
import { getContract } from "sdk/configs/contracts";
import { MultichainRelayParamsPayload, RelayParamsPayload } from "sdk/types/expressTransactions";

export function getGelatoRelayRouterDomain(
  chainId: number,
  isSubaccount: boolean,
  srcChainId?: number
): {
  name: string;
  chainId: bigint;
  verifyingContract: string;
  version: string;
} {
  let name: string;
  if (srcChainId) {
    name = "GmxBaseGelatoRelayRouter";
  } else if (isSubaccount) {
    name = "GmxBaseSubaccountGelatoRelayRouter";
  } else {
    name = "GmxBaseGelatoRelayRouter";
  }

  let domainChainId: bigint;
  if (srcChainId) {
    domainChainId = BigInt(srcChainId);
  } else {
    domainChainId = BigInt(chainId);
  }

  let verifyingContract: string;
  if (srcChainId) {
    verifyingContract = getContract(chainId, "MultichainTransferRouter");
  } else if (isSubaccount) {
    verifyingContract = getContract(chainId, "SubaccountGelatoRelayRouter");
  } else {
    verifyingContract = getContract(chainId, "GelatoRelayRouter");
  }

  return {
    name,
    version: "1",
    chainId: domainChainId,
    verifyingContract,
  };
}

export function hashRelayParams(relayParams: RelayParamsPayload) {
  const encoded = encodeAbiParameters(RelayParamsAbi.abi, [
    [relayParams.oracleParams.tokens, relayParams.oracleParams.providers, relayParams.oracleParams.data],
    [
      relayParams.externalCalls.sendTokens,
      relayParams.externalCalls.sendAmounts,
      relayParams.externalCalls.externalCallTargets,
      relayParams.externalCalls.externalCallDataList,
      relayParams.externalCalls.refundTokens,
      relayParams.externalCalls.refundReceivers,
    ],
    relayParams.tokenPermits,
    [relayParams.fee.feeToken, relayParams.fee.feeAmount, relayParams.fee.feeSwapPath],
    relayParams.userNonce,
    relayParams.deadline,
  ]);

  const hash = keccak256(encoded);

  return hash;
}

export function hashRelayParamsMultichain(relayParams: MultichainRelayParamsPayload) {
  const encoded = encodeAbiParameters(abis.RelayParamsArbitrumSepolia, [
    [relayParams.oracleParams.tokens, relayParams.oracleParams.providers, relayParams.oracleParams.data],
    [
      relayParams.externalCalls.externalCallTargets,
      relayParams.externalCalls.externalCallDataList,
      relayParams.externalCalls.refundTokens,
      relayParams.externalCalls.refundReceivers,
    ],
    relayParams.tokenPermits,
    [relayParams.fee.feeToken, relayParams.fee.feeAmount, relayParams.fee.feeSwapPath],
    relayParams.userNonce,
    relayParams.deadline,
    relayParams.desChainId,
  ]);

  const hash = keccak256(encoded);

  return hash;
}
