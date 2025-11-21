// import { getPublicClient } from "@wagmi/core";
import { zeroAddress } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getStargatePoolAddress, RANDOM_WALLET } from "config/multichain";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { SendParam } from "domain/multichain/types";
import { expandDecimals } from "lib/numbers";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";

import { Operation } from "components/GmSwap/GmSwapBox/types";

import { GlobalExpressParams, RelayParamsPayload } from "../../express";
import { convertToUsd, getMidPrice } from "../../tokens";
import { CreateWithdrawalParams, RawCreateWithdrawalParams } from "../types";
import { estimatePureLpActionExecutionFee } from "./estimatePureLpActionExecutionFee";
import { estimateWithdrawalPlatformTokenTransferInFees } from "./estimateWithdrawalPlatformTokenTransferInFees";
import { stargateTransferFees } from "./stargateTransferFees";

export type SourceChainWithdrawalFees = {
  /**
   * How much will be used by keeper and stargate
   */
  relayParamsPayload: RelayParamsPayload;
  /**
   * How much will be used by keeper. In settlement chain WNT.
   */
  executionFee: bigint;
  /**
   * How much will be used by keeper + return GM transfer in USD.
   */
  relayFeeUsd: bigint;
  /**
   * How initial tx will cost in SOURCE CHAIN GAS
   */
  txnEstimatedGasLimit: bigint;
  /**
   * How much will be used by initial tx in SOURCE CHAIN NATIVE TOKEN
   */
  txnEstimatedNativeFee: bigint;
  txnEstimatedComposeGas: bigint;
};

/**
 * Source chain GM withdrawal requires following steps where user pays gas for:
 * 1. Source chain tx sending. Can be ommitted because user's wallet will show it to him.
 * 2. Source chain stargate fee. With GM.
 * 3. Keeper withdrawal execution. [executionFee].
 * 4. Additional WNT for keeper to execute 1 OR 2 market token lz sending. Usually USDC or ETH. [executionFee].
 * 5. Additional WNT for 1 OR 2 lz native fee.
 */
export async function estimateSourceChainWithdrawalFees({
  chainId,
  srcChainId,
  params,
  tokenAmount,
  globalExpressParams,
  outputLongTokenAddress,
  outputShortTokenAddress,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  params: RawCreateWithdrawalParams;
  tokenAddress: string;
  tokenAmount: bigint;
  globalExpressParams: GlobalExpressParams;
  outputLongTokenAddress: string;
  outputShortTokenAddress: string;
}): Promise<SourceChainWithdrawalFees> {
  const {
    longTokenTransferGasLimit,
    longTokenTransferNativeFee,
    shortTokenTransferGasLimit,
    shortTokenTransferNativeFee,
  } = await estimateSourceChainWithdrawalReturnTokenTransferFees({
    chainId,
    srcChainId,
    outputLongTokenAddress,
    outputShortTokenAddress,
  });

  const swapPathCount = BigInt(params.addresses.longTokenSwapPath.length + params.addresses.shortTokenSwapPath.length);
  const keeperWithdrawalGasLimit = estimatePureLpActionExecutionFee({
    action: {
      operation: Operation.Withdrawal,
      isGlv: false,
      swapsCount: swapPathCount,
    },
    chainId,
    tokensData: globalExpressParams.tokensData,
    gasPrice: globalExpressParams.gasPrice,
    gasLimits: globalExpressParams.gasLimits,
  }).gasLimit;
  // Add actions gas
  const keeperGasLimit = keeperWithdrawalGasLimit + longTokenTransferGasLimit + shortTokenTransferGasLimit;
  const keeperWithdrawalFeeWNTAmount = keeperGasLimit * globalExpressParams.gasPrice;
  const fullWntFee = keeperWithdrawalFeeWNTAmount + longTokenTransferNativeFee + shortTokenTransferNativeFee;

  const adjusterParams: CreateWithdrawalParams = {
    ...params,
    executionFee: keeperWithdrawalFeeWNTAmount,
  };

  const {
    platformTokenTransferInComposeGas,
    platformTokenTransferInGasLimit,
    platformTokenTransferInNativeFee,
    relayParamsPayload,
  } = await estimateWithdrawalPlatformTokenTransferInFees({
    chainId,
    srcChainId,
    marketTokenAmount: tokenAmount,
    fullWntFee,
    params: adjusterParams,
    secondaryOrPrimaryOutputTokenAddress: outputShortTokenAddress ?? outputLongTokenAddress,
    globalExpressParams,
  });

  const relayFeeUsd = convertToUsd(
    relayParamsPayload.fee.feeAmount,
    getToken(chainId, relayParamsPayload.fee.feeToken).decimals,
    getMidPrice(globalExpressParams.tokensData[relayParamsPayload.fee.feeToken].prices)
  )!;

  return {
    txnEstimatedComposeGas: platformTokenTransferInComposeGas,
    txnEstimatedGasLimit: platformTokenTransferInGasLimit,
    txnEstimatedNativeFee: platformTokenTransferInNativeFee,
    executionFee: keeperWithdrawalFeeWNTAmount,
    relayFeeUsd,
    relayParamsPayload,
  };
}

