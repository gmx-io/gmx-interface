import { getProvider } from "lib/rpc";
import useSWR from "swr";

export function useRawGasPrice(chainId: number) {
  const { data: gasPrice } = useSWR<bigint | undefined>(["useRawGasPrice", chainId], {
    fetcher: async () => {
      const provider = getProvider(undefined, chainId);

      if (!provider) {
        return;
      }

      const feeData = await provider.getFeeData();
      let gasPrice = feeData.gasPrice ?? 0n;

      return gasPrice;
    },
  });

  return gasPrice === undefined ? undefined : BigInt(gasPrice);
}
