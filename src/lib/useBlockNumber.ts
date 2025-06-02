import useSWR from "swr";

import { useJsonRpcProvider } from "./rpc";

export function useBlockNumber(chainId: number) {
  const { provider } = useJsonRpcProvider(chainId);

  const { data } = useSWR(provider ? ["useBlockNumber", chainId] : null, async () => {
    const blockNumber = await provider?.getBlockNumber();

    if (!blockNumber) {
      return undefined;
    }

    return BigInt(blockNumber);
  });

  return data;
}
