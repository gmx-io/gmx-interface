import { t } from "@lingui/macro";
import { encodeFunctionData } from "viem";

import type { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { sendQuoteFromNative } from "domain/multichain/sendQuoteFromNative";
import type { SendParam, TransferRequests } from "domain/multichain/types";
import type { GlobalExpressParams, RelayParamsPayload } from "domain/synthetics/express";
import type { CreateGlvWithdrawalParams, RawCreateGlvWithdrawalParams } from "domain/synthetics/markets";
import { sendWalletTransaction, WalletTxnResult } from "lib/transactions";
import type { ISigner } from "lib/transactions/iSigner";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";

import {
  estimateSourceChainGlvWithdrawalFees,
  SourceChainGlvWithdrawalFees,
} from "./feeEstimation/estimateSourceChainGlvWithdrawalFees";
import { signCreateGlvWithdrawal } from "./signCreateGlvWithdrawal";

export async function createSourceChainGlvWithdrawalTxn({
  chainId,
  srcChainId,
  signer,
  transferRequests,
  params,
  tokenAmount,
  globalExpressParams,
  marketsCount,
  outputLongTokenAddress,
  outputShortTokenAddress,
  fees,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  signer: WalletSigner | ISigner;
  transferRequests: TransferRequests;
  params: RawCreateGlvWithdrawalParams;
  tokenAmount: bigint;
} & (
  | {
      fees: SourceChainGlvWithdrawalFees;
      outputLongTokenAddress?: undefined;
      outputShortTokenAddress?: undefined;
      globalExpressParams?: undefined;
      marketsCount?: undefined;
    }
  | {
      fees?: undefined;
      outputLongTokenAddress: string;
      outputShortTokenAddress: string;
      globalExpressParams: GlobalExpressParams;
      marketsCount: bigint;
    }
)): Promise<WalletTxnResult> {
  const account = params.addresses.receiver;
  const glvTokenAddress = params.addresses.glv;

  const ensuredFees = fees
    ? fees
    : await estimateSourceChainGlvWithdrawalFees({
        chainId,
        srcChainId,
        params,
        tokenAmount,
        globalExpressParams,
        marketsCount,
        tokenAddress: glvTokenAddress,
        outputLongTokenAddress,
        outputShortTokenAddress,
      });

  const adjusterParams: CreateGlvWithdrawalParams = { ...params, executionFee: ensuredFees.executionFee };
  const relayParams: RelayParamsPayload = ensuredFees.relayParamsPayload;

  const signature = await signCreateGlvWithdrawal({
    chainId,
    srcChainId,
    signer,
    relayParams,
    transferRequests,
    params: adjusterParams,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.GlvWithdrawal,
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

  const sourceChainTokenId = getMappedTokenId(chainId, glvTokenAddress, srcChainId);

  if (!sourceChainTokenId) {
    throw new Error("Token ID not found");
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
    value: ensuredFees.txnEstimatedNativeFee,
    msg: t`Sent withdrawal transaction`,
  });

  return txnResult;
}
