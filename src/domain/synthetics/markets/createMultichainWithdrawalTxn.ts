import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import type { TransferRequests } from "domain/multichain/types";
import { ExpressTxnData, ExpressTxnResult, sendExpressTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

import type { CreateWithdrawalParams } from ".";
import type { ExpressTxnParams, RelayParamsPayload } from "../express";
import { signCreateWithdrawal } from "./signCreateWithdrawal";

type TxnParams = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  relayParams: RelayParamsPayload;
  account: string;
  transferRequests: TransferRequests;
  params: CreateWithdrawalParams;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
} & (
  | {
      signer?: undefined;
      emptySignature: true;
    }
  | {
      signer: WalletSigner;
      emptySignature?: false;
    }
);

export async function buildAndSignMultichainWithdrawalTxn({
  chainId,
  srcChainId,
  signer,
  relayParams,
  account,
  transferRequests,
  params,
  emptySignature,
  relayerFeeTokenAddress,
  relayerFeeAmount,
}: TxnParams): Promise<ExpressTxnData> {
  let signature: string;

  if (emptySignature) {
    signature = "0x";
  } else {
    if (!signer) {
      throw new Error("Signer is required when emptySignature is false");
    }
    signature = await signCreateWithdrawal({
      chainId,
      srcChainId,
      signer,
      relayParams,
      transferRequests,
      params,
    });
  }

  const withdrawalData = encodeFunctionData({
    abi: abis.MultichainGmRouter,
    functionName: "createWithdrawal",
    args: [
      {
        ...relayParams,
        signature,
      },
      account,
      BigInt(srcChainId ?? chainId),
      transferRequests,
      params,
    ],
  });

  return {
    callData: withdrawalData,
    to: getContract(chainId, "MultichainGmRouter"),
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

export async function createMultichainWithdrawalTxn({
  chainId,
  srcChainId,
  signer,
  transferRequests,
  expressTxnParams: expressTxnParams,
  params,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  transferRequests: TransferRequests;
  expressTxnParams: ExpressTxnParams;
  params: CreateWithdrawalParams;
}): Promise<ExpressTxnResult> {
  const txnData = await buildAndSignMultichainWithdrawalTxn({
    chainId,
    srcChainId,
    signer,
    account: params.addresses.receiver,
    relayerFeeAmount: expressTxnParams.gasPaymentParams.relayerFeeAmount,
    relayerFeeTokenAddress: expressTxnParams.gasPaymentParams.relayerFeeTokenAddress,
    relayParams: {
      ...expressTxnParams.relayParamsPayload,
      deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
    },
    transferRequests,
    params,
  });

  return await sendExpressTransaction({
    chainId,
    isSponsoredCall: expressTxnParams.isSponsoredCall,
    txnData,
  });
}
