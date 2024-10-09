import { ARBITRUM, AVALANCHE } from "config/chains";
import { getContract } from "config/contracts";
import { getByKey } from "lib/objects";
import { getMidPrice, useTokensDataRequest } from ".";

export function useGmxPrice(chainId) {
  const chainIdForGmxPrice = chainId === ARBITRUM ? ARBITRUM : AVALANCHE;
  const { tokensData } = useTokensDataRequest(chainIdForGmxPrice);

  const gmxToken = getByKey(tokensData, getContract(chainIdForGmxPrice, "GMX"));
  const gmxPrice = gmxToken ? getMidPrice(gmxToken.prices) : undefined;

  return {
    gmxPrice,
  };
}
