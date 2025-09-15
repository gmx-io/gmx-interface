import { t } from "@lingui/macro";
import { getPublicClient } from "@wagmi/core";
import { Contract } from "ethers";
import { encodeFunctionData, zeroAddress } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId, IStargateAbi } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/useMultichainDepositNetworkComposeGas";
import {
  getRawRelayerParams,
  GlobalExpressParams,
  RawRelayParamsPayload,
  RelayParamsPayload,
} from "domain/synthetics/express";
import { CreateDepositParamsStruct } from "domain/synthetics/markets";
import { sendWalletTransaction } from "lib/transactions";
import { WalletSigner } from "lib/wallets";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";
import { IRelayUtils } from "typechain-types/MultichainGmRouter";
import { IStargate } from "typechain-types-stargate";
import { SendParamStruct } from "typechain-types-stargate/IStargate";

import { toastCustomOrStargateError } from "components/Synthetics/GmxAccountModal/toastCustomOrStargateError";

import { signCreateDeposit } from "./signCreateDeposit";

export async function createSourceChainDepositTxn({
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
}: {
  chainId: SettlementChainId;
  globalExpressParams: GlobalExpressParams;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: CreateDepositParamsStruct;
  account: string;
  tokenAddress: string;
  tokenAmount: bigint;
  executionFee: bigint;
}) {
  const rawRelayParamsPayload = getRawRelayerParams({
    chainId: chainId,
    gasPaymentTokenAddress: globalExpressParams!.gasPaymentTokenAddress,
    relayerFeeTokenAddress: globalExpressParams!.relayerFeeTokenAddress,
    feeParams: {
      // feeToken: globalExpressParams!.relayerFeeTokenAddress,
      feeToken: tokenAddress,
      // TODO MLTCH this is going through the keeper to execute a depost
      // so there 100% should be a fee
      feeAmount: 2n * 10n ** 6n,
      feeSwapPath: ["0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc"],
    },
    externalCalls: getEmptyExternalCallsPayload(),
    tokenPermits: [],
    marketsInfoData: globalExpressParams!.marketsInfoData,
  }) as RawRelayParamsPayload;

  const relayParams: RelayParamsPayload = {
    ...rawRelayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  const signature = await signCreateDeposit({
    chainId,
    srcChainId,
    signer,
    relayParams,
    transferRequests,
    params,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.Deposit,
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
    amount: tokenAmount,
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

  const value = quoteSend.nativeFee + (tokenAddress === zeroAddress ? tokenAmount : 0n);

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
