import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { BOTANIX } from "config/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import { metrics } from "lib/metrics";
import { ContractsChainId } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { convertTokenAddress } from "sdk/configs/tokens";
import { ExternalSwapAggregator, ExternalSwapQuote } from "sdk/utils/trade/types";

import { getNeedTokenApprove, useTokensAllowanceData } from "../tokens";
import { getKyberSwapBuildFromRoute, getKyberSwapRoute, KyberSwapQuote, KyberSwapRouteResult } from "./kyberSwap";

class ReverseSearchNoResultError extends Error {
  constructor() {
    super("Reverse search: insufficient liquidity");
    this.name = "ReverseSearchNoResultError";
  }
}

const MAX_ITERATIONS = 5;
const CONVERGENCE_THRESHOLD_BPS = 50n; // 0.5% tolerance
const MIN_OUTPUT_RATIO_BPS = 5000n; // 50% - stop if output is less than 50% of desired

async function reverseSearchAmountIn({
  chainId,
  tokenInAddress,
  tokenOutAddress,
  desiredAmountOut,
  initialAmountIn,
  gasPrice,
}: {
  chainId: ContractsChainId;
  tokenInAddress: string;
  tokenOutAddress: string;
  desiredAmountOut: bigint;
  initialAmountIn: bigint;
  gasPrice: bigint;
}): Promise<{ amountIn: bigint; routeResult: KyberSwapRouteResult } | undefined> {
  let amountIn = initialAmountIn;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (amountIn <= 0n) {
      return undefined;
    }

    const routeResult = await getKyberSwapRoute({
      chainId,
      tokenInAddress,
      tokenOutAddress,
      amountIn,
      gasPrice,
    });

    if (!routeResult) {
      return undefined;
    }

    const outputAmount = routeResult.outputAmount;

    if (outputAmount <= 0n) {
      return undefined;
    }

    // Check if first iteration output is way too low (divergence protection)
    if (i === 0 && (outputAmount * 10000n) / desiredAmountOut < MIN_OUTPUT_RATIO_BPS) {
      return undefined;
    }

    // Check convergence
    const diff = outputAmount > desiredAmountOut ? outputAmount - desiredAmountOut : desiredAmountOut - outputAmount;

    const diffBps = (diff * 10000n) / desiredAmountOut;

    if (diffBps <= CONVERGENCE_THRESHOLD_BPS) {
      return { amountIn, routeResult };
    }

    // Secant method: adjust amountIn proportionally
    const newAmountIn = (amountIn * desiredAmountOut) / outputAmount;

    // Protection against exponential growth
    if (newAmountIn > amountIn * 3n) {
      return undefined;
    }

    amountIn = newAmountIn;
  }

  return undefined;
}

