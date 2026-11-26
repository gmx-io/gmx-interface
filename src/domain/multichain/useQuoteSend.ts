import useSWR from "swr";

import type { AnyChainId, SettlementChainId, SourceChainId } from "config/chains";
import { retryStargateQuoteOnError } from "domain/multichain/stargateErrors";
import { SendParam } from "domain/multichain/types";
import {
  fetchLayerZeroNativeFee,
  stargateTransferFees,
} from "domain/synthetics/markets/feeEstimation/stargateTransferFees";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

export function useQuoteSendNativeFee({
  sendParams,
  fromStargateAddress,
  fromChainId,
  toChainId,
  composeGas,
}: {
  sendParams: SendParam | undefined;
  fromStargateAddress: string | undefined;
  fromChainId: AnyChainId | undefined;
  toChainId: AnyChainId | undefined;
  composeGas?: bigint;
}): {
  data: bigint | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const quoteSendCondition =
    sendParams !== undefined &&
    fromStargateAddress !== undefined &&
    toChainId !== undefined &&
    fromChainId !== undefined &&
    fromChainId !== toChainId;

  const quoteSendQuery = useSWR<bigint | undefined>(
    quoteSendCondition ? ["quoteSend", sendParams!.dstEid, sendParams!.to, fromStargateAddress, composeGas] : null,
    {
      fetcher: async () => {
        if (!quoteSendCondition) {
          return;
        }

        return fetchLayerZeroNativeFee({
          chainId: fromChainId!,
          stargateAddress: fromStargateAddress!,
          sendParams: sendParams!,
        });
      },
      refreshInterval: FREQUENT_UPDATE_INTERVAL,
      onErrorRetry: retryStargateQuoteOnError,
    }
  );

  return {
    data: quoteSendQuery.data,
    isLoading: quoteSendQuery.isLoading,
    error: quoteSendQuery.error,
  };
}

export type QuoteSendResult = {
  nativeFee: bigint;
  gasLimit: bigint;
};

export function useQuoteSendNativeFeeWithGasLimit({
  sendParams,
  fromStargateAddress,
  fromChainId,
  toChainId,
  fromTokenAddress,
  composeGas,
  isBaseQuote = false,
}: {
  sendParams: SendParam | undefined;
  fromStargateAddress: string | undefined;
  fromChainId: AnyChainId | undefined;
  toChainId: AnyChainId | undefined;
  fromTokenAddress: string | undefined;
  composeGas?: bigint;
  /** A sample amount that follows the price; keyed without it so price ticks don't refetch */
  isBaseQuote?: boolean;
}): {
  data: QuoteSendResult | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const quoteSendCondition =
    sendParams !== undefined &&
    fromStargateAddress !== undefined &&
    fromTokenAddress !== undefined &&
    toChainId !== undefined &&
    fromChainId !== undefined &&
    fromChainId !== toChainId;

  // The estimate reverts above the path's credit, so the entered amount gets its own key: on a key shared with the
  // base quote, swr kept the base quote's error and retried with the base quote's fetcher
  const quoteSendQuery = useSWR<QuoteSendResult | undefined>(
    quoteSendCondition
      ? [
          "quoteSend",
          sendParams.dstEid,
          sendParams.to,
          isBaseQuote ? "base" : sendParams.amountLD,
          fromStargateAddress,
          fromTokenAddress,
          composeGas,
        ]
      : null,
    {
      fetcher: async () => {
        if (!quoteSendCondition) {
          return;
        }

        const { nativeFee, transferGasLimit } = await stargateTransferFees({
          chainId: fromChainId as SettlementChainId | SourceChainId,
          stargateAddress: fromStargateAddress,
          sendParams,
          tokenAddress: fromTokenAddress,
        });

        return { nativeFee, gasLimit: transferGasLimit };
      },
      refreshInterval: FREQUENT_UPDATE_INTERVAL,
      onErrorRetry: retryStargateQuoteOnError,
    }
  );

  return {
    data: quoteSendQuery.data,
    isLoading: quoteSendQuery.isLoading,
    error: quoteSendQuery.error,
  };
}
