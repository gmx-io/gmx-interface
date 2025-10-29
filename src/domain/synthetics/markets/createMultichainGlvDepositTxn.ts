import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { TransferRequests } from "domain/multichain/types";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

import { CreateGlvDepositParams } from ".";
import { ExpressTxnParams, RelayParamsPayload } from "../express";
import { signCreateGlvDeposit } from "./signCreateGlvDeposit";

export type CreateMultichainGlvDepositParams = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  emptySignature?: boolean;
  account: string;
  transferRequests: TransferRequests;
  params: CreateGlvDepositParams;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
};

export async function buildAndSignMultichainGlvDepositTxn({
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
}: CreateMultichainGlvDepositParams): Promise<ExpressTxnData> {
  let signature: string;

  if (emptySignature) {
    signature = "0x";
  } else {
    signature = await signCreateGlvDeposit({
      chainId,
      srcChainId,
      signer,
      relayParams,
      transferRequests,
      params,
    });
  }

  const glvDepositData = encodeFunctionData({
    abi: abis.MultichainGlvRouter,
    functionName: "createGlvDeposit",
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
    callData: glvDepositData,
    to: getContract(chainId, "MultichainGlvRouter"),
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

export function createMultichainGlvDepositTxn({
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
  params: CreateGlvDepositParams;
  // TODO MLTCH: support pending txns
  // setPendingTxns,
  // setPendingDeposit,
}) {
  return buildAndSignMultichainGlvDepositTxn({
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
  }).then(async (txnData: ExpressTxnData) => {
    await sendExpressTransaction({
      chainId,
      // TODO MLTCH: pass true when we can
      isSponsoredCall: false,
      txnData,
    });
  });
  // .then(makeTxnSentMetricsHandler(metricId))
  // .catch(makeTxnErrorMetricsHandler(metricId))
  // .catch(makeUserAnalyticsOrderFailResultHandler(chainId, metricId));
}
