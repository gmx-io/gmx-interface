import { t } from "@lingui/macro";
import { getPublicClient } from "@wagmi/core";
import { Contract } from "ethers";
import { encodeFunctionData, zeroAddress } from "viem";

import type { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId, IStargateAbi } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/useMultichainDepositNetworkComposeGas";
import {
  getRawRelayerParams,
  GlobalExpressParams,
  RelayFeePayload,
  RelayParamsPayload,
} from "domain/synthetics/express";
import type { CreateGlvDepositParamsStruct } from "domain/synthetics/markets";
import { sendWalletTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";
import type { IRelayUtils } from "typechain-types/MultichainGmRouter";
import type { IStargate } from "typechain-types-stargate";
import type { SendParamStruct } from "typechain-types-stargate/IStargate";

import { toastCustomOrStargateError } from "components/Synthetics/GmxAccountModal/toastCustomOrStargateError";

import { signCreateGlvDeposit } from "./signCreateGlvDeposit";

export async function createSourceChainGlvDepositTxn({
  chainId,
  globalExpressParams,
  srcChainId,
  signer,
  transferRequests,
  params,
  account,
  tokenAddress,
  tokenAmount,
  // executionFee,
  relayFeePayload,
}: {
  chainId: SettlementChainId;
  globalExpressParams: GlobalExpressParams;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: CreateGlvDepositParamsStruct;
  account: string;
  tokenAddress: string;
  tokenAmount: bigint;
  relayFeePayload: RelayFeePayload;
}) {
  const rawRelayParamsPayload = getRawRelayerParams({
    chainId: chainId,
    gasPaymentTokenAddress: globalExpressParams!.gasPaymentTokenAddress,
    relayerFeeTokenAddress: globalExpressParams!.relayerFeeTokenAddress,
    feeParams: relayFeePayload,
    externalCalls: getEmptyExternalCallsPayload(),
    tokenPermits: [],
    marketsInfoData: globalExpressParams!.marketsInfoData,
  });

  const relayParams: RelayParamsPayload = {
    ...rawRelayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  const signature = await signCreateGlvDeposit({
    chainId,
    srcChainId,
    signer,
    relayParams,
    transferRequests,
    params,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.GlvDeposit,
    actionData: {
      relayParams: relayParams,
      transferRequests,
      params,
      signature,
    },
  };

  const composeGas = await estimateMultichainDepositNetworkComposeGas({
    action,
    chainId,
    account,
    srcChainId,
    tokenAddress,
    settlementChainPublicClient: getPublicClient(getRainbowKitConfig(), { chainId })!,
  });

  const sendParams: SendParamStruct = getMultichainTransferSendParams({
    dstChainId: chainId,
    account,
    srcChainId,
    amount: tokenAmount + relayFeePayload.feeAmount,
    composeGas: composeGas,
    isDeposit: true,
    action,
  });

  const sourceChainTokenId = getMappedTokenId(chainId, tokenAddress, srcChainId);

  if (!sourceChainTokenId) {
    throw new Error("Token ID not found");
  }

  const iStargateInstance = new Contract(sourceChainTokenId.stargate, IStargateAbi, signer) as unknown as IStargate;

  const quoteSend = await iStargateInstance.quoteSend(sendParams, false);

  const value = quoteSend.nativeFee + (tokenAddress === zeroAddress ? tokenAmount + relayFeePayload.feeAmount : 0n);

  try {
    const txnResult = await sendWalletTransaction({
      chainId: srcChainId!,
      to: sourceChainTokenId.stargate,
      signer,
      callData: encodeFunctionData({
        abi: IStargateAbi,
        functionName: "sendToken",
        args: [sendParams, { nativeFee: quoteSend.nativeFee, lzTokenFee: 0n }, account],
      }),
      value,
      msg: t`Sent deposit transaction`,
    });

    await txnResult.wait();
  } catch (error) {
    toastCustomOrStargateError(chainId, error);
  }
}
