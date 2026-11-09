import { encodeFunctionData } from "viem";

import { getAbi } from "abis/getAbi";
import type { ContractsChainId, SourceChainId } from "configs/chains";
import { getContract, isContractsV2_2_1 } from "configs/contracts";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "configs/express";
import { type BridgeOutParams, getEmptyBridgeFeeParams } from "utils/multichain/api";
import type { IAbstractSigner } from "utils/signer";
import { nowInSeconds } from "utils/time";

import { getGelatoRelayRouterDomain, hashRelayParams } from "./relayParamsUtils";
import type { ExpressTxnData, RawRelayParamsPayload, RelayParamsPayload } from "../types";

export type { BridgeOutParams };

export async function buildAndSignBridgeOutTxn({
  chainId,
  srcChainId,
  relayParamsPayload,
  params,
  signer,
  account,
  emptySignature = false,
  relayerFeeTokenAddress,
  relayerFeeAmount,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
  relayParamsPayload: RawRelayParamsPayload;
  params: BridgeOutParams;
  signer: IAbstractSigner | undefined;
  account: string;
  emptySignature?: boolean;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
}): Promise<ExpressTxnData> {
  let signature: string;

  const relayParams: RelayParamsPayload = {
    ...relayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  if (emptySignature) {
    signature = "0x";
  } else {
    if (!signer) {
      throw new Error("Signer is required");
    }

    signature = await signBridgeOutPayload({
      relayParams,
      params,
      signer,
      chainId,
      srcChainId,
    });
  }

  const bridgeOutCallData = encodeFunctionData({
    abi: getAbi(chainId, "MultichainTransferRouter"),
    functionName: "bridgeOut",
    args: [
      {
        ...relayParams,
        signature,
      },
      account,
      BigInt(srcChainId),
      { ...params, bridgeFee: params.bridgeFee ?? getEmptyBridgeFeeParams() },
    ],
  });

  return {
    callData: bridgeOutCallData,
    to: getContract(chainId, "MultichainTransferRouter"),
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

const BRIDGE_OUT_TYPES: { BridgeOut: { name: string; type: string }[] } = {
  BridgeOut: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "minAmountOut", type: "uint256" },
    { name: "provider", type: "address" },
    { name: "data", type: "bytes" },
    { name: "relayParams", type: "bytes32" },
  ],
};

const BRIDGE_OUT_TYPES_V2_2_1: typeof BRIDGE_OUT_TYPES = {
  BridgeOut: [
    { name: "account", type: "address" },
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "minAmountOut", type: "uint256" },
    { name: "provider", type: "address" },
    { name: "data", type: "bytes" },
    { name: "bridgeFeeToken", type: "address" },
    { name: "bridgeFeeAmount", type: "uint256" },
    { name: "bridgeFeeSwapPath", type: "address[]" },
    { name: "bridgeFeeMinOutputAmount", type: "uint256" },
    { name: "relayParams", type: "bytes32" },
  ],
};

export type BridgeOutTypedData = {
  domain: ReturnType<typeof getGelatoRelayRouterDomain>;
  types: typeof BRIDGE_OUT_TYPES;
  primaryType: "BridgeOut";
  message: {
    token: string;
    amount: bigint;
    minAmountOut: bigint;
    provider: string;
    data: string;
    relayParams: string;
    account?: string;
    bridgeFeeToken?: string;
    bridgeFeeAmount?: bigint;
    bridgeFeeSwapPath?: string[];
    bridgeFeeMinOutputAmount?: bigint;
  };
};

/**
 * EIP-712 typed-data describing a `MultichainTransferRouter.bridgeOut` call.
 * Single source of truth shared by SDK signing helpers and server-side prepare flows.
 */
export function getBridgeOutTypedData({
  chainId,
  srcChainId,
  params,
  relayParams,
  account,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
  params: BridgeOutParams;
  relayParams: RelayParamsPayload;
  account: string;
}): BridgeOutTypedData {
  const domain = getGelatoRelayRouterDomain(srcChainId, getContract(chainId, "MultichainTransferRouter"));
  const message = {
    token: params.token,
    amount: params.amount,
    minAmountOut: params.minAmountOut,
    provider: params.provider,
    data: params.data,
    relayParams: hashRelayParams(relayParams),
  };

  if (isContractsV2_2_1(chainId)) {
    const bridgeFee = params.bridgeFee ?? getEmptyBridgeFeeParams();

    return {
      domain,
      types: BRIDGE_OUT_TYPES_V2_2_1,
      primaryType: "BridgeOut",
      message: {
        ...message,
        account,
        bridgeFeeToken: bridgeFee.feeToken,
        bridgeFeeAmount: bridgeFee.feeAmount,
        bridgeFeeSwapPath: bridgeFee.feeSwapPath,
        bridgeFeeMinOutputAmount: bridgeFee.minOutputAmount,
      },
    };
  }

  return { domain, types: BRIDGE_OUT_TYPES, primaryType: "BridgeOut", message };
}

async function signBridgeOutPayload({
  signer,
  relayParams,
  params,
  chainId,
  srcChainId,
}: {
  signer: IAbstractSigner;
  relayParams: RelayParamsPayload;
  params: BridgeOutParams;
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
}): Promise<string> {
  const { domain, types, message } = getBridgeOutTypedData({
    chainId,
    srcChainId,
    params,
    relayParams,
    account: signer.address,
  });
  return signer.signTypedData(domain, types, message);
}
