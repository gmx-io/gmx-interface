import { FALLBACK_PROVIDERS, RPC_PROVIDERS } from "../../config/chains";
import _ from "lodash";
import { ethers } from "ethers";

export function getProvider(library, chainId) {
  let provider;
  if (library) {
    return library.getSigner();
  }
  provider = _.sample(RPC_PROVIDERS[chainId]);
  return new ethers.providers.StaticJsonRpcProvider(provider, { chainId });
}

export function getFallbackProvider(chainId) {
  if (!FALLBACK_PROVIDERS[chainId]) {
    return;
  }

  const provider = _.sample(FALLBACK_PROVIDERS[chainId]);
  return new ethers.providers.StaticJsonRpcProvider(provider, { chainId });
}
