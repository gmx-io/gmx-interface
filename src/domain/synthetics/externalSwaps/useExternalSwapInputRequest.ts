import { useMemo } from "react";
import useSWR from "swr";

import { BOTANIX } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { useDebounce } from "lib/debounce/useDebounce";
import { metrics } from "lib/metrics";
import { ContractsChainId } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { convertTokenAddress } from "sdk/configs/tokens";
import { ExternalSwapAggregator, ExternalSwapQuote } from "sdk/utils/trade/types";

import { getNeedTokenApprove, useTokensAllowanceData } from "../tokens";
import { getKyberSwapBuildFromRoute, getKyberSwapRoute, KyberSwapQuote, KyberSwapRouteResult } from "./kyberSwap";
import { useExternalSwapQuoteLoadingState } from "./useExternalSwapQuoteLoadingState";
import { inflateAmountForSlippage } from "./utils";

class InputRequestNoResultError extends Error {
  constructor() {
    super("ExternalSwap input request: insufficient liquidity");
    this.name = "InputRequestNoResultError";
  }
}

type InputRequestData = KyberSwapQuote & { desiredAmountOut: bigint };

const MAX_ITERATIONS = 5;
const CONVERGENCE_THRESHOLD_BPS = 50n; // 0.5% tolerance
const MIN_OUTPUT_RATIO_BPS = 5000n; // 50% - stop if output is less than 50% of desired

async function searchAmountInForDesiredOutput({
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
    if (amountIn <= 0n) return undefined;

    const routeResult = await getKyberSwapRoute({
      chainId,
      tokenInAddress,
      tokenOutAddress,
      amountIn,
      gasPrice,
    });

    if (!routeResult) return undefined;

    const outputAmount = routeResult.outputAmount;
    if (outputAmount <= 0n) return undefined;

    // First-iteration divergence guard: KyberSwap returned a route with wildly lower output than
    // oracle-seeded expectation — signals a dead pool or extreme price impact, not worth iterating.
    if (i === 0 && (outputAmount * BASIS_POINTS_DIVISOR_BIGINT) / desiredAmountOut < MIN_OUTPUT_RATIO_BPS) {
      return undefined;
    }

    const diff = outputAmount > desiredAmountOut ? outputAmount - desiredAmountOut : desiredAmountOut - outputAmount;
    const diffBps = (diff * BASIS_POINTS_DIVISOR_BIGINT) / desiredAmountOut;

    if (diffBps <= CONVERGENCE_THRESHOLD_BPS) {
      return { amountIn, routeResult };
    }

    const newAmountIn = (amountIn * desiredAmountOut) / outputAmount;

    // Exponential-growth guard: secant step blew up (would 3x amountIn in one step).
    if (newAmountIn > amountIn * 3n) return undefined;

    amountIn = newAmountIn;
  }

  return undefined;
}

export function useExternalSwapInputRequest({
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
      ? `useExternalSwapInputRequest:${chainId}:${tokenInAddress}:${tokenOutAddress}:${desiredAmountOut}:${slippage}:${receiverAddress}`
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
  } = useSWR<InputRequestData | undefined>(debouncedKey, {
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
        const targetAmountOut = inflateAmountForSlippage(desiredAmountOut, BigInt(slippage));

        const searchResult = await searchAmountInForDesiredOutput({
          chainId,
          tokenInAddress,
          tokenOutAddress,
          desiredAmountOut: targetAmountOut,
          initialAmountIn,
          gasPrice,
        });

        if (!searchResult) {
          throw new InputRequestNoResultError();
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
          throw new InputRequestNoResultError();
        }

        return { ...result, desiredAmountOut };
      } catch (error) {
        if (!(error instanceof InputRequestNoResultError)) {
          metrics.pushError(error, "externalSwap.useExternalSwapInputRequest");
        }
        throw error;
      }
    },
  });

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: enabled ? data?.to : undefined,
    tokenAddresses: enabled && tokenInAddress ? [convertTokenAddress(chainId, tokenInAddress, "wrapped")] : [],
  });

  const isLoading = useExternalSwapQuoteLoadingState({
    userParamsKey,
    data,
    error: swrError,
    isInitialFetch: isSWRLoading,
    enabled,
  });

  return useMemo(() => {
    if (
      !tokenInAddress ||
      !tokenOutAddress ||
      gasPrice === undefined ||
      !receiverAddress ||
      desiredAmountOut === undefined ||
      slippage === undefined
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
      slippage: data.slippage,
      needSpenderApproval,
      desiredAmountOut: data.desiredAmountOut,
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
    tokenInAddress,
    tokenOutAddress,
    gasPrice,
    receiverAddress,
    desiredAmountOut,
    slippage,
    data,
    swrError,
    isLoading,
    enabled,
    tokensAllowanceData,
    chainId,
  ]);
}
