import { useMemo } from "react";

import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { usePositionEditorPosition } from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { selectGasLimits, selectGasPrice } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectPositionEditorCollateralInputAmountAndUsd } from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  getFeeItem,
  getTotalFeeItem,
} from "domain/synthetics/fees";
import { estimateOrderOraclePriceCount } from "domain/synthetics/fees";
import { DecreasePositionSwapType } from "domain/synthetics/orders";
import { TradeFees } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { getExecutionFee } from "sdk/utils/fees/executionFee";

import { Operation } from "../types";

export type Options = {
  operation: Operation;
};

// todo make it a selector
export function usePositionEditorFees({ operation }: Options) {
  const { chainId } = useChainId();
  const tokensData = useTokensData();

  const position = usePositionEditorPosition();

  const isDeposit = operation === Operation.Deposit;

  const { collateralDeltaUsd } = useSelector(selectPositionEditorCollateralInputAmountAndUsd);

  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);

  return useMemo(() => {
    if (!position || !gasLimits || !tokensData || gasPrice === undefined) {
      return {};
    }

    const collateralBasisUsd = isDeposit ? position.collateralUsd + (collateralDeltaUsd ?? 0n) : position.collateralUsd;

    const fundingFee = getFeeItem(-position.pendingFundingFeesUsd, collateralBasisUsd);
    const borrowFee = getFeeItem(-position.pendingBorrowingFeesUsd, collateralBasisUsd);
    const totalFees = getTotalFeeItem([fundingFee, borrowFee]);

    const fees: TradeFees = {
      totalFees,
      fundingFee,
      borrowFee,
    };

    const estimatedGas = isDeposit
      ? estimateExecuteIncreaseOrderGasLimit(gasLimits, {
          swapsCount: 0,
        })
      : estimateExecuteDecreaseOrderGasLimit(gasLimits, {
          swapsCount: 0,
          decreaseSwapType: DecreasePositionSwapType.NoSwap,
        });

    const oraclePriceCount = estimateOrderOraclePriceCount(0);
    const executionFee = getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice, oraclePriceCount);

    return {
      fees,
      executionFee,
    };
  }, [chainId, collateralDeltaUsd, gasLimits, gasPrice, isDeposit, position, tokensData]);
}
