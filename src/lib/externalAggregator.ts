import { zeroAddress } from "viem";

import {
  AnyChainId,
  ARBITRUM,
  AVALANCHE,
  getViemChain,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_ETHEREUM_MAINNET,
} from "config/chains";
import { isMegaEthChain, JUMPER_EXCHANGE_URL } from "config/links";

const EXTERNAL_AGGREGATOR_NETWORK_NAMES: Partial<Record<AnyChainId, string>> = {
  [ARBITRUM]: "arbitrum",
  [AVALANCHE]: "avalanche",
  [SOURCE_BASE_MAINNET]: "base",
  [SOURCE_BSC_MAINNET]: "bsc",
  [SOURCE_ETHEREUM_MAINNET]: "ethereum",
};

export function getExternalAggregatorBuyTokenUrl(chainId: AnyChainId, tokenAddress: string): string {
  if (isMegaEthChain(chainId)) {
    return JUMPER_EXCHANGE_URL;
  }

  const networkName = EXTERNAL_AGGREGATOR_NETWORK_NAMES[chainId];

  if (!networkName) {
    return "https://matcha.xyz";
  }

  // For some reason matcha uses symbols for native tokens instead of addresses
  const tokenName =
    tokenAddress === zeroAddress ? getViemChain(chainId).nativeCurrency.symbol.toLowerCase() : tokenAddress;

  return `https://matcha.xyz/tokens/${networkName}/${tokenName}`;
}