export function useExternalSwapReverseSearch({
  chainId,
  tokenInAddress,
  tokenOutAddress,
  receiverAddress,
  desiredAmountOut,
  initialAmountIn,
  slippage,
  gasPrice,
  enabled = true,
}: {
  chainId: ContractsChainId;
  tokenInAddress: string | undefined;
  tokenOutAddress: string | undefined;
  receiverAddress: string | undefined;
  desiredAmountOut: bigint | undefined;
  initialAmountIn: bigint | undefined;
  slippage: number | undefined;
  gasPrice: bigint | undefined;
  enabled?: boolean;
}) {
  const swapKey =
    enabled &&
    tokenInAddress &&
    tokenOutAddress &&
    receiverAddress &&
    tokenOutAddress !== tokenInAddress &&
    desiredAmountOut !== undefined &&
    desiredAmountOut > 0n &&
    initialAmountIn !== undefined &&
    initialAmountIn > 0n &&
    slippage !== undefined &&
    gasPrice !== undefined
      ? `useExternalSwapReverseSearch:${chainId}:${tokenInAddress}:${tokenOutAddress}:${desiredAmountOut}:${slippage}:${receiverAddress}`
      : null;

  const debouncedKey = useDebounce(swapKey, 300);

  // Track user params (tokens + desiredAmount) separately from background params (gasPrice)
  const userParamsKey =
    enabled && tokenInAddress && tokenOutAddress && desiredAmountOut !== undefined && desiredAmountOut > 0n
      ? `${tokenInAddress}:${tokenOutAddress}:${desiredAmountOut}`
      : null;
  const {
    data,
    error: swrError,
    isLoading: isSWRLoading,
  } = useSWR<KyberSwapQuote | undefined>(debouncedKey, {
    fetcher: async () => {
      try {
        if (
          !tokenInAddress ||
          !tokenOutAddress ||
          !receiverAddress ||
          desiredAmountOut === undefined ||
          initialAmountIn === undefined ||
          slippage === undefined ||
          gasPrice === undefined
        ) {
          return undefined;
        }

        if (chainId === BOTANIX) {
          return undefined;
        }

        // Target more than desired to compensate for execution variance and slippage.
        // This ensures the user receives at least desiredAmountOut after all deductions.
        const slippageBps = BigInt(slippage);
        const targetAmountOut = (desiredAmountOut * 10000n) / (10000n - slippageBps);

        const searchResult = await reverseSearchAmountIn({
          chainId,
          tokenInAddress,
          tokenOutAddress,
          desiredAmountOut: targetAmountOut,
          initialAmountIn,
          gasPrice,
        });

        if (!searchResult) {
          throw new ReverseSearchNoResultError();
        }

        const result = await getKyberSwapBuildFromRoute({
          chainId,
          routeSummary: searchResult.routeResult.routeSummary,
          senderAddress: getContract(chainId, "ExternalHandler"),
          receiverAddress,
          slippage,
          tokenInAddress,
          tokenOutAddress,
          gasPrice,
        });

        if (!result) {
          throw new ReverseSearchNoResultError();
        }

        return result;
      } catch (error) {
        if (!(error instanceof ReverseSearchNoResultError)) {
          metrics.pushError(error, "externalSwap.useExternalSwapReverseSearch");
        }
        throw error;
      }
    },
  });

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: data?.to,
    tokenAddresses: tokenInAddress ? [convertTokenAddress(chainId, tokenInAddress, "wrapped")] : [],
  });

  const prevDataRef = useRef<typeof data>(undefined);
  const prevErrorRef = useRef<typeof swrError>(undefined);
  const [resolvedUserParams, setResolvedUserParams] = useState<string | null>(null);

  useEffect(() => {
    const dataChanged = data !== prevDataRef.current;
    const errorChanged = swrError !== prevErrorRef.current;
    prevDataRef.current = data;
    prevErrorRef.current = swrError;

    if (dataChanged && data && userParamsKey) {
      setResolvedUserParams(userParamsKey);
    }
    if (errorChanged && swrError && userParamsKey && !isSWRLoading) {
      setResolvedUserParams(userParamsKey);
    }
    if (!enabled) {
      setResolvedUserParams(null);
    }
  }, [data, swrError, isSWRLoading, userParamsKey, enabled]);

  const isLoading = userParamsKey !== null && userParamsKey !== resolvedUserParams;

  return useMemo(() => {
    if (
      desiredAmountOut === undefined ||
      !tokenInAddress ||
      !tokenOutAddress ||
      gasPrice === undefined ||
      !receiverAddress
    ) {
      return { isLoading: false };
    }

    if (!data || swrError) {
      return { isLoading: isLoading && enabled && !swrError };
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
      needSpenderApproval,
      txnData: {
        to: data.to,
        data: data.data,
        value: data.value,
        estimatedGas: data.estimatedGas,
        estimatedExecutionFee: data.estimatedGas * gasPrice,
      },
    };

    return {
      quote,
      isLoading,
    };
  }, [
    desiredAmountOut,
    tokenInAddress,
    tokenOutAddress,
    gasPrice,
    receiverAddress,
    data,
    swrError,
    isLoading,
    enabled,
    tokensAllowanceData,
    chainId,
  ]);
}
