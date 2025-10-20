// import { getPublicClient } from "@wagmi/core";
import { maxUint256, zeroAddress, zeroHash } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import { getMappedTokenId, OVERRIDE_ERC20_BYTECODE, RANDOM_SLOT, RANDOM_WALLET } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import { MessagingFee, SendParam } from "domain/multichain/types";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { adjustForDecimals } from "lib/numbers";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { MARKETS } from "sdk/configs/markets";
import { convertTokenAddress, getToken, getWrappedToken } from "sdk/configs/tokens";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { buildReverseSwapStrategy } from "sdk/utils/swap/buildSwapStrategy";
import { nowInSeconds } from "sdk/utils/time";

import { getRawRelayerParams, GlobalExpressParams, RawRelayParamsPayload, RelayParamsPayload } from "../../express";
import { convertToUsd, getMidPrice } from "../../tokens";
import { signCreateDeposit } from "../signCreateDeposit";
import { CreateDepositParams, RawCreateDepositParams } from "../types";
import { estimateDepositPlatformTokenTransferOutFees } from "./estimateDepositPlatformTokenTransferOutFees";
import { estimatePureDepositGasLimit } from "./estimatePureDepositGasLimit";

export type SourceChainDepositFees = {
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
 * Source chain GM deposit requires following steps where user pays gas for:
 * 1. Source chain tx sending. Can be ommitted because user's wallet will show it to him.
 * 2. Source chain stargate fee. Usually from USDC or ETH.
 * 3. Keeper execution. [executionFee].
 * 4. Additional WNT for keeper to execute GM lz sending. [executionFee].
 * 5. Additional WNT for lz native fee.
 */
export async function estimateSourceChainDepositFees({
  chainId,
  srcChainId,
  params,
  tokenAddress,
  tokenAmount,
  globalExpressParams,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  params: RawCreateDepositParams;
  tokenAddress: string;
  tokenAmount: bigint;
  globalExpressParams: GlobalExpressParams;
}): Promise<SourceChainDepositFees> {
  const {
    platformTokenReturnTransferGasLimit: returnGmTransferGasLimit,
    platformTokenReturnTransferNativeFee: returnGmTransferNativeFee,
  } = await estimateDepositPlatformTokenTransferOutFees({
    fromChainId: chainId,
    toChainId: srcChainId,
    marketOrGlvAddress: params.addresses.market,
  });

  const keeperDepositGasLimit = estimatePureDepositGasLimit({
    params,
    chainId,
    globalExpressParams,
  }).gasLimit;

  // Add actions gas
  const keeperGasLimit = keeperDepositGasLimit + returnGmTransferGasLimit;

  const keeperDepositFeeWNTAmount = keeperGasLimit * globalExpressParams.gasPrice;

  const fullWntFee = keeperDepositFeeWNTAmount + returnGmTransferNativeFee;

  const { initialTxNativeFee, initialTxGasLimit, relayParamsPayload, initialTransferComposeGas } =
    await estimateSourceChainDepositInitialTxFees({
      chainId,
      srcChainId,
      params: {
        ...params,
        executionFee: keeperDepositFeeWNTAmount,
      },
      tokenAddress,
      tokenAmount,
      globalExpressParams,
      fullWntFee,
    });

  const relayFeeUsd = convertToUsd(
    relayParamsPayload.fee.feeAmount,
    getToken(chainId, relayParamsPayload.fee.feeToken).decimals,
    getMidPrice(globalExpressParams.tokensData[relayParamsPayload.fee.feeToken].prices)
  )!;

  return {
    txnEstimatedComposeGas: initialTransferComposeGas,
    txnEstimatedGasLimit: initialTxGasLimit,
    txnEstimatedNativeFee: initialTxNativeFee,
    executionFee: keeperDepositFeeWNTAmount,
    relayFeeUsd,
    relayParamsPayload,
  };
}

async function estimateSourceChainDepositInitialTxFees({
  chainId,
  srcChainId,
  params,
  tokenAddress,
  tokenAmount,
  globalExpressParams,
  fullWntFee,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  params: CreateDepositParams;
  tokenAddress: string;
  tokenAmount: bigint;
  globalExpressParams: GlobalExpressParams;
  fullWntFee: bigint;
}): Promise<{
  initialTxNativeFee: bigint;
  initialTxGasLimit: bigint;
  initialTransferComposeGas: bigint;
  relayParamsPayload: RelayParamsPayload;
}> {
  const sourceChainClient = getPublicClientWithRpc(srcChainId);
  const settlementNativeWrappedTokenData = globalExpressParams.tokensData[getWrappedToken(chainId).address];
  const unwrappedPayTokenAddress = convertTokenAddress(chainId, tokenAddress, "native");
  const wrappedPayTokenAddress = convertTokenAddress(chainId, tokenAddress, "wrapped");

  const marketConfig = MARKETS[chainId][params.addresses.market];
  if (
    marketConfig.longTokenAddress !== wrappedPayTokenAddress &&
    marketConfig.shortTokenAddress !== wrappedPayTokenAddress
  ) {
    // console.log("marketConfig", params);
    throw new Error(
      `Token address not found in market config. Market config: ${JSON.stringify(marketConfig)}, token address: ${wrappedPayTokenAddress}`
    );
  }
  const initialToken = getToken(chainId, wrappedPayTokenAddress);
  const sourceChainTokenId = getMappedTokenId(chainId, unwrappedPayTokenAddress, srcChainId);

  if (!sourceChainTokenId) {
    throw new Error("Source chain token ID not found");
  }

  // How much will take to send back the GM to source chain

  const feeSwapStrategy =
    wrappedPayTokenAddress === settlementNativeWrappedTokenData.address
      ? null
      : buildReverseSwapStrategy({
          chainId,
          amountOut: fullWntFee,
          tokenIn: globalExpressParams.tokensData[wrappedPayTokenAddress],
          tokenOut: settlementNativeWrappedTokenData,
          marketsInfoData: globalExpressParams.marketsInfoData,
          swapOptimizationOrder: ["length"],
          externalSwapQuoteParams: undefined,
          isAtomicSwap: true,
        });

  if (feeSwapStrategy && !feeSwapStrategy.swapPathStats) {
    throw new Error("Fee swap strategy has no swap path stats");
  }

  // console.log({
  //   wrappedTokenAddress,
  //   wrappedTokenData: globalExpressParams.tokensData[wrappedTokenAddress],
  //   feeSwapStrategy,
  //   settlementWrappedTokenData,
  // });

  const returnRawRelayParamsPayload: RawRelayParamsPayload = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: feeSwapStrategy?.swapPathStats!.tokenInAddress ?? settlementNativeWrappedTokenData.address,
    relayerFeeTokenAddress: feeSwapStrategy?.swapPathStats!.tokenOutAddress ?? wrappedPayTokenAddress,
    feeParams: {
      feeToken: feeSwapStrategy?.swapPathStats!.tokenInAddress ?? wrappedPayTokenAddress,
      feeAmount: feeSwapStrategy?.amountIn ?? fullWntFee,
      feeSwapPath: feeSwapStrategy?.swapPathStats!.swapPath ?? [],
    },
    externalCalls: getEmptyExternalCallsPayload(),
    tokenPermits: [],
  });

  const returnRelayParamsPayload: RelayParamsPayload = {
    ...returnRawRelayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  const vaultAddress = getContract(chainId, "DepositVault");
  const transferRequests = getTransferRequests([
    {
      to: vaultAddress,
      token: params.addresses.initialLongToken,
      amount: params.addresses.initialLongToken === wrappedPayTokenAddress ? tokenAmount : 0n,
    },
    {
      to: vaultAddress,
      token: params.addresses.initialShortToken,
      amount: params.addresses.initialShortToken === wrappedPayTokenAddress ? tokenAmount : 0n,
    },
  ]);

  const signature = await signCreateDeposit({
    chainId,
    srcChainId,
    signer: RANDOM_WALLET,
    relayParams: returnRelayParamsPayload,
    transferRequests,
    params,
    shouldUseSignerMethod: true,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.Deposit,
    actionData: {
      relayParams: returnRelayParamsPayload,
      transferRequests,
      params,
      signature,
    },
  };

  const initialComposeGas = await estimateMultichainDepositNetworkComposeGas({
    action,
    chainId,
    account: RANDOM_WALLET.address,
    srcChainId,
    tokenAddress:
      params.addresses.initialLongToken === wrappedPayTokenAddress
        ? params.addresses.initialLongToken
        : params.addresses.initialShortToken,
    settlementChainPublicClient: getPublicClientWithRpc(chainId),
  });

  const amountLD = adjustForDecimals(tokenAmount, initialToken.decimals, sourceChainTokenId.decimals);

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: chainId,
    account: RANDOM_WALLET.address,
    srcChainId,
    amountLD,
    composeGas: initialComposeGas,
    isToGmx: true,
    action,
  });

  // const initialQuoteOft = await sourceChainClient.readContract({
  //   address: sourceChainTokenId.stargate,
  //   abi: abis.IStargate,
  //   functionName: "quoteOFT",
  //   args: [sendParams],
  // });

  // TODO MLTCH
  // sendParams.amountLD = initialQuoteOft[0].minAmountLD * 100n;

  const initialQuoteSend = await sourceChainClient.readContract({
    address: sourceChainTokenId.stargate,
    abi: abis.IStargate,
    functionName: "quoteSend",
    args: [sendParams, false],
  });

  let value = initialQuoteSend.nativeFee;
  if (unwrappedPayTokenAddress === zeroAddress) {
    value += amountLD;
  }

  const initialStargateTxnGasLimit = await sourceChainClient
    .estimateContractGas({
      address: sourceChainTokenId.stargate,
      abi: abis.IStargate,
      functionName: "sendToken",
      args: [sendParams, initialQuoteSend, RANDOM_WALLET.address],
      value,
      stateOverride: [
        {
          address: RANDOM_WALLET.address,
          balance: maxUint256,
        },
        {
          address: sourceChainTokenId.address,
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

  return {
    initialTxNativeFee: initialQuoteSend.nativeFee,
    initialTxGasLimit: initialStargateTxnGasLimit,
    initialTransferComposeGas: initialComposeGas,
    relayParamsPayload: returnRelayParamsPayload,
  };
}

export function sendQuoteFromNative(nativeFee: bigint): MessagingFee {
  return {
    nativeFee,
    lzTokenFee: 0n,
  };
}
