import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { OrderMetricId, makeTxnErrorMetricsHandler, makeTxnSentMetricsHandler } from "lib/metrics";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions";
import { makeUserAnalyticsOrderFailResultHandler } from "lib/userAnalytics";
import { AsyncResult } from "lib/useThrottledAsync";
import type { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";
import type { IDepositUtils } from "typechain-types/ExchangeRouter";
import type { IRelayUtils, MultichainGmRouter } from "typechain-types/MultichainGmRouter";

import { CreateDepositParamsStruct } from ".";
import { ExpressTxnParams, RelayParamsPayload, getGelatoRelayRouterDomain, hashRelayParams } from "../express";

export type CreateMultichainDepositParams = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  emptySignature?: boolean;
  account: string;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: IDepositUtils.CreateDepositParamsStruct;
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
    signature = await signMultichainDepositPayload({
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
      srcChainId,
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

function signMultichainDepositPayload({
  chainId,
  srcChainId,
  signer,
  relayParams,
  transferRequests,
  params,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: IDepositUtils.CreateDepositParamsStruct;
}) {
  const types = {
    CreateDeposit: [
      { name: "transferTokens", type: "address[]" },
      { name: "transferReceivers", type: "address[]" },
      { name: "transferAmounts", type: "uint256[]" },
      { name: "addresses", type: "CreateDepositAddresses" },
      { name: "minMarketTokens", type: "uint256" },
      { name: "shouldUnwrapNativeToken", type: "bool" },
      { name: "executionFee", type: "uint256" },
      { name: "callbackGasLimit", type: "uint256" },
      { name: "dataList", type: "bytes32[]" },
      { name: "relayParams", type: "bytes32" },
    ],
    CreateDepositAddresses: [
      { name: "receiver", type: "address" },
      { name: "callbackContract", type: "address" },
      { name: "uiFeeReceiver", type: "address" },
      { name: "market", type: "address" },
      { name: "initialLongToken", type: "address" },
      { name: "initialShortToken", type: "address" },
      { name: "longTokenSwapPath", type: "address[]" },
      { name: "shortTokenSwapPath", type: "address[]" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId, getContract(chainId, "MultichainGmRouter"));
  const typedData = {
    transferTokens: transferRequests.tokens,
    transferReceivers: transferRequests.receivers,
    transferAmounts: transferRequests.amounts,
    addresses: params.addresses,
    minMarketTokens: params.minMarketTokens,
    shouldUnwrapNativeToken: params.shouldUnwrapNativeToken,
    executionFee: params.executionFee,
    callbackGasLimit: params.callbackGasLimit,
    dataList: params.dataList,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData({ signer, domain, types, typedData });
}
export function createMultichainDepositTxn({
  chainId,
  srcChainId,
  signer,
  transferRequests,
  asyncExpressTxnResult,
  isGlv,
  params,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  asyncExpressTxnResult: AsyncResult<ExpressTxnParams | undefined>;
  params: CreateDepositParamsStruct;
  // TODO MLTCH: support GLV
  isGlv: boolean;
  // TODO MLTCH: support pending txns
  // setPendingTxns,
  // setPendingDeposit,
}) {
  if (isGlv) {
    throw new Error("Not implemented");
  }

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
