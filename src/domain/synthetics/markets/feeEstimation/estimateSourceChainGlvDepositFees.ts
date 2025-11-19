import { SettlementChainId, SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import { getMappedTokenId, RANDOM_WALLET } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import { SendParam } from "domain/multichain/types";
import { expandDecimals } from "lib/numbers";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { MARKETS } from "sdk/configs/markets";
import { convertTokenAddress, getToken, getWrappedToken } from "sdk/configs/tokens";
import { SwapPricingType } from "sdk/types/orders";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { buildReverseSwapStrategy } from "sdk/utils/swap/buildSwapStrategy";
import { nowInSeconds } from "sdk/utils/time";

import { Operation } from "components/GmSwap/GmSwapBox/types";

import { getRawRelayerParams, GlobalExpressParams, RawRelayParamsPayload, RelayParamsPayload } from "../../express";
import { convertToUsd, getGmToken, getMidPrice } from "../../tokens";
import { signCreateGlvDeposit } from "../signCreateGlvDeposit";
import { CreateGlvDepositParams, RawCreateGlvDepositParams } from "../types";
import { estimateDepositPlatformTokenTransferOutFees } from "./estimateDepositPlatformTokenTransferOutFees";
import { estimatePureLpActionExecutionFee } from "./estimatePureLpActionExecutionFee";
import { stargateTransferFees } from "./stargateTransferFees";

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
  // debugger;
  const {
    platformTokenReturnTransferGasLimit: returnGmTransferGasLimit,
    platformTokenReturnTransferNativeFee: returnGmTransferNativeFee,
  } = await estimateDepositPlatformTokenTransferOutFees({
    fromChainId: chainId,
    toChainId: srcChainId,
    marketOrGlvAddress: params.addresses.glv,
  });

  const swapPathCount = BigInt(params.addresses.longTokenSwapPath.length + params.addresses.shortTokenSwapPath.length);
  const keeperDepositGasLimit = estimatePureLpActionExecutionFee({
    action: {
      operation: Operation.Deposit,
      isGlv: true,
      marketsCount: glvMarketCount,
      swapsCount: swapPathCount,
      isMarketTokenDeposit: params.isMarketTokenDeposit,
    },
    chainId,
    tokensData: globalExpressParams.tokensData,
    gasPrice: globalExpressParams.gasPrice,
    gasLimits: globalExpressParams.gasLimits,
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
  const settlementWrappedTokenData = globalExpressParams.tokensData[getWrappedToken(chainId).address];
  const marketConfig = MARKETS[chainId][params.addresses.market];

  const isValidMarketTokenDeposit = tokenAddress === params.addresses.market;
  const isValidSideTokenDeposit =
    marketConfig.longTokenAddress === tokenAddress ||
    convertTokenAddress(chainId, marketConfig.longTokenAddress, "native") === tokenAddress ||
    marketConfig.shortTokenAddress === tokenAddress ||
    convertTokenAddress(chainId, marketConfig.shortTokenAddress, "native") === tokenAddress;
  if (!isValidMarketTokenDeposit && !isValidSideTokenDeposit) {
    const errorMessage = `Invalid token address for GLV deposit. Market config: ${JSON.stringify(marketConfig)}, token address: ${tokenAddress}`;
    // eslint-disable-next-line no-console
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  const initialToken = isValidMarketTokenDeposit
    ? getGmToken(chainId, params.addresses.market)
    : getToken(chainId, tokenAddress);
  const sourceChainTokenId = getMappedTokenId(chainId, tokenAddress, srcChainId);

  if (!sourceChainTokenId) {
    const errorMessage = `Source chain token ID not found. Token address: ${tokenAddress}, source chain ID: ${srcChainId}`;
    // eslint-disable-next-line no-console
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // How much will take to send back the GM to source chain
  // pay in gas payment token

  const feeSwapStrategy = buildReverseSwapStrategy({
    chainId,
    amountOut: fullWntFee,
    tokenIn: globalExpressParams.gasPaymentToken,
    tokenOut: settlementWrappedTokenData,
    marketsInfoData: globalExpressParams.marketsInfoData,
    swapOptimizationOrder: ["length"],
    externalSwapQuoteParams: undefined,
    swapPricingType: SwapPricingType.AtomicSwap,
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
    {
      to: vaultAddress,
      token: params.addresses.market,
      amount: isValidMarketTokenDeposit ? tokenAmount : 0n,
    },
  ]);

  if (!transferRequests) {
    const errorMessage = `Transfer requests not found. Token address: ${tokenAddress}, source chain ID: ${srcChainId}`;
    // eslint-disable-next-line no-console
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

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
    tokenAddress,
    settlementChainPublicClient: getPublicClientWithRpc(chainId),
  });

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: chainId,
    account: RANDOM_WALLET.address,
    srcChainId,
    amountLD: expandDecimals(1, initialToken.decimals) / 10n,
    composeGas: initialComposeGas,
    isToGmx: true,
    isManualGas: params.isMarketTokenDeposit ? true : false,
    action,
  });

  const {
    quoteSend: initialQuoteSend,
    quoteOft: initialQuoteOft,
    returnTransferGasLimit: initialStargateTxnGasLimit,
  } = await stargateTransferFees({
    chainId: srcChainId,
    stargateAddress: sourceChainTokenId.stargate,
    sendParams,
    tokenAddress: sourceChainTokenId.address,
    useSendToken: isValidMarketTokenDeposit ? false : true,
    disableOverrides: isValidMarketTokenDeposit ? true : false,
    account: params.addresses.receiver,
  });

  return {
    initialTxNativeFee: initialQuoteSend.nativeFee,
    initialTxGasLimit: initialStargateTxnGasLimit,
    initialTransferComposeGas: initialComposeGas,
    relayParamsPayload: returnRelayParamsPayload,
    initialTxReceivedAmount: initialQuoteOft[2].amountReceivedLD,
  };
}
