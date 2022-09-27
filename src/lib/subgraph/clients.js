import { ApolloClient, InMemoryCache } from "@apollo/client";
import { SUBGRAPH_URLS } from "../../config/subgraph";
import { ARBITRUM, ARBITRUM_TESTNET, AVALANCHE } from "../../config/chains";

export const chainlinkClient = createClient(SUBGRAPH_URLS.chainLink);

export const arbitrumGraphClient = createClient(SUBGRAPH_URLS.arbitrumStats);
export const avalancheGraphClient = createClient(SUBGRAPH_URLS.avalancheStats);

export const nissohGraphClient = createClient(SUBGRAPH_URLS.nissohVault);

export const arbitrumReferralsGraphClient = createClient(SUBGRAPH_URLS.arbitrumReferrals);
export const avalancheReferralsGraphClient = createClient(SUBGRAPH_URLS.avalancheReferrals);

function createClient(uri) {
  return new ApolloClient({
    uri,
    cache: new InMemoryCache(),
  });
}

export function getGmxGraphClient(chainId) {
  if (chainId === ARBITRUM) {
    return arbitrumGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheGraphClient;
  } else if (chainId === ARBITRUM_TESTNET) {
    return null;
  }
  throw new Error(`Unsupported chain ${chainId}`);
}
