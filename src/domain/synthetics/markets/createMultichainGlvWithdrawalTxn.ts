import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { TransferRequests } from "domain/multichain/types";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

import type { ExpressTxnParams, RelayParamsPayload } from "../express";
import { signCreateGlvWithdrawal } from "./signCreateGlvWithdrawal";
import type { CreateGlvWithdrawalParams } from "./types";

type TxnParams = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  emptySignature?: boolean;
  account: string;
  transferRequests: TransferRequests;
  params: CreateGlvWithdrawalParams;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
};

export async function buildAndSignMultichainGlvWithdrawalTxn({
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
    signature = await signCreateGlvWithdrawal({
      chainId,
      srcChainId,
      signer,
      relayParams,
      transferRequests,
      params,
    });
  }

  const depositData = encodeFunctionData({
    abi: abis.MultichainGlvRouter,
    functionName: "createGlvWithdrawal",
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
    callData: depositData,
    to: getContract(chainId, "MultichainGlvRouter"),
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

export async function createMultichainGlvWithdrawalTxn({
  chainId,
  srcChainId,
  signer,
  transferRequests,
  expressTxnParams,
  params,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  transferRequests: TransferRequests;
  expressTxnParams: ExpressTxnParams;
  params: CreateGlvWithdrawalParams;
  // TODO MLTCH: support pending txns
  // setPendingTxns,
  // setPendingDeposit,
}): Promise<void> {
  const txnData = await buildAndSignMultichainGlvWithdrawalTxn({
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

  await sendExpressTransaction({
    chainId,
    isSponsoredCall: expressTxnParams.isSponsoredCall,
    txnData,
  });
}
