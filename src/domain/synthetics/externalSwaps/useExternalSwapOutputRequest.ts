import { useMemo, useRef } from "react";
import useSWR from "swr";

import { BOTANIX } from "config/chains";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectBotanixStakingAssetsPerShare } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useDebounce } from "lib/debounce/useDebounce";
import { metrics, KyberSwapQuoteTiming } from "lib/metrics";
import { ContractsChainId } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { convertTokenAddress } from "sdk/configs/tokens";
import { getBotanixStakingExternalSwapQuote } from "sdk/utils/swap/botanixStaking";
import { ExternalSwapAggregator, ExternalSwapCalculationStrategy, ExternalSwapQuote } from "sdk/utils/trade/types";

import { getNeedTokenApprove, useTokensAllowanceData } from "../tokens";
import { getKyberSwapTxnData, KyberSwapQuote } from "./kyberSwap";
import { ExternalSwapRequestKey } from "./types";
import { getExternalSwapRequestKey, isAbortError, isAmountWithinKeyTolerance } from "./utils";

function useStableRequestAmountIn(
  amountIn: bigint | undefined,
  resetKey: string,
  stabilizationEnabled: boolean
): bigint | undefined {
  const ref = useRef<{ resetKey: string; value: bigint } | undefined>(undefined);

  if (amountIn === undefined || amountIn <= 0n) {
    ref.current = undefined;
    return undefined;
  }

  if (!stabilizationEnabled) {
    ref.current = undefined;
    return amountIn;
  }

  const prev = ref.current;
  if (!prev || prev.resetKey !== resetKey || !isAmountWithinKeyTolerance(amountIn, prev.value)) {
    ref.current = { resetKey, value: amountIn };
    return amountIn;
  }

  return prev.value;
}

type OutputRequestData = KyberSwapQuote & { requestKey: ExternalSwapRequestKey | undefined };

export function useExternalSwapOutputRequest({
  chainId,
  tokenInAddress,
  tokenOutAddress,
  receiverAddress,
  amountIn,
  slippage,
  gasPrice,
  strategy,
  enabled = true,
}: {
  chainId: ContractsChainId;
  tokenInAddress: string | undefined;
  tokenOutAddress: string | undefined;
  receiverAddress: string | undefined;
  amountIn: bigint | undefined;
  slippage: number | undefined;
  gasPrice: bigint | undefined;
  strategy: ExternalSwapCalculationStrategy | undefined;
  enabled?: boolean;
}) {
  const stableAmountIn = useStableRequestAmountIn(
    amountIn,
    `${tokenInAddress}:${tokenOutAddress}:${slippage}`,
    strategy === "leverageBySize"
  );

  const swapKey =
    enabled &&
    tokenInAddress &&
    tokenOutAddress &&
    receiverAddress &&
    tokenOutAddress !== tokenInAddress &&
    stableAmountIn !== undefined &&
    stableAmountIn > 0n &&
    slippage !== undefined &&
    gasPrice !== undefined
      ? `useExternalSwapsQuote:${chainId}:${tokenInAddress}:${tokenOutAddress}:${stableAmountIn}:${slippage}:${receiverAddress}`
      : null;

  const debouncedKey = useDebounce(swapKey, 300);

  const isDataUpToDate = debouncedKey === swapKey;

  const botanixAssetsPerShare = useSelector(selectBotanixStakingAssetsPerShare);

  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  const { data, error } = useSWR<OutputRequestData | undefined>(debouncedKey, {
    fetcher: async () => {
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        if (
          !tokenInAddress ||
          !tokenOutAddress ||
          !receiverAddress ||
          stableAmountIn === undefined ||
          slippage === undefined ||
          gasPrice === undefined
        ) {
          throw new Error("Invalid swap parameters");
        }

        const startTime = Date.now();

        if (chainId === BOTANIX) {
          return undefined;
        }

        const result = await getKyberSwapTxnData({
          chainId,
          senderAddress: getContract(chainId, "ExternalHandler"),
          receiverAddress,
          tokenInAddress,
          tokenOutAddress,
          amountIn: stableAmountIn,
          gasPrice,
          slippage,
          signal: abortController.signal,
        });

        metrics.pushTiming<KyberSwapQuoteTiming>("kyberSwap.quote.timing", Date.now() - startTime);

        if (!result) {
          throw new Error("Failed to fetch KyberSwap txn data");
        }

        const requestKey = getExternalSwapRequestKey({
          fromTokenAddress: tokenInAddress,
          toTokenAddress: tokenOutAddress,
          strategy,
          amountIn: stableAmountIn,
          desiredAmountOut: undefined,
          slippage,
        });

        return { ...result, requestKey };
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        // eslint-disable-next-line no-console
        console.error("Error fetching external swap quote", error);
        metrics.pushError(error, "externalSwap.useExternalSwapOutputRequest");
        throw error;
      }
    },
  });

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: enabled ? data?.to : undefined,
    tokenAddresses: enabled && tokenInAddress ? [convertTokenAddress(chainId, tokenInAddress, "wrapped")] : [],
  });

  const tokensData = useTokensData();

  return useMemo(() => {
    if (amountIn === undefined || !tokenInAddress || !tokenOutAddress || gasPrice === undefined || !receiverAddress) {
      return { error, isDataUpToDate };
    }

    const botanixStakingQuote =
      tokensData && botanixAssetsPerShare !== undefined && chainId === BOTANIX
        ? getBotanixStakingExternalSwapQuote({
            tokenInAddress,
            tokenOutAddress,
            amountIn,
            gasPrice,
            receiverAddress,
            tokensData,
            assetsPerShare: botanixAssetsPerShare,
          })
        : undefined;

    if (botanixStakingQuote) {
      const requestKey = getExternalSwapRequestKey({
        fromTokenAddress: tokenInAddress,
        toTokenAddress: tokenOutAddress,
        strategy,
        amountIn,
        desiredAmountOut: undefined,
        slippage,
      });
      return { quote: botanixStakingQuote, requestKey, error, isDataUpToDate };
    }

    if (!data) {
      return { error, isDataUpToDate };
    }

    const needSpenderApproval = getNeedTokenApprove(
      tokensAllowanceData,
      convertTokenAddress(chainId, tokenInAddress, "wrapped"),
      data.amountIn,
      []
    );

    const quote: ExternalSwapQuote = {
      aggregator: ExternalSwapAggregator.KyberSwap,
      inTokenAddress: tokenInAddress,
      outTokenAddress: tokenOutAddress,
      receiver: receiverAddress,
      amountIn: data.amountIn,
      amountOut: data.outputAmount,
      usdIn: data.usdIn,
      usdOut: data.usdOut,
      priceIn: data.priceIn,
      priceOut: data.priceOut,
      feesUsd: data.usdIn - data.usdOut,
      slippage: data.slippage,
      needSpenderApproval,
      txnData: {
        to: data.to,
        data: data.data,
        value: data.value,
        estimatedGas: data.estimatedGas,
        estimatedExecutionFee: data.estimatedGas * gasPrice,
      },
    };

    return { quote, requestKey: data.requestKey, error, isDataUpToDate };
  }, [
    amountIn,
    tokenInAddress,
    tokenOutAddress,
    gasPrice,
    receiverAddress,
    slippage,
    strategy,
    tokensData,
    botanixAssetsPerShare,
    chainId,
    data,
    error,
    tokensAllowanceData,
    isDataUpToDate,
  ]);
}
