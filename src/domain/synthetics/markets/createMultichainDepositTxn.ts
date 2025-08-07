import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions";
import { AsyncResult } from "lib/useThrottledAsync";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";
import type { IRelayUtils, MultichainGmRouter } from "typechain-types/MultichainGmRouter";

import { CreateDepositParamsStruct } from ".";
import { ExpressTxnParams, RelayParamsPayload } from "../express";
import { signCreateDeposit } from "./signCreateDeposit";

export type CreateMultichainDepositParams = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  emptySignature?: boolean;
  account: string;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: CreateDepositParamsStruct;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
};

export async function buildAndSignMultichainDepositTxn({
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
}: CreateMultichainDepositParams): Promise<ExpressTxnData> {
  let signature: string;

  if (emptySignature) {
    signature = "0x";
  } else {
    signature = await signCreateDeposit({
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
    functionName: "createDeposit",
    args: [
      {
        ...relayParams,
        signature,
      },
      account,
      srcChainId ?? chainId,
      transferRequests,
      params,
    ] satisfies Parameters<MultichainGmRouter["createDeposit"]>,
  });

  return {
    callData: depositData,
    to: getContract(chainId, "MultichainGmRouter"),
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

export function createMultichainDepositTxn({
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
  params: CreateDepositParamsStruct;
  // TODO MLTCH: support pending txns
  // setPendingTxns,
  // setPendingDeposit,
}) {
  if (!asyncExpressTxnResult.data) {
    throw new Error("Async result is not set");
  }

  return buildAndSignMultichainDepositTxn({
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
