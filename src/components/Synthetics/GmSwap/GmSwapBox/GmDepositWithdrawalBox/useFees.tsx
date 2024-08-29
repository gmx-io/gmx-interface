import { useMemo } from "react";

import { GlvMarketInfo } from "@/domain/synthetics/tokens/useGlvMarkets";
import {
  estimateExecuteDepositGasLimit,
  estimateExecuteGlvDepositGasLimit,
  estimateExecuteGlvWithdrawalGasLimit,
  estimateExecuteWithdrawalGasLimit,
  FeeItem,
  GasLimitsConfig,
  getExecutionFee,
  getFeeItem,
  getTotalFeeItem,
} from "domain/synthetics/fees";
import {
  estimateDepositOraclePriceCount,
  estimateGlvDepositOraclePriceCount,
  estimateGlvWithdrawalOraclePriceCount,
  estimateWithdrawalOraclePriceCount,
} from "domain/synthetics/fees/utils/estimateOraclePriceCount";
import { TokensData } from "domain/synthetics/tokens";
import { GmSwapFees } from "domain/synthetics/trade";
import { useDepositWithdrawalAmounts } from "./useDepositWithdrawalAmounts";

export const useFees = ({
  amounts,
  chainId,
  gasLimits,
  gasPrice,
  isDeposit,
  tokensData,
  glvMarket,
  isGlv,
  isMarketTokenDeposit,
}: {
  amounts: ReturnType<typeof useDepositWithdrawalAmounts>;
  chainId: number;
  gasLimits: GasLimitsConfig | undefined;
  gasPrice: bigint | undefined;
  isDeposit: boolean;
  tokensData: TokensData | undefined;
  glvMarket: GlvMarketInfo | undefined;
  isGlv;
  isMarketTokenDeposit: boolean;
}) => {
  return useMemo(() => {
    if (!gasLimits || gasPrice === undefined || !tokensData || !amounts) {
      return {};
    }

    const basisUsd = isDeposit
      ? (amounts?.longTokenUsd ?? 0n) + (amounts?.shortTokenUsd ?? 0n)
      : amounts?.marketTokenUsd || 0n;

    const swapFee = getFeeItem(amounts.swapFeeUsd * -1n, basisUsd);
    const swapPriceImpact = getFeeItem(amounts.swapPriceImpactDeltaUsd, basisUsd);
    const uiFee = getFeeItem(amounts.uiFeeUsd * -1n, basisUsd, {
      shouldRoundUp: true,
    });

    const totalFees = getTotalFeeItem([swapPriceImpact, swapFee, uiFee].filter(Boolean) as FeeItem[]);
    const fees: GmSwapFees = {
      swapFee,
      swapPriceImpact,
      totalFees,
      uiFee,
    };

    let gasLimit;
    let oraclePriceCount;

    const glvMarketsCount = BigInt(glvMarket?.markets?.length ?? 0);

    if (isGlv) {
      gasLimit = isDeposit
        ? estimateExecuteGlvDepositGasLimit(gasLimits, {
            marketsCount: glvMarketsCount,
            initialLongTokenAmount: amounts.longTokenAmount,
            initialShortTokenAmount: amounts.shortTokenAmount,
            isMarketTokenDeposit,
          })
        : estimateExecuteGlvWithdrawalGasLimit(gasLimits, {
            marketsCount: glvMarketsCount,
          });
    } else {
      gasLimit = isDeposit
        ? estimateExecuteDepositGasLimit(gasLimits, {
            initialLongTokenAmount: amounts.longTokenAmount,
            initialShortTokenAmount: amounts.shortTokenAmount,
          })
        : estimateExecuteWithdrawalGasLimit(gasLimits, {});
    }

    if (isGlv) {
      oraclePriceCount = isDeposit
        ? estimateGlvDepositOraclePriceCount(glvMarketsCount)
        : estimateGlvWithdrawalOraclePriceCount(glvMarketsCount);
    } else {
      oraclePriceCount = isDeposit ? estimateDepositOraclePriceCount(0) : estimateWithdrawalOraclePriceCount(0);
    }

    const executionFee = getExecutionFee(chainId, gasLimits, tokensData, gasLimit, gasPrice, oraclePriceCount);

    return {
      fees,
      executionFee,
    };
  }, [amounts, chainId, gasLimits, gasPrice, isDeposit, tokensData, glvMarket, isGlv, isMarketTokenDeposit]);
};
