import { FALLBACK_PROVIDERS, RPC_PROVIDERS } from "config/chains";
import _ from "lodash";
import { ethers } from "ethers";
import { Web3ReactContextInterface } from "@web3-react/core/dist/types";
import { JsonRpcProvider } from "@ethersproject/providers";

export function getProvider(
  library: Web3ReactContextInterface["library"] | undefined,
  chainId: number
): JsonRpcProvider {
  let provider;

  if (library) {
    return library.getSigner();
  }

  provider = _.sample(RPC_PROVIDERS[chainId]);

  return new ethers.providers.StaticJsonRpcProvider(
    provider,
    // @ts-ignore incorrect Network param types
    { chainId }
  );
}

export function getFallbackProvider(chainId: number) {
  if (!FALLBACK_PROVIDERS[chainId]) {
    return;
  }

  const provider = _.sample(FALLBACK_PROVIDERS[chainId]);

  return new ethers.providers.StaticJsonRpcProvider(
    provider,
    // @ts-ignore incorrect Network param types
    { chainId }
  );
}
