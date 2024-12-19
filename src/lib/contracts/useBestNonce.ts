import { JsonRpcSigner, Wallet } from "ethers";
import { useMemo } from "react";
import useSWR from "swr";
import { getBestNonce } from "./utils";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

export function useBestNonce(chainId: number, providers?: (Wallet | JsonRpcSigner)[]) {
  const { data } = useSWR<number | undefined>(
    providers?.length ? ["useSubaccountBestNonce", chainId, ...providers.map((p) => p.address)] : null,
    {
      refreshInterval: FREQUENT_UPDATE_INTERVAL,
      fetcher: async () => {
        if (!providers?.length) {
          return undefined;
        }

        const bestNonce = await getBestNonce(providers);

        return bestNonce;
      },
    }
  );

  return useMemo(() => {
    return { data };
  }, [data]);
}
