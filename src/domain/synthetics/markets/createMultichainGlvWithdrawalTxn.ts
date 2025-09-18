import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";
import { MultichainGlvRouter } from "typechain-types/MultichainGlvRouter";
import type { IRelayUtils } from "typechain-types/MultichainGmRouter";

import type { ExpressTxnParams, RelayParamsPayload } from "../express";
import { signCreateGlvWithdrawal } from "./signCreateGlvWithdrawal";
import type { CreateGlvWithdrawalParamsStruct } from "./types";

type TxnParams = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  emptySignature?: boolean;
  account: string;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: CreateGlvWithdrawalParamsStruct;
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
      srcChainId ?? chainId,
      transferRequests,
      params,
    ] satisfies Parameters<MultichainGlvRouter["createGlvWithdrawal"]>,
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
  expressTxnParams: expressTxnParams,
  params,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  expressTxnParams: ExpressTxnParams;
  params: CreateGlvWithdrawalParamsStruct;
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
    // TODO MLTCH: pass true when we can
    isSponsoredCall: false,
    txnData,
  });
}
