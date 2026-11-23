import { useMemo } from "react";
import useSWR from "swr";

import type { AnyChainId } from "config/chains";
import { RANDOM_ACCOUNT } from "config/multichain";
import { expandDecimals } from "lib/numbers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";

import { getMultichainTransferSendParams } from "./getSendParams";
import { retryStargateQuoteOnError } from "./stargateErrors";
import type { QuoteOft, SendParam } from "./types";

export function useQuoteOft({
  sendParams,
  fromStargateAddress,
  fromChainId,
  toChainId,
}: {
  sendParams: SendParam | undefined;
  fromStargateAddress: string | undefined;
  fromChainId: AnyChainId | undefined;
  toChainId: AnyChainId | undefined;
}): {
  data: QuoteOft | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const quoteOftCondition =
    sendParams !== undefined &&
    fromStargateAddress !== undefined &&
    toChainId !== undefined &&
    fromChainId !== undefined &&
    fromChainId !== toChainId;

  const quoteOftQuery = useSWR<QuoteOft | undefined>(
    quoteOftCondition
      ? ["quoteOft", sendParams.dstEid, sendParams.to, sendParams.amountLD, fromStargateAddress, fromChainId]
      : null,
    {
      fetcher: async () => {
        if (!quoteOftCondition || !fromChainId) {
          return;
        }

        const publicClient = getPublicClientWithRpc(fromChainId);

        // TODO: add timing metrics
        const [limit, oftFeeDetails, receipt] = await publicClient.readContract({
          address: fromStargateAddress,
          abi: abis.IStargate,
          functionName: "quoteOFT",
          args: [sendParams],
        });

        return {
          limit,
          oftFeeDetails,
          receipt,
        };
      },
      refreshInterval: CONFIG_UPDATE_INTERVAL,
      onErrorRetry: retryStargateQuoteOnError,
    }
  );

  return {
    data: quoteOftQuery.data,
    isLoading: quoteOftQuery.isLoading,
    error: quoteOftQuery.error,
  };
}

// A FeeLib pause (error) and an empty path (maxAmountLD = 0) show only in quoteOFT. This quote of one whole token keeps
// one key while the input, the price or the compose gas estimate change, so the route state doesn't drop in between
export function useQuoteOftProbe({
  fromStargateAddress,
  fromChainId,
  toChainId,
  decimals,
}: {
  fromStargateAddress: string | undefined;
  fromChainId: AnyChainId | undefined;
  toChainId: AnyChainId | undefined;
  decimals: number | undefined;
}) {
  const sendParams = useMemo(() => {
    if (fromChainId === undefined || toChainId === undefined || decimals === undefined || fromChainId === toChainId) {
      return undefined;
    }

    return getMultichainTransferSendParams({
      srcChainId: fromChainId,
      dstChainId: toChainId,
      account: RANDOM_ACCOUNT.address,
      amountLD: expandDecimals(1, decimals),
      isToGmx: false,
    });
  }, [decimals, fromChainId, toChainId]);

  return useQuoteOft({ sendParams, fromStargateAddress, fromChainId, toChainId });
}
