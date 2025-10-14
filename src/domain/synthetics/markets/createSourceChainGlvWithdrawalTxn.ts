import { t } from "@lingui/macro";
import { getPublicClient } from "@wagmi/core";
import { encodeFunctionData, zeroAddress } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { SendParam, TransferRequests } from "domain/multichain/types";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/useMultichainDepositNetworkComposeGas";
import { getRawRelayerParams, GlobalExpressParams, RelayParamsPayload } from "domain/synthetics/express";
import { CreateGlvWithdrawalParamsStruct } from "domain/synthetics/markets";
import { sendWalletTransaction } from "lib/transactions";
import { WalletSigner } from "lib/wallets";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";

import { toastCustomOrStargateError } from "components/GmxAccountModal/toastCustomOrStargateError";

import { signCreateGlvWithdrawal } from "./signCreateGlvWithdrawal";

export async function createSourceChainGlvWithdrawalTxn({
  chainId,
  globalExpressParams,
  srcChainId,
  signer,
  transferRequests,
  params,

  tokenAmount,
}: {
  chainId: SettlementChainId;
  globalExpressParams: GlobalExpressParams;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  transferRequests: TransferRequests;
  params: CreateGlvWithdrawalParamsStruct;
  tokenAmount: bigint;
  // additionalFee: bigint;
}) {
  const account = params.addresses.receiver;
  const glvTokenAddress = params.addresses.glv;
  // params.executionFee
  const rawRelayParamsPayload = getRawRelayerParams({
    chainId: chainId,
    gasPaymentTokenAddress: globalExpressParams!.gasPaymentTokenAddress,
    relayerFeeTokenAddress: globalExpressParams!.relayerFeeTokenAddress,
    feeParams: {
      feeToken: getTokenBySymbol(chainId, "WETH").address,
      // TODO MLTCH this is going through the keeper to execute a depost
      // so there 100% should be a fee
      // feeAmount: 10n * 10n ** 6n,
      feeAmount: 1117894200000000n * 2n, // params.executionFee,
      // feeSwapPath: ["0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc"],
      feeSwapPath: [],
    },
    externalCalls: getEmptyExternalCallsPayload(),
    tokenPermits: [],
    marketsInfoData: globalExpressParams!.marketsInfoData,
  });

  const relayParams: RelayParamsPayload = {
    ...rawRelayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  const signature = await signCreateGlvWithdrawal({
    chainId,
    srcChainId,
    signer,
    relayParams,
    transferRequests,
    params,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.GlvWithdrawal,
    actionData: {
      relayParams,
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
    tokenAddress: glvTokenAddress,
    settlementChainPublicClient: getPublicClient(getRainbowKitConfig(), { chainId })!,
  });

  // TODO MLTCH withdrawal also includes a withdrawal compose gas

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: chainId,
    account,
    srcChainId,
    amountLD: tokenAmount,
    composeGas: composeGas,
    isToGmx: true,
    isManualGas: true,
    action,
  });

  const sourceChainTokenId = getMappedTokenId(chainId, glvTokenAddress, srcChainId);

  if (!sourceChainTokenId) {
    throw new Error("Token ID not found");
  }

  const publicClient = getPublicClient(getRainbowKitConfig(), { chainId })!;

  const quoteSend = await publicClient.readContract({
    address: sourceChainTokenId.stargate,
    abi: abis.IStargate,
    functionName: "quoteSend",
    args: [sendParams, false],
  });

  const value = quoteSend.nativeFee + (glvTokenAddress === zeroAddress ? tokenAmount : 0n);

  try {
    const txnResult = await sendWalletTransaction({
      chainId: srcChainId!,
      to: sourceChainTokenId.stargate,
      signer,
      callData: encodeFunctionData({
        abi: abis.IStargate,
        functionName: "send",
        args: [sendParams, { nativeFee: quoteSend.nativeFee, lzTokenFee: 0n }, account],
      }),
      value,
      msg: t`Sent withdrawal transaction`,
    });

    await txnResult.wait();
  } catch (error) {
    toastCustomOrStargateError(chainId, error);
  }
}
