import { RPC_PROVIDERS } from "config/chains";
import { Multicall } from "ethereum-multicall";
import { ethers } from "ethers";
import { useChainId } from "lib/chains";
import { useEffect, useState } from "react";

export function useMulticallLib() {
  const [instance, setInstance] = useState<Multicall>();
  const { chainId } = useChainId();

  useEffect(() => {
    const providerUrl = RPC_PROVIDERS[chainId][0];

    const provider = new ethers.providers.StaticJsonRpcProvider(
      providerUrl,
      // @ts-ignore incorrect Network param types
      { chainId }
    );

    // @ts-ignore
    const multicall = new Multicall({ ethersProvider: provider, tryAggregate: true });
    setInstance(multicall);
  }, [chainId]);

  return instance;
}
