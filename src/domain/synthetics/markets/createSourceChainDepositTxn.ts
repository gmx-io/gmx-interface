import { t } from "@lingui/macro";
import { encodeFunctionData, zeroAddress } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId, getMultichainTokenId } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { sendQuoteFromNative } from "domain/multichain/sendQuoteFromNative";
import { SendParam, TransferRequests } from "domain/multichain/types";
import { GlobalExpressParams, RelayParamsPayload } from "domain/synthetics/express";
import { CreateDepositParams, RawCreateDepositParams } from "domain/synthetics/markets";
import { adjustForDecimals } from "lib/numbers";
import { sendWalletTransaction, WalletTxnResult } from "lib/transactions";
import { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import { convertTokenAddress } from "sdk/configs/tokens";

import { estimateSourceChainDepositFees, SourceChainDepositFees } from "./feeEstimation/estimateSourceChainDepositFees";
import { signCreateDeposit } from "./signCreateDeposit";

export async function createSourceChainDepositTxn({
  chainId,
  srcChainId,
  signer,
  transferRequests,
  params,
  tokenAddress,
  tokenAmount,
  globalExpressParams,
  fees,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  transferRequests: TransferRequests;
  params: RawCreateDepositParams;
  tokenAddress: string;
  tokenAmount: bigint;
} & (
  | {
      fees: SourceChainDepositFees;
      globalExpressParams?: undefined;
    }
  | {
      fees?: undefined;
      globalExpressParams: GlobalExpressParams;
    }
)): Promise<WalletTxnResult> {
  const ensuredFees = fees
    ? fees
    : await estimateSourceChainDepositFees({
        chainId,
        srcChainId,
        params,
        tokenAddress,
        tokenAmount,
        globalExpressParams,
      });
  const unwrappedTokenAddress = convertTokenAddress(chainId, tokenAddress, "native");

  const adjusterParams: CreateDepositParams = { ...params, executionFee: ensuredFees.executionFee };

  const relayParams: RelayParamsPayload = ensuredFees.relayParamsPayload;

  const signature = await signCreateDeposit({
    chainId,
    srcChainId,
    signer,
    relayParams,
    transferRequests,
    params: adjusterParams,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.Deposit,
    actionData: {
      relayParams: relayParams,
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
    gasLimit: ensuredFees.txnEstimatedGasLimit,
    gasPriceData:
      globalExpressParams?.gasPrice !== undefined
        ? {
            gasPrice: globalExpressParams.gasPrice,
          }
        : undefined,
    callData: encodeFunctionData({
      abi: abis.IStargate,
      functionName: "sendToken",
      args: [sendParams, sendQuoteFromNative(ensuredFees.txnEstimatedNativeFee), params.addresses.receiver],
    }),
    value,
    msg: t`Deposit sent`,
  });

  return txnResult;
}
