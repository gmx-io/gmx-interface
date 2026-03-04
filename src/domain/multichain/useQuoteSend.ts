import useSWR from "swr";

import type { AnyChainId, SettlementChainId, SourceChainId } from "config/chains";
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
    }
  );

  return {
    data: quoteSendQuery.data,
    isLoading: quoteSendQuery.isLoading,
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
}: {
  sendParams: SendParam | undefined;
  fromStargateAddress: string | undefined;
  fromChainId: AnyChainId | undefined;
  toChainId: AnyChainId | undefined;
  fromTokenAddress: string | undefined;
  composeGas?: bigint;
}): {
  data: QuoteSendResult | undefined;
  isLoading: boolean;
} {
  const quoteSendCondition =
    sendParams !== undefined &&
    fromStargateAddress !== undefined &&
    fromTokenAddress !== undefined &&
    toChainId !== undefined &&
    fromChainId !== undefined &&
    fromChainId !== toChainId;

  const quoteSendQuery = useSWR<QuoteSendResult | undefined>(
    quoteSendCondition
      ? ["quoteSend", sendParams.dstEid, sendParams.to, fromStargateAddress, fromTokenAddress, composeGas]
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
    }
  );

  return {
    data: quoteSendQuery.data,
    isLoading: quoteSendQuery.isLoading,
  };
}
