import { zeroAddress } from "viem";

import { ARBITRUM, AVALANCHE, ContractsChainId } from "config/chains";
import { getToken } from "sdk/configs/tokens";

const MATCHA_NETWORK_NAMES: Partial<Record<ContractsChainId, string>> = {
  [ARBITRUM]: "arbitrum",
  [AVALANCHE]: "avalanche",
};

export function getMatchaBuyTokenUrl(chainId: ContractsChainId, tokenAddress: string): string {
  const networkName = MATCHA_NETWORK_NAMES[chainId];

  if (!networkName) {
    return "https://matcha.xyz";
  }

  // For some reason matcha uses symbols for native tokens instead of addresses
  const tokenName = tokenAddress === zeroAddress ? getToken(chainId, zeroAddress).symbol.toLowerCase() : tokenAddress;

  return `https://matcha.xyz/tokens/${networkName}/${tokenName}`;
}
