import { t } from "@lingui/macro";
import { encodeFunctionData, zeroAddress } from "viem";

import type { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { sendQuoteFromNative } from "domain/multichain/sendQuoteFromNative";
import { SendParam, TransferRequests } from "domain/multichain/types";
import { GlobalExpressParams } from "domain/synthetics/express";
import type { CreateGlvDepositParams, RawCreateGlvDepositParams } from "domain/synthetics/markets";
import { sendWalletTransaction, WalletTxnResult } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";

import {
  estimateSourceChainGlvDepositFees,
  SourceChainGlvDepositFees,
} from "./feeEstimation/estimateSourceChainGlvDepositFees";
import { signCreateGlvDeposit } from "./signCreateGlvDeposit";

export async function createSourceChainGlvDepositTxn({
  chainId,
  srcChainId,
  signer,
  transferRequests,
  params,
  tokenAddress,
  tokenAmount,
  glvMarketCount,
  globalExpressParams,
  fees,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  transferRequests: TransferRequests;
  params: RawCreateGlvDepositParams;
  tokenAddress: string;
  tokenAmount: bigint;
} & (
  | {
      fees: SourceChainGlvDepositFees;
      glvMarketCount?: undefined;
      globalExpressParams?: undefined;
    }
  | {
      fees?: undefined;
      glvMarketCount: bigint;
      globalExpressParams: GlobalExpressParams;
    }
)): Promise<WalletTxnResult> {
  const ensuredFees = fees
    ? fees
    : await estimateSourceChainGlvDepositFees({
        chainId,
        srcChainId,
        params,
        tokenAddress,
        tokenAmount,
        globalExpressParams,
        glvMarketCount,
      });

  const adjusterParams: CreateGlvDepositParams = { ...params, executionFee: ensuredFees.executionFee };

  const signature = await signCreateGlvDeposit({
    chainId,
    srcChainId,
    signer,
    relayParams: ensuredFees.relayParamsPayload,
    transferRequests,
    params: adjusterParams,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.GlvDeposit,
    actionData: {
      relayParams: ensuredFees.relayParamsPayload,
      transferRequests,
      params: adjusterParams,
      signature,
    },
  };

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: chainId,
    account: params.addresses.receiver,
    srcChainId,
    amountLD: tokenAmount,
    composeGas: ensuredFees.txnEstimatedComposeGas,
    isToGmx: true,
    isManualGas: params.isMarketTokenDeposit ? true : false,
    action,
  });

  const sourceChainTokenId = getMappedTokenId(chainId, tokenAddress, srcChainId);

  if (!sourceChainTokenId) {
    throw new Error("Token ID not found");
  }

  let value = ensuredFees.txnEstimatedNativeFee;
  if (tokenAddress === zeroAddress) {
    value += tokenAmount;
  }

  // try {
  const txnResult = await sendWalletTransaction({
    chainId: srcChainId!,
    to: sourceChainTokenId.stargate,
    signer,
    callData: encodeFunctionData({
      abi: abis.IStargate,
      functionName: params.isMarketTokenDeposit ? "send" : "sendToken",
      args: [sendParams, sendQuoteFromNative(ensuredFees.txnEstimatedNativeFee), params.addresses.receiver],
    }),
    value,
    msg: t`Sent deposit transaction`,
    gasLimit: ensuredFees.txnEstimatedGasLimit,
  });

  return txnResult;
  // } catch (error) {
  //   toastCustomOrStargateError(chainId, error);
  // }
}
