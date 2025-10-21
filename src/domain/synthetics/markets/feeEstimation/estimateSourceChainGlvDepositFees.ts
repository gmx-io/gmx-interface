import { maxUint256, zeroHash } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import { getMappedTokenId, OVERRIDE_ERC20_BYTECODE, RANDOM_SLOT, RANDOM_WALLET } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import { SendParam } from "domain/multichain/types";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { expandDecimals } from "lib/numbers";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { MARKETS } from "sdk/configs/markets";
import { getToken, getWrappedToken } from "sdk/configs/tokens";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { buildReverseSwapStrategy } from "sdk/utils/swap/buildSwapStrategy";
import { nowInSeconds } from "sdk/utils/time";

import { estimateDepositPlatformTokenTransferOutFees } from "./estimateDepositPlatformTokenTransferOutFees";
import { estimatePureGlvDepositGasLimit } from "./estimatePureGlvDepositGasLimit";
import { getRawRelayerParams, GlobalExpressParams, RawRelayParamsPayload, RelayParamsPayload } from "../../express";
import { convertToUsd, getMidPrice } from "../../tokens";
import { signCreateGlvDeposit } from "../signCreateGlvDeposit";
import { CreateGlvDepositParams, RawCreateGlvDepositParams } from "../types";

export type SourceChainGlvDepositFees = {
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
  txnEstimatedReceivedAmount: bigint;
};

/**
 * Source chain GM deposit requires following steps where user pays gas for:
 * 1. Source chain tx sending. Can be ommitted because user's wallet will show it to him.
 * 2. Source chain stargate fee. Usually from USDC or ETH.
 * 3. Keeper execution. [executionFee].
 * 4. Additional WNT for keeper to execute GM lz sending. [executionFee].
 * 5. Additional WNT for lz native fee.
 */
