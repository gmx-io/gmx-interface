import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions";
import { AsyncResult } from "lib/useThrottledAsync";
import type { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";
import { MultichainGlvRouter } from "typechain-types/MultichainGlvRouter";
import type { IRelayUtils } from "typechain-types/MultichainGmRouter";

import { CreateGlvDepositParamsStruct } from ".";
import { ExpressTxnParams, RelayParamsPayload, getGelatoRelayRouterDomain, hashRelayParams } from "../express";

export type CreateMultichainGlvDepositParams = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
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
    signature = await signMultichainGlvDepositPayload({
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
      srcChainId,
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

function signMultichainGlvDepositPayload({
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
  params: CreateGlvDepositParamsStruct;
}) {
  const types = {
    CreateGlvDeposit: [
      { name: "transferTokens", type: "address[]" },
      { name: "transferReceivers", type: "address[]" },
      { name: "transferAmounts", type: "uint256[]" },
      { name: "addresses", type: "CreateGlvDepositAddresses" },
      { name: "minGlvTokens", type: "uint256" },
      { name: "executionFee", type: "uint256" },
      { name: "callbackGasLimit", type: "uint256" },
      { name: "shouldUnwrapNativeToken", type: "bool" },
      { name: "isMarketTokenDeposit", type: "bool" },
      { name: "dataList", type: "bytes32[]" },
      { name: "relayParams", type: "bytes32" },
    ],
    CreateGlvDepositAddresses: [
      { name: "glv", type: "address" },
      { name: "market", type: "address" },
      { name: "receiver", type: "address" },
      { name: "callbackContract", type: "address" },
      { name: "uiFeeReceiver", type: "address" },
      { name: "initialLongToken", type: "address" },
      { name: "initialShortToken", type: "address" },
      { name: "longTokenSwapPath", type: "address[]" },
      { name: "shortTokenSwapPath", type: "address[]" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId, getContract(chainId, "MultichainGlvRouter"));
  const typedData = {
    transferTokens: transferRequests.tokens,
    transferReceivers: transferRequests.receivers,
    transferAmounts: transferRequests.amounts,
    addresses: params.addresses,
    minGlvTokens: params.minGlvTokens,
    executionFee: params.executionFee,
    callbackGasLimit: params.callbackGasLimit,
    shouldUnwrapNativeToken: params.shouldUnwrapNativeToken,
    isMarketTokenDeposit: params.isMarketTokenDeposit,
    dataList: params.dataList,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData({ signer, domain, types, typedData });
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
  srcChainId: SourceChainId;
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
