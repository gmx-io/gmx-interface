import { encodeFunctionData } from "viem";

import { abis } from "abis";
import type { ContractsChainId, SourceChainId } from "configs/chains";
import { getContract } from "configs/contracts";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "configs/express";
import type { IAbstractSigner } from "utils/signer";
import { nowInSeconds } from "utils/time";

import { getGelatoRelayRouterDomain, hashRelayParams } from "./relayParamsUtils";
import type { ExpressTxnData, RawRelayParamsPayload, RelayParamsPayload } from "../types";

export type BridgeOutParams = {
  token: string;
  amount: bigint;
  minAmountOut: bigint;
  provider: string;
  data: string;
};

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
    abi: abis.MultichainTransferRouter,
    functionName: "bridgeOut",
    args: [
      {
        ...relayParams,
        signature,
      },
      account,
      BigInt(srcChainId),
      params,
    ],
  });

  return {
    callData: bridgeOutCallData,
    to: getContract(chainId, "MultichainTransferRouter"),
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
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
  const types = {
    BridgeOut: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "provider", type: "address" },
      { name: "data", type: "bytes" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const typedData = {
    token: params.token,
    amount: params.amount,
    minAmountOut: params.minAmountOut,
    provider: params.provider,
    data: params.data,
    relayParams: hashRelayParams(relayParams),
  };

  const domain = getGelatoRelayRouterDomain(srcChainId, getContract(chainId, "MultichainTransferRouter"));

  return signer.signTypedData(domain, types, typedData);
}
