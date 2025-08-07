import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions";
import { AsyncResult } from "lib/useThrottledAsync";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";
import { MultichainGlvRouter } from "typechain-types/MultichainGlvRouter";
import type { IRelayUtils } from "typechain-types/MultichainGmRouter";

import { CreateGlvDepositParamsStruct } from ".";
import { ExpressTxnParams, RelayParamsPayload } from "../express";
import { signCreateGlvDeposit } from "./signCreateGlvDeposit";

export type CreateMultichainGlvDepositParams = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  emptySignature?: boolean;
  account: string;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: CreateGlvDepositParamsStruct;
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

  const depositData = encodeFunctionData({
    abi: abis.MultichainGlvRouter,
    functionName: "createGlvDeposit",
    args: [
      {
        ...relayParams,
        signature,
      },
      account,
      srcChainId ?? chainId,
      transferRequests,
      params,
    ] satisfies Parameters<MultichainGlvRouter["createGlvDeposit"]>,
  });

  return {
    callData: depositData,
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
  asyncExpressTxnResult,
  params,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  asyncExpressTxnResult: AsyncResult<ExpressTxnParams | undefined>;
  params: CreateGlvDepositParamsStruct;
  // TODO MLTCH: support pending txns
  // setPendingTxns,
  // setPendingDeposit,
}) {
  if (!asyncExpressTxnResult.data) {
    throw new Error("Async result is not set");
  }

  return buildAndSignMultichainGlvDepositTxn({
    chainId,
    srcChainId,
    signer,
    account: params.addresses.receiver,
    relayerFeeAmount: asyncExpressTxnResult.data.gasPaymentParams.relayerFeeAmount,
    relayerFeeTokenAddress: asyncExpressTxnResult.data.gasPaymentParams.relayerFeeTokenAddress,
    relayParams: {
      ...asyncExpressTxnResult.data.relayParamsPayload,
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
