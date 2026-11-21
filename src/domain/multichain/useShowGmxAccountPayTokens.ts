import { getNetworkFeatures } from "config/features";
import { isSettlementChain } from "config/multichain";
import { useChainId } from "lib/chains";

/** On Solana chainId still reads Arbitrum, so the settlement-chain check alone would offer GMX Account pay tokens. */
export function useShowGmxAccountPayTokens(chainId: number) {
  const { networkId } = useChainId();

  return getNetworkFeatures(networkId).gmxAccount && isSettlementChain(chainId);
}
