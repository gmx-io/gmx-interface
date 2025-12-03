import { SettlementChainId, SourceChainId } from "config/chains";
import { GlobalExpressParams, RelayParamsPayload } from "domain/synthetics/express";
import { getToken } from "sdk/configs/tokens";

import { Operation } from "components/GmSwap/GmSwapBox/types";

import { estimateGlvWithdrawalPlatformTokenTransferInFees } from "./estimateGlvWithdrawalPlatformTokenTransferInFees";
import { estimatePureLpActionExecutionFee } from "./estimatePureLpActionExecutionFee";
import { estimateSourceChainWithdrawalReturnTokenTransferFees } from "./estimateSourceChainWithdrawalFees";
import { convertToUsd, getMidPrice } from "../../tokens";
import { CreateGlvWithdrawalParams, RawCreateGlvWithdrawalParams } from "../types";

export type SourceChainGlvWithdrawalFees = {
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
export async function estimateSourceChainGlvWithdrawalFees({
  chainId,
  srcChainId,
  params,
  tokenAmount,
  globalExpressParams,
  marketsCount,
  outputLongTokenAddress,
  outputShortTokenAddress,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  params: RawCreateGlvWithdrawalParams;
  marketsCount: bigint;
  tokenAddress: string;
  tokenAmount: bigint;
  globalExpressParams: GlobalExpressParams;
  outputLongTokenAddress: string;
  outputShortTokenAddress: string;
}): Promise<SourceChainGlvWithdrawalFees> {
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
      isGlv: true,
      marketsCount,
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

  const adjusterParams: CreateGlvWithdrawalParams = {
    ...params,
    executionFee: keeperWithdrawalFeeWNTAmount,
  };

  const {
    platformTokenTransferInComposeGas,
    platformTokenTransferInGasLimit,
    platformTokenTransferInNativeFee,
    relayParamsPayload,
  } = await estimateGlvWithdrawalPlatformTokenTransferInFees({
    chainId,
    srcChainId,
    fullWntFee,
    params: adjusterParams,
    globalExpressParams,
    marketTokenAmount: tokenAmount,
    secondaryOrPrimaryOutputTokenAddress: outputShortTokenAddress ?? outputLongTokenAddress,
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
