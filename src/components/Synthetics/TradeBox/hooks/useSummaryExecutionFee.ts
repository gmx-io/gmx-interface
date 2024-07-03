import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useTradeboxExecutionFee } from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import {
  estimateExecuteDecreaseOrderGasLimit,
  getExecutionFee,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import { estimateOrderOraclePriceCount } from "domain/synthetics/fees/utils/estimateOraclePriceCount";
import { DecreasePositionSwapType } from "domain/synthetics/orders";
import { SidecarLimitOrderEntry, SidecarSlTpOrderEntry } from "domain/synthetics/sidecarOrders/types";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";
import { convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { useCallback, useMemo } from "react";

export const useSummaryExecutionFee = () => {
  const executionFee = useTradeboxExecutionFee();
  const sidecarEntries = useSidecarEntries();
  const tokensData = useTokensData();

  const { chainId } = useChainId();

  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);

  const getOrderExecutionFee = useCallback(
    (swapsCount: number, decreasePositionSwapType: DecreasePositionSwapType | undefined) => {
      if (!gasLimits || !tokensData || gasPrice === undefined) return;

      const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
        decreaseSwapType: decreasePositionSwapType,
        swapsCount: swapsCount ?? 0,
      });

      const oraclePriceCount = estimateOrderOraclePriceCount(swapsCount);

      return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice, oraclePriceCount);
    },
    [gasLimits, tokensData, gasPrice, chainId]
  );

  const getExecutionFeeAmountForEntry = useCallback(
    (entry: SidecarSlTpOrderEntry | SidecarLimitOrderEntry) => {
      if (!entry.txnType || entry.txnType === "cancel") return undefined;
      const securedExecutionFee = entry.order?.executionFee ?? 0n;

      let swapsCount = 0;

      const executionFee = getOrderExecutionFee(swapsCount, entry.decreaseAmounts?.decreaseSwapType);

      if (!executionFee || securedExecutionFee >= executionFee.feeTokenAmount) return undefined;

      return executionFee.feeTokenAmount - securedExecutionFee;
    },
    [getOrderExecutionFee]
  );

  const summaryExecutionFee = useMemo(() => {
    if (!executionFee) return undefined;

    const { feeUsd, feeTokenAmount, feeToken, warning } = executionFee;

    const feeTokenData = getByKey(tokensData, feeToken?.address);

    let summaryFeeUsd = feeUsd ?? 0n;
    let summaryFeeTokenAmount = feeTokenAmount ?? 0n;

    sidecarEntries.forEach((entry) => {
      const entryFee = getExecutionFeeAmountForEntry(entry) ?? 0n;

      summaryFeeTokenAmount = summaryFeeTokenAmount + entryFee;
      summaryFeeUsd =
        summaryFeeUsd + (convertToUsd(entryFee, feeToken?.decimals, feeTokenData?.prices?.minPrice) ?? 0n);
    });

    return {
      feeUsd: summaryFeeUsd,
      feeTokenAmount: summaryFeeTokenAmount,
      feeToken,
      warning,
    };
  }, [executionFee, sidecarEntries, getExecutionFeeAmountForEntry, tokensData]);

  return {
    summaryExecutionFee,
    getOrderExecutionFee,
    getExecutionFeeAmountForEntry,
  };
};
