import { useMemo } from "react";

import {
  type ExecutionFee,
  type FeeItem,
  type GasLimitsConfig,
  estimateExecuteShiftGasLimit,
  getExecutionFee,
  getFeeItem,
  getTotalFeeItem,
} from "domain/synthetics/fees";
import { estimateShiftOraclePriceCount } from "domain/synthetics/fees/utils/estimateOraclePriceCount";
import type { TokensData } from "domain/synthetics/tokens/types";
import type { GmSwapFees } from "domain/synthetics/trade/types";
import type { ShiftAmounts } from "domain/synthetics/trade/utils/shift";

export function useShiftFees({
  gasLimits,
  gasPrice,
  tokensData,
  amounts,
  chainId,
}: {
  gasLimits: GasLimitsConfig | undefined;
  gasPrice: bigint | undefined;
  tokensData: TokensData | undefined;
  amounts: ShiftAmounts | undefined;
  chainId: number;
}): { fees?: GmSwapFees; executionFee?: ExecutionFee } {
  return useMemo(() => {
    if (!gasLimits || gasPrice === undefined || !tokensData || !amounts) {
      return {};
    }

    const basisUsd = amounts.fromTokenUsd;

    const swapPriceImpact = getFeeItem(amounts.swapPriceImpactDeltaUsd, basisUsd);
    const uiFee = getFeeItem(amounts.uiFeeUsd * -1n, basisUsd, {
      shouldRoundUp: true,
    });
    const shiftFee = getFeeItem(0n, basisUsd);

    const totalFees = getTotalFeeItem([swapPriceImpact, uiFee].filter(Boolean) as FeeItem[]);
    const fees: GmSwapFees = {
      swapPriceImpact,
      totalFees,
      uiFee,
      shiftFee,
    };

    const gasLimit = estimateExecuteShiftGasLimit(gasLimits, {
      callbackGasLimit: 0n,
    });

    const oraclePriceCount = estimateShiftOraclePriceCount();

    const executionFee = getExecutionFee(chainId, gasLimits, tokensData, gasLimit, gasPrice, oraclePriceCount);

    return {
      fees,
      executionFee,
    };
  }, [amounts, chainId, gasLimits, gasPrice, tokensData]);
}
