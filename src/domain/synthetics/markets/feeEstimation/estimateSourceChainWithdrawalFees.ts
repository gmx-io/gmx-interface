// import { getPublicClient } from "@wagmi/core";
import { maxUint256, zeroAddress, zeroHash } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getStargatePoolAddress, OVERRIDE_ERC20_BYTECODE, RANDOM_SLOT, RANDOM_WALLET } from "config/multichain";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { SendParam } from "domain/multichain/types";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { expandDecimals } from "lib/numbers";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";

import { GlobalExpressParams, RelayParamsPayload } from "../../express";
import { convertToUsd, getMidPrice } from "../../tokens";
import { CreateWithdrawalParams, RawCreateWithdrawalParams } from "../types";
import { estimatePureWithdrawalGasLimit } from "./estimatePureWithdrawalGasLimit";
import { estimateWithdrawalPlatformTokenTransferInFees } from "./estimateWithdrawalPlatformTokenTransferInFees";

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

  const keeperWithdrawalGasLimit = estimatePureWithdrawalGasLimit({
    params,
    chainId,
    globalExpressParams,
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
  const settlementChainClient = getPublicClientWithRpc(chainId);

  let longTokenTransferGasLimit = 0n;
  let longTokenTransferNativeFee = 0n;

  const outputLongToken = getToken(chainId, outputLongTokenAddress);
  const outputLongTokenUnwrappedAddress = convertTokenAddress(chainId, outputLongTokenAddress, "native");
  const outputLongTokenStargate = getStargatePoolAddress(chainId, outputLongTokenUnwrappedAddress);

  if (!outputLongTokenStargate) {
    throw new Error(`Output long token stargate not found: ${outputLongTokenAddress}`);
  }

  const someAmount = expandDecimals(1, outputLongToken.decimals) / 100n;

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: srcChainId,
    account: RANDOM_WALLET.address,
    srcChainId,
    amountLD: someAmount,
    isToGmx: false,
  });

  const quoteSend = await settlementChainClient.readContract({
    address: outputLongTokenStargate,
    abi: abis.IStargate,
    functionName: "quoteSend",
    args: [sendParams, false],
  });

  let longNativeValue = quoteSend.nativeFee;
  if (outputLongTokenUnwrappedAddress === zeroAddress) {
    longNativeValue += someAmount;
  }

  longTokenTransferGasLimit = await settlementChainClient
    .estimateContractGas({
      address: outputLongTokenStargate,
      abi: abis.IStargate,
      functionName: "sendToken",
      args: [sendParams, quoteSend, RANDOM_WALLET.address],
      value: longNativeValue,
      stateOverride: [
        {
          address: RANDOM_WALLET.address,
          balance: maxUint256,
        },
        {
          address: outputLongTokenAddress,
          code: OVERRIDE_ERC20_BYTECODE,
          state: [
            {
              slot: RANDOM_SLOT,
              value: zeroHash,
            },
          ],
        },
      ],
    })
    .then(applyGasLimitBuffer);

  let shortTokenTransferGasLimit = 0n;
  let shortTokenTransferNativeFee = 0n;
  if (outputShortTokenAddress !== outputLongTokenAddress) {
    const outputShortToken = getToken(chainId, outputShortTokenAddress);
    const outputShortTokenUnwrappedAddress = convertTokenAddress(chainId, outputShortTokenAddress, "native");
    const outputShortTokenStargate = getStargatePoolAddress(chainId, outputShortTokenUnwrappedAddress);

    if (!outputShortTokenStargate) {
      throw new Error("Output short token stargate not found");
    }

    const someAmount = expandDecimals(1, outputShortToken.decimals) / 100n;

    const secondarySendParams: SendParam = getMultichainTransferSendParams({
      dstChainId: srcChainId,
      account: RANDOM_WALLET.address,
      srcChainId,
      amountLD: someAmount,
      isToGmx: false,
    });

    // console.log({ outputShortTokenStargate , });

    const secondaryQuoteSend = await settlementChainClient.readContract({
      address: outputShortTokenStargate,
      abi: abis.IStargate,
      functionName: "quoteSend",
      args: [secondarySendParams, false],
    });

    let secondaryNativeValue = secondaryQuoteSend.nativeFee;
    if (outputShortTokenUnwrappedAddress === zeroAddress) {
      secondaryNativeValue += someAmount;
    }

    shortTokenTransferGasLimit = await settlementChainClient
      .estimateContractGas({
        address: outputShortTokenStargate,
        abi: abis.IStargate,
        functionName: "sendToken",
        args: [secondarySendParams, secondaryQuoteSend, RANDOM_WALLET.address],
        value: secondaryNativeValue,
        stateOverride: [
          {
            address: RANDOM_WALLET.address,
            balance: maxUint256,
          },
          {
            address: outputShortTokenAddress,
            code: OVERRIDE_ERC20_BYTECODE,
            state: [
              {
                slot: RANDOM_SLOT,
                value: zeroHash,
              },
            ],
          },
        ],
      })
      .then(applyGasLimitBuffer);

    shortTokenTransferNativeFee = secondaryQuoteSend.nativeFee;
  }

  return {
    longTokenTransferGasLimit,
    longTokenTransferNativeFee,
    shortTokenTransferGasLimit,
    shortTokenTransferNativeFee,
  };
}
