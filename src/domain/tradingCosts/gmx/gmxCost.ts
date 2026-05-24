import {
  getBorrowingFeeRateUsd,
  getCappedPositionImpactUsd,
  estimateOrderOraclePriceCount,
  getFundingFeeRateUsd,
  getPositionFee,
  type GasLimitsConfig,
} from "domain/synthetics/fees";
import { DecreasePositionSwapType } from "domain/synthetics/orders";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  getExecutionFee,
} from "sdk/utils/fees/executionFee";
import type { MarketInfo } from "sdk/utils/markets/types";
import type { TokensData } from "sdk/utils/tokens/types";

import { sumTradingCostComponents } from "../costs";
import type { TradingCostBreakdown, TradingCostComponent, TradingCostSide } from "../types";

function estimateGmxNetworkFeeUsd({
  chainId,
  gasLimits,
  gasPrice,
  tokensData,
}: {
  chainId: number;
  gasLimits: GasLimitsConfig | undefined;
  gasPrice: bigint | undefined;
  tokensData: TokensData | undefined;
}) {
  if (!gasLimits || gasPrice === undefined || !tokensData) {
    return 0n;
  }

  const increaseGasLimit = estimateExecuteIncreaseOrderGasLimit(gasLimits, { swapsCount: 0, callbackGasLimit: 0n });
  const decreaseGasLimit = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
    swapsCount: 0,
    callbackGasLimit: 0n,
    decreaseSwapType: DecreasePositionSwapType.NoSwap,
  });
  const oraclePriceCount = estimateOrderOraclePriceCount(0);

  const increaseFee =
    getExecutionFee(chainId, gasLimits, tokensData, increaseGasLimit, gasPrice, oraclePriceCount)?.feeUsd ?? 0n;
  const decreaseFee =
    getExecutionFee(chainId, gasLimits, tokensData, decreaseGasLimit, gasPrice, oraclePriceCount)?.feeUsd ?? 0n;

  return increaseFee + decreaseFee;
}

export function getGmxTradingCostBreakdown({
  marketInfo,
  sizeUsd,
  side,
  holdingPeriodHours,
  chainId = 42161,
  gasLimits,
  gasPrice,
  tokensData,
  timestamp,
}: {
  marketInfo: MarketInfo;
  sizeUsd: bigint;
  side: TradingCostSide;
  holdingPeriodHours: number;
  chainId?: number;
  gasLimits: GasLimitsConfig | undefined;
  gasPrice: bigint | undefined;
  tokensData: TokensData | undefined;
  timestamp: number;
}): TradingCostBreakdown {
  const isLong = side === "long";
  const openImpact = getCappedPositionImpactUsd(marketInfo, sizeUsd, isLong, true, {
    fallbackToZero: true,
    shouldCapNegativeImpact: true,
  });
  const closeImpact = getCappedPositionImpactUsd(marketInfo, sizeUsd, isLong, false, {
    fallbackToZero: true,
    shouldCapNegativeImpact: true,
  });

  const openPositionFee = getPositionFee(marketInfo, sizeUsd, openImpact.balanceWasImproved, undefined).positionFeeUsd;
  const closePositionFee = getPositionFee(marketInfo, sizeUsd, false, undefined).positionFeeUsd;
  const periodSeconds = BigInt(Math.round(holdingPeriodHours * 3600));
  const borrowingFeeUsd = getBorrowingFeeRateUsd(marketInfo, isLong, sizeUsd, periodSeconds);
  const fundingRateUsd = getFundingFeeRateUsd(marketInfo, isLong, sizeUsd, periodSeconds);
  const networkFeeUsd = estimateGmxNetworkFeeUsd({ chainId, gasLimits, gasPrice, tokensData });

  const components: TradingCostComponent[] = [
    { key: "protocolFee", label: "Protocol fee", usd: openPositionFee + closePositionFee },
    { key: "openPriceImpact", label: "Open price impact", usd: -openImpact.priceImpactDeltaUsd },
    { key: "closePriceImpact", label: "Close price impact", usd: -closeImpact.priceImpactDeltaUsd },
    { key: "netRate", label: "Net-rate cost", usd: borrowingFeeUsd - fundingRateUsd },
    { key: "networkFee", label: "Network fee", usd: networkFeeUsd },
  ];

  return {
    providerId: "gmx",
    totalUsd: sumTradingCostComponents(components),
    components,
    timestamp,
    status: "ready",
    warnings: [
      "Collateral swap routing is not included.",
      "Account-specific referral discounts are not included.",
      "Results are current estimates, not guaranteed execution quotes.",
    ],
  };
}