export async function estimateSourceChainGlvDepositFees({
  chainId,
  srcChainId,
  params,
  tokenAddress,
  tokenAmount,
  globalExpressParams,
  glvMarketCount,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  params: RawCreateGlvDepositParams;
  tokenAddress: string;
  tokenAmount: bigint;
  globalExpressParams: GlobalExpressParams;
  glvMarketCount: bigint;
}): Promise<SourceChainGlvDepositFees> {
  const {
    platformTokenReturnTransferGasLimit: returnGmTransferGasLimit,
    platformTokenReturnTransferNativeFee: returnGmTransferNativeFee,
  } = await estimateDepositPlatformTokenTransferOutFees({
    fromChainId: chainId,
    toChainId: srcChainId,
    marketOrGlvAddress: params.addresses.glv,
  });

  const keeperDepositGasLimit = estimatePureGlvDepositGasLimit({
    params,
    chainId,
    globalExpressParams,
    marketsCount: glvMarketCount,
  }).gasLimit;

  // Add actions gas
  const keeperGasLimit = keeperDepositGasLimit + returnGmTransferGasLimit;

  const keeperDepositFeeWNTAmount = keeperGasLimit * globalExpressParams.gasPrice;

  const fullWntFee = keeperDepositFeeWNTAmount + returnGmTransferNativeFee;

  const {
    initialTxNativeFee,
    initialTxGasLimit,
    relayParamsPayload,
    initialTransferComposeGas,
    initialTxReceivedAmount,
  } = await estimateSourceChainGlvDepositInitialTxFees({
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
    txnEstimatedReceivedAmount: initialTxReceivedAmount,
  };
}

async function estimateSourceChainGlvDepositInitialTxFees({
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
  params: CreateGlvDepositParams;
  tokenAddress: string;
  tokenAmount: bigint;
  globalExpressParams: GlobalExpressParams;
  fullWntFee: bigint;
}): Promise<{
  initialTxNativeFee: bigint;
  initialTxGasLimit: bigint;
  initialTransferComposeGas: bigint;
  relayParamsPayload: RelayParamsPayload;
  initialTxReceivedAmount: bigint;
}> {
  const sourceChainClient = getPublicClientWithRpc(srcChainId);

  const settlementWrappedTokenData = globalExpressParams.tokensData[getWrappedToken(chainId).address];
  const marketConfig = MARKETS[chainId][params.addresses.market];
  if (marketConfig.longTokenAddress !== tokenAddress && marketConfig.shortTokenAddress !== tokenAddress) {
    throw new Error("Token address not found in market config");
  }
  const initialToken = getToken(chainId, tokenAddress);
  const sourceChainTokenId = getMappedTokenId(chainId, tokenAddress, srcChainId);

  if (!sourceChainTokenId) {
    throw new Error("Source chain token ID not found");
  }

  // How much will take to send back the GM to source chain

  const feeSwapStrategy = buildReverseSwapStrategy({
    chainId,
    amountOut: fullWntFee,
    tokenIn: globalExpressParams.tokensData[tokenAddress],
    tokenOut: settlementWrappedTokenData,
    marketsInfoData: globalExpressParams.marketsInfoData,
    swapOptimizationOrder: ["length"],
    externalSwapQuoteParams: undefined,
    isAtomicSwap: true,
  });

  const returnRawRelayParamsPayload: RawRelayParamsPayload = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: feeSwapStrategy.swapPathStats!.tokenInAddress,
    relayerFeeTokenAddress: feeSwapStrategy.swapPathStats!.tokenOutAddress,
    feeParams: {
      feeToken: feeSwapStrategy.swapPathStats!.tokenInAddress,
      feeAmount: feeSwapStrategy.amountIn,
      feeSwapPath: feeSwapStrategy.swapPathStats!.swapPath,
    },
    externalCalls: getEmptyExternalCallsPayload(),
    tokenPermits: [],
  });

  const returnRelayParamsPayload: RelayParamsPayload = {
    ...returnRawRelayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  const vaultAddress = getContract(chainId, "GlvVault");
  const transferRequests = getTransferRequests([
    {
      to: vaultAddress,
      token: params.addresses.initialLongToken,
      amount: params.addresses.initialLongToken === tokenAddress ? tokenAmount : 0n,
    },
    {
      to: vaultAddress,
      token: params.addresses.initialShortToken,
      amount: params.addresses.initialShortToken === tokenAddress ? tokenAmount : 0n,
    },
  ]);

  const signature = await signCreateGlvDeposit({
    chainId,
    srcChainId,
    signer: RANDOM_WALLET,
    relayParams: returnRelayParamsPayload,
    transferRequests,
    params,
    shouldUseSignerMethod: true,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.GlvDeposit,
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
      params.addresses.initialLongToken === tokenAddress
        ? params.addresses.initialLongToken
        : params.addresses.initialShortToken,
    settlementChainPublicClient: getPublicClientWithRpc(chainId),
  });

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: chainId,
    account: RANDOM_WALLET.address,
    srcChainId,
    amountLD: expandDecimals(1, initialToken.decimals),
    composeGas: initialComposeGas,
    isToGmx: true,
    action,
  });

  const initialQuoteOft = await sourceChainClient.readContract({
    address: sourceChainTokenId.stargate,
    abi: abis.IStargate,
    functionName: "quoteOFT",
    args: [sendParams],
  });

  const initialQuoteSend = await sourceChainClient.readContract({
    address: sourceChainTokenId.stargate,
    abi: abis.IStargate,
    functionName: "quoteSend",
    args: [sendParams, false],
  });

  const initialStargateTxnGasLimit = await sourceChainClient
    .estimateContractGas({
      address: sourceChainTokenId.stargate,
      abi: abis.IStargate,
      functionName: "sendToken",
      args: [sendParams, initialQuoteSend, RANDOM_WALLET.address],
      value: initialQuoteSend.nativeFee,
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
    initialTxReceivedAmount: initialQuoteOft[2].amountReceivedLD,
  };
}
