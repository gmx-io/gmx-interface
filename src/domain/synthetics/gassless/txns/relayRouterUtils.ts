import { AbiCoder, Contract, keccak256 } from "ethers";
import { TokenPermitPayload } from "./tokenPermitUtils";

const coder = AbiCoder.defaultAbiCoder();

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

export async function getRelayParams(p: {
  oracleParams?: any;
  tokenPermits?: any;
  externalCalls?: any;
  feeParams: any;
  userNonce?: bigint;
  deadline: bigint;
  relayRouter: Contract;
  account: string;
}) {
  // Define default values for optional parameters
  const oracleParams = p.oracleParams;
  const tokenPermits = p.tokenPermits || [];
  const externalCalls = p.externalCalls || {
    externalCallTargets: [],
    externalCallDataList: [],
    refundTokens: [],
    refundReceivers: [],
  };

  // Get user nonce if not provided
  let userNonce = p.userNonce;
  if (userNonce === undefined) {
    const nonceValue = await p.relayRouter.userNonces(p.account);
    userNonce = BigInt(nonceValue.toString());
    console.log(`Fetched user nonce for ${p.account}: ${userNonce}`);
  } else {
    userNonce = BigInt(userNonce.toString());
  }

  // Ensure deadline is a BigInt
  const deadline = BigInt(p.deadline.toString());

  // Format fee params
  const feeParams = {
    feeToken: p.feeParams.feeToken,
    feeAmount: BigInt(p.feeParams.feeAmount.toString()),
    feeSwapPath: p.feeParams.feeSwapPath || [],
  };

  return {
    oracleParams,
    tokenPermits,
    externalCalls,
    fee: feeParams,
    userNonce,
    deadline,
  };
}

export function hashRelayParams(relayParams: RelayParamsPayload) {
  const encoded = coder.encode(
    [
      "tuple(address[] tokens, address[] providers, bytes[] data)",
      "tuple(address[] externalCallTargets, bytes[] externalCallDataList, address[] refundTokens, address[] refundReceivers)",
      "tuple(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s, address token)[]",
      "tuple(address feeToken, uint256 feeAmount, address[] feeSwapPath)",
      "uint256",
      "uint256",
    ],
    [
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
    ]
  );

  const hash = keccak256(encoded);

  return hash;
}
