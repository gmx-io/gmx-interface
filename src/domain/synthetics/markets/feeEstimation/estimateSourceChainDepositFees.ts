import { zeroAddress } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import { getMappedTokenId, getMultichainTokenId, RANDOM_WALLET } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import { SendParam } from "domain/multichain/types";
import { GlobalExpressParams, RelayParamsPayload } from "domain/synthetics/express";
import { getRawRelayerParams } from "domain/synthetics/express/relayParamsUtils";
import { adjustForDecimals } from "lib/numbers";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { MARKETS } from "sdk/configs/markets";
import { convertTokenAddress, getToken, getWrappedToken } from "sdk/configs/tokens";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";

import { Operation } from "components/GmSwap/GmSwapBox/types";

import { convertToUsd, getMidPrice } from "../../tokens";
import { signCreateDeposit } from "../signCreateDeposit";
import { CreateDepositParams, RawCreateDepositParams } from "../types";
import { estimateDepositPlatformTokenTransferOutFees } from "./estimateDepositPlatformTokenTransferOutFees";
import { estimatePureLpActionExecutionFee } from "./estimatePureLpActionExecutionFee";
import { stargateTransferFees } from "./stargateTransferFees";

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

  const swapPathCount = BigInt(params.addresses.longTokenSwapPath.length + params.addresses.shortTokenSwapPath.length);
  const keeperDepositGasLimit = estimatePureLpActionExecutionFee({
    action: {
      operation: Operation.Deposit,
      isGlv: false,
      swapsCount: swapPathCount,
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
  } = await estimateSourceChainDepositInitialTxFees({
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
  initialTxReceivedAmount: bigint;
  initialTransferComposeGas: bigint;
  relayParamsPayload: RelayParamsPayload;
}> {
  const settlementNativeWrappedTokenData = globalExpressParams.tokensData[getWrappedToken(chainId).address];
  const unwrappedPayTokenAddress = convertTokenAddress(chainId, tokenAddress, "native");
  const wrappedPayTokenAddress = convertTokenAddress(chainId, tokenAddress, "wrapped");

  const marketConfig = MARKETS[chainId][params.addresses.market];
  if (
    marketConfig.longTokenAddress !== wrappedPayTokenAddress &&
    marketConfig.shortTokenAddress !== wrappedPayTokenAddress
  ) {
    throw new Error(
      `Token address not found in market config. Market config: ${JSON.stringify(marketConfig)}, token address: ${wrappedPayTokenAddress}`
    );
  }
  const settlementChainTokenId = getMultichainTokenId(chainId, unwrappedPayTokenAddress);
  const sourceChainTokenId = getMappedTokenId(chainId, unwrappedPayTokenAddress, srcChainId);

  if (!settlementChainTokenId || !sourceChainTokenId) {
    throw new Error("Settlement or source chain token ID not found");
  }

  // How much will take to send back the GM to source chain
  const rawRelayParamsPayload = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: settlementNativeWrappedTokenData.address,
    relayerFeeTokenAddress: settlementNativeWrappedTokenData.address,
    feeParams: {
      feeToken: settlementNativeWrappedTokenData.address,
      feeAmount: fullWntFee,
      feeSwapPath: [],
    },
    externalCalls: getEmptyExternalCallsPayload(),
    tokenPermits: [],
  });

  const relayParamsPayload: RelayParamsPayload = {
    ...rawRelayParamsPayload,
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

  if (!transferRequests) {
    throw new Error("Transfer requests not found");
  }

  const signature = await signCreateDeposit({
    chainId,
    srcChainId,
    signer: RANDOM_WALLET,
    relayParams: relayParamsPayload,
    transferRequests,
    params,
    shouldUseSignerMethod: true,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.Deposit,
    actionData: {
      relayParams: relayParamsPayload,
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

  const amountLD = adjustForDecimals(tokenAmount, settlementChainTokenId.decimals, sourceChainTokenId.decimals);

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: chainId,
    account: RANDOM_WALLET.address,
    srcChainId,
    amountLD,
    composeGas: initialComposeGas,
    isToGmx: true,
    action,
    nativeDropAmount: fullWntFee,
  });

  const additionalValue = unwrappedPayTokenAddress === zeroAddress ? amountLD : 0n;

  const {
    nativeFee: initialTxNativeFee,
    amountReceivedLD: initialAmountReceivedLD,
    transferGasLimit: initialStargateTxnGasLimit,
  } = await stargateTransferFees({
    chainId: srcChainId,
    stargateAddress: sourceChainTokenId.stargate,
    sendParams,
    tokenAddress: sourceChainTokenId.address,
    additionalValue,
  });

  const estimatedReceivedAmount = adjustForDecimals(
    initialAmountReceivedLD,
    sourceChainTokenId.decimals,
    settlementChainTokenId.decimals
  );

  return {
    initialTxNativeFee,
    initialTxGasLimit: initialStargateTxnGasLimit,
    initialTxReceivedAmount: estimatedReceivedAmount,
    initialTransferComposeGas: initialComposeGas,
    relayParamsPayload: relayParamsPayload,
  };
}
