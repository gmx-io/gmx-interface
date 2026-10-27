import { useMemo } from "react";

import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { usePositionEditorPosition } from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import {
  selectGasLimits,
  selectGasPrice,
  selectUiFeeFactor,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectPositionEditorCollateralInputAmountAndUsd,
  selectPositionEditorDepositSwapAmounts,
} from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GasPaymentParams } from "domain/synthetics/express";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateOrderOraclePriceCount,
  getFeeItem,
  getTotalFeeItem,
} from "domain/synthetics/fees";
import type { NetworkFeeSource } from "domain/synthetics/fees/networkFeeSource";
import { DecreasePositionSwapType } from "domain/synthetics/orders";
import { getTradeFees, TradeFees } from "domain/synthetics/trade";
import { Operation } from "domain/synthetics/trade/usePositionEditorState";
import { useChainId } from "lib/chains";
import { getExecutionFee } from "sdk/utils/fees/executionFee";

export type Options = {
  operation: Operation;
  gasPaymentParams?: GasPaymentParams;
  feeSource?: NetworkFeeSource;
};

// todo make it a selector
export function usePositionEditorFees({ operation, gasPaymentParams }: Options) {
  const { chainId } = useChainId();
  const tokensData = useTokensData();

  const position = usePositionEditorPosition();

  const isDeposit = operation === Operation.Deposit;

  const { collateralDeltaUsd } = useSelector(selectPositionEditorCollateralInputAmountAndUsd);

  const depositSwapAmounts = useSelector(selectPositionEditorDepositSwapAmounts);
  const uiFeeFactor = useSelector(selectUiFeeFactor);

  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);

  return useMemo(() => {
    if (!position || !gasLimits || !tokensData || gasPrice === undefined) {
      return {};
    }

    const collateralBasisUsd = isDeposit ? position.collateralUsd + (collateralDeltaUsd ?? 0n) : position.collateralUsd;

    const fundingFee = getFeeItem(-position.pendingFundingFeesUsd, collateralBasisUsd);
    const borrowFee = getFeeItem(-position.pendingBorrowingFeesUsd, collateralBasisUsd);

    const swapPathStats = isDeposit ? depositSwapAmounts?.swapStrategy.swapPathStats : undefined;
    const swapsCount = swapPathStats?.swapPath.length ?? 0;
    const swapFees =
      swapPathStats && depositSwapAmounts
        ? getTradeFees({
            initialCollateralUsd: depositSwapAmounts.usdIn,
            sizeInUsd: 0n,
            sizeDeltaUsd: 0n,
            collateralDeltaUsd: 0n,
            swapSteps: swapPathStats.swapSteps,
            externalSwapQuote: undefined,
            positionFeeUsd: 0n,
            swapPriceImpactDeltaUsd: swapPathStats.totalSwapPriceImpactDeltaUsd,
            increasePositionPriceImpactDeltaUsd: 0n,
            totalPendingImpactDeltaUsd: 0n,
            proportionalPendingImpactDeltaUsd: 0n,
            decreasePositionPriceImpactDeltaUsd: 0n,
            priceImpactDiffUsd: 0n,
            borrowingFeeUsd: 0n,
            fundingFeeUsd: 0n,
            feeDiscountUsd: 0n,
            swapProfitFeeUsd: 0n,
            swapProfitUsdIn: 0n,
            uiFeeFactor,
            type: "increase",
          })
        : undefined;

    const totalFees = getTotalFeeItem([
      fundingFee,
      borrowFee,
      ...(swapFees?.swapFees ?? []),
      swapFees?.swapPriceImpact,
      swapFees?.uiSwapFee,
    ]);

    const fees: TradeFees = {
      totalFees,
      fundingFee,
      borrowFee,
      swapFees: swapFees?.swapFees,
      swapPriceImpact: swapFees?.swapPriceImpact,
      uiSwapFee: swapFees?.uiSwapFee,
    };

    const estimatedGas = isDeposit
      ? estimateExecuteIncreaseOrderGasLimit(gasLimits, {
          swapsCount,
        })
      : estimateExecuteDecreaseOrderGasLimit(gasLimits, {
          swapsCount: 0,
          decreaseSwapType: DecreasePositionSwapType.NoSwap,
        });

    const oraclePriceCount = estimateOrderOraclePriceCount(isDeposit ? swapsCount : 0);
    const executionFee = getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice, oraclePriceCount);

    return {
      fees,
      executionFee,
      gasPaymentParams,
    };
  }, [
    chainId,
    collateralDeltaUsd,
    depositSwapAmounts,
    gasLimits,
    gasPrice,
    isDeposit,
    position,
    tokensData,
    gasPaymentParams,
    uiFeeFactor,
  ]);
}
