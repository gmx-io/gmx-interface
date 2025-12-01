import { SettlementChainId } from "config/chains";
import type { TokenData } from "domain/tokens";
import { SwapPricingType } from "sdk/types/orders";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { buildReverseSwapStrategy } from "sdk/utils/swap/buildSwapStrategy";

import { getRawRelayerParams, GlobalExpressParams, RawRelayParamsPayload } from "../../express";

export function getFeeRelayParams({
  chainId,
  fullWntFee,
  globalExpressParams,
  settlementWrappedTokenData,
}: {
  chainId: SettlementChainId;
  fullWntFee: bigint;
  globalExpressParams: GlobalExpressParams;
  settlementWrappedTokenData: TokenData;
}): RawRelayParamsPayload {
  if (globalExpressParams.gasPaymentToken.address !== settlementWrappedTokenData.address) {
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

    if (!feeSwapStrategy.swapPathStats) {
      throw new Error("Fee swap strategy has no swap path stats");
    }

    return getRawRelayerParams({
      chainId,
      gasPaymentTokenAddress: feeSwapStrategy.swapPathStats.tokenInAddress,
      relayerFeeTokenAddress: feeSwapStrategy.swapPathStats.tokenOutAddress,
      feeParams: {
        feeToken: feeSwapStrategy.swapPathStats.tokenInAddress,
        feeAmount: feeSwapStrategy.amountIn,
        feeSwapPath: feeSwapStrategy.swapPathStats.swapPath,
      },
      externalCalls: getEmptyExternalCallsPayload(),
      tokenPermits: [],
    });
  } else {
    return getRawRelayerParams({
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
    });
  }
}
