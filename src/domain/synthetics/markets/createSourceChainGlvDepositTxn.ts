import { t } from "@lingui/macro";
import { encodeFunctionData, zeroAddress } from "viem";

import type { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId, getMultichainTokenId } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { sendQuoteFromNative } from "domain/multichain/sendQuoteFromNative";
import { SendParam, TransferRequests } from "domain/multichain/types";
import { GlobalExpressParams, RelayParamsPayload } from "domain/synthetics/express";
import type { CreateGlvDepositParams, RawCreateGlvDepositParams } from "domain/synthetics/markets";
import { adjustForDecimals } from "lib/numbers";
import { sendWalletTransaction, WalletTxnResult } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import { convertTokenAddress } from "sdk/configs/tokens";

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
  const unwrappedTokenAddress = convertTokenAddress(chainId, tokenAddress, "native");
  const adjusterParams: CreateGlvDepositParams = { ...params, executionFee: ensuredFees.executionFee };
  const relayParams: RelayParamsPayload = ensuredFees.relayParamsPayload;

  const signature = await signCreateGlvDeposit({
    chainId,
    srcChainId,
    signer,
    relayParams,
    transferRequests,
    params: adjusterParams,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.GlvDeposit,
    actionData: {
      relayParams,
      transferRequests,
      params: adjusterParams,
      signature,
    },
  };

  const settlementChainTokenId = getMultichainTokenId(chainId, unwrappedTokenAddress);
  const sourceChainTokenId = getMappedTokenId(chainId, unwrappedTokenAddress, srcChainId);

  if (!settlementChainTokenId || !sourceChainTokenId) {
    throw new Error("Settlement or source chain token ID not found");
  }

  const amountLD = adjustForDecimals(tokenAmount, settlementChainTokenId.decimals, sourceChainTokenId.decimals);

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: chainId,
    account: params.addresses.receiver,
    srcChainId,
    amountLD,
    composeGas: ensuredFees.txnEstimatedComposeGas,
    isToGmx: true,
    isManualGas: params.isMarketTokenDeposit ? true : false,
    action,
    nativeDropAmount: relayParams.fee.feeAmount,
  });

  let value = ensuredFees.txnEstimatedNativeFee;
  if (unwrappedTokenAddress === zeroAddress) {
    value += amountLD;
  }

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
}
