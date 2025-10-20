import { t } from "@lingui/macro";
import { encodeFunctionData, zeroAddress } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId, IStargateAbi } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { SendParam, TransferRequests } from "domain/multichain/types";
import { GlobalExpressParams, RelayParamsPayload } from "domain/synthetics/express";
import { CreateDepositParams, RawCreateDepositParams } from "domain/synthetics/markets";
import { sendWalletTransaction } from "lib/transactions";
import { WalletSigner } from "lib/wallets";

import { toastCustomOrStargateError } from "components/GmxAccountModal/toastCustomOrStargateError";

import {
  estimateSourceChainDepositFees,
  sendQuoteFromNative,
  SourceChainDepositFees,
} from "./feeEstimation/estimateSourceChainDepositFees";
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
)) {
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

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: chainId,
    account: params.addresses.receiver,
    srcChainId,
    amountLD: tokenAmount,
    composeGas: ensuredFees.txnEstimatedComposeGas,
    isToGmx: true,
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

  try {
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
        abi: IStargateAbi,
        functionName: "sendToken",
        args: [sendParams, sendQuoteFromNative(ensuredFees.txnEstimatedNativeFee), params.addresses.receiver],
      }),
      value,
      msg: t`Sent deposit transaction`,
    });

    await txnResult.wait();
  } catch (error) {
    toastCustomOrStargateError(chainId, error);
  }
}
