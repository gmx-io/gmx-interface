import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  getExecutionFee,
  getFeeItem,
  getTotalFeeItem,
} from "domain/synthetics/fees";
import { DecreasePositionSwapType } from "domain/synthetics/orders";
import { convertToUsd } from "domain/synthetics/tokens";
import { TradeFees } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useMemo } from "react";

import { usePositionEditorPosition } from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { selectGasLimits, selectGasPrice } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { estimateOrderOraclePriceCount } from "domain/synthetics/fees/utils/estimateOraclePriceCount";
import { Operation } from "../types";

export type Options = {
  selectedCollateralAddress?: string;
  collateralInputValue: string;
  operation: Operation;
};

export function usePositionEditorFees({ selectedCollateralAddress, collateralInputValue, operation }: Options) {
  const { chainId } = useChainId();
  const tokensData = useTokensData();

  const position = usePositionEditorPosition();

  const isDeposit = operation === Operation.Deposit;

  const collateralToken = getByKey(tokensData, selectedCollateralAddress);

  const collateralPrice = collateralToken?.prices.minPrice;

  const collateralDeltaAmount = parseValue(collateralInputValue || "0", collateralToken?.decimals || 0);
  const collateralDeltaUsd = convertToUsd(collateralDeltaAmount, collateralToken?.decimals, collateralPrice);

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
