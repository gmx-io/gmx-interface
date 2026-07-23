import { useMemo, useRef } from "react";
import useSWR from "swr";

import { BOTANIX } from "config/chains";
import { useDebounce } from "lib/debounce/useDebounce";
import { metrics } from "lib/metrics";
import { ContractsChainId } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import { convertTokenAddress } from "sdk/configs/tokens";
import { ExternalSwapAggregator, ExternalSwapQuote } from "sdk/utils/trade/types";

import { getNeedTokenApprove, useTokensAllowanceData } from "../tokens";
import { getKyberSwapBuildFromRoute, KyberSwapQuote } from "./kyberSwap";
import { searchAmountInForDesiredOutput } from "./searchAmountInForDesiredOutput";
import { ExternalSwapRequestKey } from "./types";
import { getExternalSwapRequestKey, inflateAmountForSlippage, isAbortError } from "./utils";

class InputRequestNoResultError extends Error {
  constructor() {
    super("ExternalSwap input request: insufficient liquidity");
    this.name = "InputRequestNoResultError";
  }
}

type InputRequestData = KyberSwapQuote & { desiredAmountOut: bigint; requestKey: ExternalSwapRequestKey | undefined };

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

  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  const isDataUpToDate = debouncedKey === swapKey;

  const { data, error: swrError } = useSWR<InputRequestData | undefined>(debouncedKey, {
    fetcher: async () => {
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

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
          signal: abortController.signal,
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
          signal: abortController.signal,
        });

        if (!result) {
          throw new InputRequestNoResultError();
        }

        const requestKey = getExternalSwapRequestKey({
          fromTokenAddress: tokenInAddress,
          toTokenAddress: tokenOutAddress,
          strategy: "byToValue",
          amountIn: initialAmountIn,
          desiredAmountOut,
          slippage,
        });

        return { ...result, desiredAmountOut, requestKey };
      } catch (error) {
        if (!(error instanceof InputRequestNoResultError) && !isAbortError(error)) {
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

  return useMemo(() => {
    if (
      !tokenInAddress ||
      !tokenOutAddress ||
      gasPrice === undefined ||
      !receiverAddress ||
      desiredAmountOut === undefined ||
      slippage === undefined
    ) {
      return { error: swrError, isDataUpToDate };
    }

    if (!data || swrError) {
      return { error: swrError, isDataUpToDate };
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

    return { quote, requestKey: data.requestKey, error: swrError, isDataUpToDate };
  }, [
    tokenInAddress,
    tokenOutAddress,
    gasPrice,
    receiverAddress,
    desiredAmountOut,
    slippage,
    data,
    swrError,
    tokensAllowanceData,
    chainId,
    isDataUpToDate,
  ]);
}
