import { ARBITRUM, RPC_PROVIDERS } from "config/chains";
import { getContract } from "config/contracts";
import ReaderV2 from "abis/ReaderV2.json";
import { useChainId } from "lib/chains";
import { Multicall } from "ethereum-multicall";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

const CONFIG = {
  [ARBITRUM]: {
    ReaderV2: {
      contractAddress: getContract(ARBITRUM, "Reader"),
      abi: ReaderV2.abi,
    },
  },
};

export function useContract(name: string) {
  const { chainId } = useChainId();

  return CONFIG[chainId]?.[name];
}

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
