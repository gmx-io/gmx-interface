import { useMemo } from "react";

import {
  estimateExecuteDepositGasLimit,
  estimateExecuteGlvDepositGasLimit,
  estimateExecuteGlvWithdrawalGasLimit,
  estimateExecuteWithdrawalGasLimit,
  estimateDepositOraclePriceCount,
  estimateGlvDepositOraclePriceCount,
  estimateGlvWithdrawalOraclePriceCount,
  estimateWithdrawalOraclePriceCount,
  getFeeItem,
  getTotalFeeItem,
  type FeeItem,
  type GasLimitsConfig,
} from "domain/synthetics/fees";
import { GlvInfo } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import { GmSwapFees } from "domain/synthetics/trade";
import { getExecutionFee } from "sdk/utils/fees/executionFee";

import { useDepositWithdrawalAmounts } from "./useDepositWithdrawalAmounts";

export const useDepositWithdrawalFees = ({
  amounts,
  chainId,
  gasLimits,
  gasPrice,
  isDeposit,
  tokensData,
  glvInfo,
  isMarketTokenDeposit,
}: {
  amounts: ReturnType<typeof useDepositWithdrawalAmounts>;
  chainId: number;
  gasLimits: GasLimitsConfig | undefined;
  gasPrice: bigint | undefined;
  isDeposit: boolean;
  tokensData: TokensData | undefined;
  glvInfo: GlvInfo | undefined;
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

    const glvMarketsCount = BigInt(glvInfo?.markets?.length ?? 0);

    if (glvInfo) {
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

      oraclePriceCount = isDeposit
        ? estimateGlvDepositOraclePriceCount(glvMarketsCount)
        : estimateGlvWithdrawalOraclePriceCount(glvMarketsCount);
    } else {
      gasLimit = isDeposit
        ? estimateExecuteDepositGasLimit(gasLimits, {})
        : estimateExecuteWithdrawalGasLimit(gasLimits, {});
      oraclePriceCount = isDeposit ? estimateDepositOraclePriceCount(0) : estimateWithdrawalOraclePriceCount(0);
    }

    const executionFee = getExecutionFee(chainId, gasLimits, tokensData, gasLimit, gasPrice, oraclePriceCount);

    return {
      fees,
      executionFee,
    };
  }, [amounts, chainId, gasLimits, gasPrice, isDeposit, tokensData, glvInfo, isMarketTokenDeposit]);
};
