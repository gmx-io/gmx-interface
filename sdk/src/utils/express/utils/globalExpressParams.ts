import type { ContractsChainId } from "configs/chains";
import { EXPRESS_EXTRA_EXECUTION_FEE_BUFFER_BPS, getDefaultGasPaymentToken, getRelayerFeeToken } from "configs/express";
import type { GasLimitsConfig, L1ExpressOrderGasReference } from "utils/fees/types";
import type { MarketsInfoData } from "utils/markets/types";
import { SwapPricingType } from "utils/orders/types";
import { createFindSwapPath } from "utils/swap/swapPath";
import type { SignedTokenPermit, TokensData } from "utils/tokens/types";

export type GlobalExpressParams = {
  chainId: ContractsChainId;
  gasLimits: GasLimitsConfig;
  gasPrice: bigint;
  tokensData: TokensData;
  marketsInfoData: MarketsInfoData;
  gasPaymentTokenAddress?: string;
  tokenPermits?: SignedTokenPermit[];
  l1Reference?: L1ExpressOrderGasReference;
  bufferBps?: number;
};

export function buildGlobalExpressParams({
  chainId,
  gasLimits,
  gasPrice,
  tokensData,
  marketsInfoData,
  gasPaymentTokenAddress,
  tokenPermits = [],
  l1Reference,
  bufferBps = EXPRESS_EXTRA_EXECUTION_FEE_BUFFER_BPS,
}: GlobalExpressParams) {
  const resolvedGasPaymentTokenAddress = gasPaymentTokenAddress ?? getDefaultGasPaymentToken(chainId);
  const relayerFeeToken = getRelayerFeeToken(chainId);

  const findFeeSwapPath = createFindSwapPath({
    chainId,
    fromTokenAddress: resolvedGasPaymentTokenAddress,
    toTokenAddress: relayerFeeToken.address,
    marketsInfoData,
    gasEstimationParams: {
      gasPrice,
      gasLimits,
      tokensData,
    },
    swapPricingType: SwapPricingType.AtomicSwap,
  });

  const gasPaymentToken = tokensData[resolvedGasPaymentTokenAddress];
  const resolvedRelayerFeeToken = tokensData[relayerFeeToken.address];

  return {
    chainId,
    gasLimits,
    gasPrice,
    tokensData,
    marketsInfoData,
    gasPaymentTokenAddress: resolvedGasPaymentTokenAddress,
    relayerFeeTokenAddress: relayerFeeToken.address,
    gasPaymentToken,
    relayerFeeToken: resolvedRelayerFeeToken,
    tokenPermits,
    l1Reference,
    bufferBps,
    findFeeSwapPath,
  };
}

export type BuiltGlobalExpressParams = ReturnType<typeof buildGlobalExpressParams>;
