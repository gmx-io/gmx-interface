import { SettlementChainId, SourceChainId } from "config/chains";
import { RANDOM_WALLET } from "config/multichain";
import { getMappedTokenId } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { getContract } from "sdk/configs/contracts";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { convertTokenAddress, getWrappedToken } from "sdk/configs/tokens";
import { SwapPricingType } from "sdk/types/orders";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { buildReverseSwapStrategy } from "sdk/utils/swap/buildSwapStrategy";
import { nowInSeconds } from "sdk/utils/time";

import { getRawRelayerParams } from "../../express";
import { GlobalExpressParams, RawRelayParamsPayload, RelayParamsPayload } from "../../express/types";
import { signCreateWithdrawal } from "../signCreateWithdrawal";
import { CreateGlvWithdrawalParams } from "../types";
import { stargateTransferFees } from "./stargateTransferFees";

export async function estimateGlvWithdrawalPlatformTokenTransferInFees({
  chainId,
  srcChainId,
  marketTokenAmount,
  fullWntFee,
  params,
  secondaryOrPrimaryOutputTokenAddress,
  globalExpressParams,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  marketTokenAmount: bigint;
  fullWntFee: bigint;
  params: CreateGlvWithdrawalParams;
  secondaryOrPrimaryOutputTokenAddress: string;
  globalExpressParams: GlobalExpressParams;
}): Promise<{
  platformTokenTransferInGasLimit: bigint;
  platformTokenTransferInNativeFee: bigint;
  platformTokenTransferInComposeGas: bigint;
  relayParamsPayload: RelayParamsPayload;
}> {
  const settlementWrappedTokenData = globalExpressParams.tokensData[getWrappedToken(chainId).address];

  const feeSwapStrategy = buildReverseSwapStrategy({
    chainId,
    amountOut: fullWntFee,
    tokenIn: globalExpressParams.tokensData[secondaryOrPrimaryOutputTokenAddress],
    tokenOut: settlementWrappedTokenData,
    marketsInfoData: globalExpressParams.marketsInfoData,
    swapOptimizationOrder: ["length"],
    externalSwapQuoteParams: undefined,
    swapPricingType: SwapPricingType.AtomicSwap,
  });

  const returnRawRelayParamsPayload: RawRelayParamsPayload =
    convertTokenAddress(chainId, secondaryOrPrimaryOutputTokenAddress, "wrapped") === settlementWrappedTokenData.address
      ? getRawRelayerParams({
          chainId,
          gasPaymentTokenAddress: settlementWrappedTokenData.address,
          relayerFeeTokenAddress: settlementWrappedTokenData.address,
          feeParams: {
            feeToken: settlementWrappedTokenData.address,
            feeAmount: fullWntFee,
            feeSwapPath: [],
          },
          externalCalls: getEmptyExternalCallsPayload(),
          tokenPermits: [],
        })
      : getRawRelayerParams({
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
      token: params.addresses.glv,
      amount: marketTokenAmount,
    },
  ]);

  if (!transferRequests) {
    throw new Error("Transfer requests not found");
  }

  const signature = await signCreateWithdrawal({
    chainId,
    srcChainId,
    signer: RANDOM_WALLET,
    relayParams: returnRelayParamsPayload,
    transferRequests,
    params,
    shouldUseSignerMethod: true,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.GlvWithdrawal,
    actionData: {
      relayParams: returnRelayParamsPayload,
      transferRequests,
      params,
      signature,
    },
  };

  const composeGas = await estimateMultichainDepositNetworkComposeGas({
    action,
    chainId,
    account: RANDOM_WALLET.address,
    srcChainId,
    tokenAddress: params.addresses.glv,
    settlementChainPublicClient: getPublicClientWithRpc(chainId),
  });

  const returnTransferSendParams = getMultichainTransferSendParams({
    dstChainId: chainId,
    account: RANDOM_WALLET.address,
    srcChainId,
    amountLD: marketTokenAmount,
    isToGmx: true,
    // TODO MLTCH check that all gm and glv transfers are manual gas
    isManualGas: true,
    action,
    composeGas,
  });

  const tokenId = getMappedTokenId(chainId, params.addresses.glv, srcChainId);

  if (!tokenId) {
    throw new Error("Token ID not found");
  }

  const { nativeFee: platformTokenTransferInNativeFee, transferGasLimit: platformTokenTransferInGasLimit } =
    await stargateTransferFees({
      chainId: srcChainId,
      stargateAddress: tokenId.stargate,
      sendParams: returnTransferSendParams,
      tokenAddress: params.addresses.glv,
      disableOverrides: true,
      account: params.addresses.receiver,
    });

  return {
    platformTokenTransferInGasLimit,
    platformTokenTransferInNativeFee,
    platformTokenTransferInComposeGas: composeGas,
    relayParamsPayload: returnRelayParamsPayload,
  };
}