async function estimateSingleTokenReturnTransfer({
  chainId,
  srcChainId,
  tokenAddress,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  tokenAddress: string;
}): Promise<{
  transferGasLimit: bigint;
  transferNativeFee: bigint;
}> {
  const token = getToken(chainId, tokenAddress);
  const unwrappedAddress = convertTokenAddress(chainId, tokenAddress, "native");
  const stargateAddress = getStargatePoolAddress(chainId, unwrappedAddress);

  if (!stargateAddress) {
    throw new Error(`Stargate not found for token: ${tokenAddress}`);
  }

  const tokenAmount = expandDecimals(1, token.decimals) / 100n;
  const additionalValue = unwrappedAddress === zeroAddress ? tokenAmount : 0n;

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: srcChainId,
    account: RANDOM_WALLET.address,
    srcChainId,
    amountLD: tokenAmount,
    isToGmx: false,
  });

  const { quoteSend, returnTransferGasLimit } = await stargateTransferFees({
    chainId,
    stargateAddress,
    sendParams,
    tokenAddress,
    useSendToken: true,
    additionalValue,
  });

  return {
    transferGasLimit: returnTransferGasLimit,
    transferNativeFee: quoteSend.nativeFee,
  };
}

export async function estimateSourceChainWithdrawalReturnTokenTransferFees({
  chainId,
  srcChainId,
  outputLongTokenAddress,
  outputShortTokenAddress,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  outputLongTokenAddress: string;
  outputShortTokenAddress: string;
}): Promise<{
  longTokenTransferGasLimit: bigint;
  longTokenTransferNativeFee: bigint;
  shortTokenTransferGasLimit: bigint;
  shortTokenTransferNativeFee: bigint;
}> {
  const shouldEstimateShort = outputShortTokenAddress !== outputLongTokenAddress;

  // Run estimations in parallel
  const [longResult, shortResult] = await Promise.all([
    estimateSingleTokenReturnTransfer({
      chainId,
      srcChainId,
      tokenAddress: outputLongTokenAddress,
    }),
    shouldEstimateShort
      ? estimateSingleTokenReturnTransfer({
          chainId,
          srcChainId,
          tokenAddress: outputShortTokenAddress,
        })
      : Promise.resolve(null),
  ]);

  return {
    longTokenTransferGasLimit: longResult.transferGasLimit,
    longTokenTransferNativeFee: longResult.transferNativeFee,
    shortTokenTransferGasLimit: shortResult?.transferGasLimit ?? 0n,
    shortTokenTransferNativeFee: shortResult?.transferNativeFee ?? 0n,
  };
}
