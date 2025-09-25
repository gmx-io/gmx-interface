import { t } from "@lingui/macro";
import { getPublicClient } from "@wagmi/core";
import { Contract } from "ethers";
import { encodeFunctionData, Hex, zeroAddress } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId, IStargateAbi } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/useMultichainDepositNetworkComposeGas";
import { getRawRelayerParams, GlobalExpressParams, RelayParamsPayload } from "domain/synthetics/express";
import { CreateWithdrawalParamsStruct } from "domain/synthetics/markets";
import { sendWalletTransaction } from "lib/transactions";
import { WalletSigner } from "lib/wallets";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";
import { IRelayUtils } from "typechain-types/MultichainGmRouter";
import { IStargate, IStargate__factory } from "typechain-types-stargate";
import { SendParamStruct } from "typechain-types-stargate/IStargate";

import { toastCustomOrStargateError } from "components/GmxAccountModal/toastCustomOrStargateError";

import { signCreateWithdrawal } from "./signCreateWithdrawal";

export async function createSourceChainWithdrawalTxn({
  chainId,
  globalExpressParams,
  srcChainId,
  signer,
  transferRequests,
  params,
  // account,
  // tokenAddress,
  tokenAmount,
  // executionFee,
}: {
  chainId: SettlementChainId;
  globalExpressParams: GlobalExpressParams;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: CreateWithdrawalParamsStruct;
  // account: string;
  // tokenAddress: string;
  tokenAmount: bigint;
  // executionFee: bigint;
}) {
  const account = params.addresses.receiver;
  const marketTokenAddress = params.addresses.market;

  const rawRelayParamsPayload = getRawRelayerParams({
    chainId: chainId,
    gasPaymentTokenAddress: globalExpressParams!.gasPaymentTokenAddress,
    relayerFeeTokenAddress: globalExpressParams!.relayerFeeTokenAddress,
    // feeParams: {
    //   // feeToken: globalExpressParams!.relayerFeeTokenAddress,
    //   feeToken: getTokenBySymbol(chainId, "USDC.SG").address,
    //   // TODO MLTCH this is going through the keeper to execute a depost
    //   // so there 100% should be a fee
    //   feeAmount: 2n * 10n ** 6n,
    //   feeSwapPath: ["0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc"],
    // },
    feeParams: {
      feeToken: getTokenBySymbol(chainId, "WETH").address,
      // TODO MLTCH this is going through the keeper to execute a depost
      // so there 100% should be a fee
      // feeAmount: 10n * 10n ** 6n,
      feeAmount: 639488160000000n, // params.executionFee,
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

  const signature = await signCreateWithdrawal({
    chainId,
    srcChainId,
    signer,
    relayParams,
    transferRequests,
    params,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.Withdrawal,
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
    tokenAddress: marketTokenAddress,
    settlementChainPublicClient: getPublicClient(getRainbowKitConfig(), { chainId })!,
  });

  // TODO MLTCH withdrawal also includes a withdrawal compose gas

  const sendParams: SendParamStruct = getMultichainTransferSendParams({
    dstChainId: chainId,
    account,
    srcChainId,
    amount: tokenAmount,
    composeGas: composeGas,
    isToGmx: true,
    isManualGas: true,
    action,
  });

  const sourceChainTokenId = getMappedTokenId(chainId, marketTokenAddress, srcChainId);

  if (!sourceChainTokenId) {
    throw new Error("Token ID not found");
  }

  const iStargateInstance = new Contract(sourceChainTokenId.stargate, IStargateAbi, signer) as unknown as IStargate;

  const quoteSend = await iStargateInstance.quoteSend(sendParams, false);

  const value = quoteSend.nativeFee + (marketTokenAddress === zeroAddress ? tokenAmount : 0n);

  try {
    const txnResult = await sendWalletTransaction({
      chainId: srcChainId!,
      to: sourceChainTokenId.stargate,
      signer,
      callData: encodeFunctionData({
        abi: IStargateAbi as unknown as typeof IStargate__factory.abi,
        functionName: "send",
        args: [sendParams as any, { nativeFee: quoteSend.nativeFee, lzTokenFee: 0n }, account as Hex],
      }),
      value,
      msg: t`Sent deposit transaction`,
    });

    await txnResult.wait();
  } catch (error) {
    toastCustomOrStargateError(chainId, error);
  }
}
