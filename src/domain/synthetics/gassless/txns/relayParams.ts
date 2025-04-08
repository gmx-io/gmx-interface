import { encodeAbiParameters, keccak256 } from "viem";

import RelayParamsAbi from "sdk/abis/RelayParams.json";
import { RelayParamsPayload } from "sdk/types/expressTransactions";

import { getContract } from "sdk/configs/contracts";

export function getGelatoRelayRouterDomain(chainId: number, isSubaccount: boolean) {
  return {
    name: isSubaccount ? "GmxBaseSubaccountGelatoRelayRouter" : "GmxBaseGelatoRelayRouter",
    version: "1",
    chainId: BigInt(chainId),
    verifyingContract: getContract(chainId, isSubaccount ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"),
  };
}

export function hashRelayParams(relayParams: RelayParamsPayload) {
  const encoded = encodeAbiParameters(RelayParamsAbi.abi, [
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
  ]);

  const hash = keccak256(encoded);

  return hash;
}
