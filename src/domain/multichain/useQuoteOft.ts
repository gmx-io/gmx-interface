import useSWR from "swr";

import type { AnyChainId } from "config/chains";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";

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
}): QuoteOft | undefined {
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
    }
  );

  const quoteOft = quoteOftQuery.data;

  return quoteOft;
}
