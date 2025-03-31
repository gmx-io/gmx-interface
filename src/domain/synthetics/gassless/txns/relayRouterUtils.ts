import { encodeAbiParameters, keccak256 } from "viem";

import RelayParamsAbi from "sdk/abis/RelayParams.json";

import { TokenPermitPayload } from "./tokenPermitUtils";

export type RelayParamsPayload = {
  oracleParams: OracleParamsPayload;
  tokenPermits: TokenPermitPayload[];
  externalCalls: ExternalCallsPayload;
  fee: RelayFeeParamsPayload;
  // TODO: request in hook
  userNonce: bigint;
  deadline: bigint;
};

export type OracleParamsPayload = {
  tokens: string[];
  providers: string[];
  data: string[];
};

export type RelayFeeParamsPayload = {
  feeToken: string;
  feeAmount: bigint;
  feeSwapPath: string[];
};

export type ExternalCallsPayload = {
  externalCallTargets: string[];
  externalCallDataList: string[];
  refundTokens: string[];
  refundReceivers: string[];
};

export function getGelatoRelayRouterDomain(chainId: number, verifyingContract: string) {
  return {
    name: "GmxBaseGelatoRelayRouter",
    version: "1",
    chainId: BigInt(chainId),
    verifyingContract,
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
