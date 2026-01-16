import { t } from "@lingui/macro";
import { encodeFunctionData, zeroAddress } from "viem";

import type { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { sendQuoteFromNative } from "domain/multichain/sendQuoteFromNative";
import type { SendParam, TransferRequests } from "domain/multichain/types";
import type { GlobalExpressParams, RelayParamsPayload } from "domain/synthetics/express";
import type { CreateWithdrawalParams, RawCreateWithdrawalParams } from "domain/synthetics/markets";
import { sendWalletTransaction, WalletTxnResult } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";

import {
  estimateSourceChainWithdrawalFees,
  SourceChainWithdrawalFees,
} from "./feeEstimation/estimateSourceChainWithdrawalFees";
import { signCreateWithdrawal } from "./signCreateWithdrawal";

export async function createSourceChainWithdrawalTxn({
  chainId,
  srcChainId,
  signer,
  transferRequests,
  params,
  tokenAmount,
  globalExpressParams,
  outputLongTokenAddress,
  outputShortTokenAddress,
  fees,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  transferRequests: TransferRequests;
  params: RawCreateWithdrawalParams;
  tokenAmount: bigint;
} & (
  | {
      fees: SourceChainWithdrawalFees;
      outputLongTokenAddress?: undefined;
      outputShortTokenAddress?: undefined;
      globalExpressParams?: undefined;
    }
  | {
      fees?: undefined;
      outputLongTokenAddress: string;
      outputShortTokenAddress: string;
      globalExpressParams: GlobalExpressParams;
    }
)): Promise<WalletTxnResult> {
  const account = params.addresses.receiver;
  const marketTokenAddress = params.addresses.market;

  const ensuredFees = fees
    ? fees
    : await estimateSourceChainWithdrawalFees({
        chainId,
        srcChainId,
        params,
        tokenAmount,
        globalExpressParams,
        outputLongTokenAddress,
        outputShortTokenAddress,
        tokenAddress: marketTokenAddress,
      });
  const adjusterParams: CreateWithdrawalParams = { ...params, executionFee: ensuredFees.executionFee };
  const relayParams: RelayParamsPayload = ensuredFees.relayParamsPayload;

  const signature = await signCreateWithdrawal({
    chainId,
    srcChainId,
    signer,
    relayParams,
    transferRequests,
    params: adjusterParams,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.Withdrawal,
    actionData: {
      relayParams,
      transferRequests,
      params: adjusterParams,
      signature,
    },
  };

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: chainId,
    account,
    srcChainId,
    amountLD: tokenAmount,
    composeGas: ensuredFees.txnEstimatedComposeGas,
    isToGmx: true,
    isManualGas: true,
    action,
    nativeDropAmount: relayParams.fee.feeAmount,
  });

  const sourceChainTokenId = getMappedTokenId(chainId, marketTokenAddress, srcChainId);

  if (!sourceChainTokenId) {
    throw new Error("Token ID not found");
  }

  let value = ensuredFees.txnEstimatedNativeFee;
  if (marketTokenAddress === zeroAddress) {
    value += tokenAmount;
  }

  const txnResult = await sendWalletTransaction({
    chainId: srcChainId!,
    to: sourceChainTokenId.stargate,
    signer,
    callData: encodeFunctionData({
      abi: abis.IStargate,
      functionName: "send",
      args: [sendParams, sendQuoteFromNative(ensuredFees.txnEstimatedNativeFee), account],
    }),
    value,
    msg: t`Sent withdrawal transaction`,
  });
  return txnResult;
}
