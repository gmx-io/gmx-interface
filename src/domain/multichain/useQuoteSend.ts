import useSWR from "swr";

import type { AnyChainId } from "config/chains";
import { SendParam } from "domain/multichain/types";
import { fetchLayerZeroNativeFee } from "domain/synthetics/markets/feeEstimation/stargateTransferFees";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

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
    quoteSendCondition
      ? ["quoteSend", sendParams.dstEid, sendParams.to, sendParams.amountLD, fromStargateAddress, composeGas]
      : null,
    {
      fetcher: async () => {
        if (!quoteSendCondition) {
          return;
        }

        return fetchLayerZeroNativeFee({ chainId: fromChainId, stargateAddress: fromStargateAddress, sendParams });
      },
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  return {
    data: quoteSendQuery.data,
    isLoading: quoteSendQuery.isLoading,
    error: quoteSendQuery.error,
  };
}
