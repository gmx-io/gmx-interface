import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { TransferRequests } from "domain/multichain/types";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

import { CreateWithdrawalParamsStruct } from ".";
import { ExpressTxnParams, RelayParamsPayload } from "../express";
import { signCreateWithdrawal } from "./signCreateWithdrawal";

type TxnParams = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  emptySignature?: boolean;
  account: string;
  transferRequests: TransferRequests;
  params: CreateWithdrawalParamsStruct;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
};

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
    signature = await signCreateWithdrawal({
      chainId,
      srcChainId,
      signer,
      relayParams,
      transferRequests,
      params,
    });
  }

  const depositData = encodeFunctionData({
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
    callData: depositData,
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
  params: CreateWithdrawalParamsStruct;
  // TODO MLTCH: support pending txns
  // setPendingTxns,
  // setPendingDeposit,
}): Promise<void> {
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

  await sendExpressTransaction({
    chainId,
    // TODO MLTCH: pass true when we can
    isSponsoredCall: false,
    txnData,
  });
}
