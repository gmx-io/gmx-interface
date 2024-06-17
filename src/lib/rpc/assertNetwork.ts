import { Provider } from "ethers";
import { getRealChainId } from "lib/chains/getRealChainId";

export async function assertNetwork(provider: Provider) {
  // Sometimes getNetwork call asserts the network itself, but its metamask, so we need to check it again
  const assumedChainId = Number((await provider.getNetwork()).chainId);
  const realChainId = getRealChainId();

  if (realChainId !== undefined && assumedChainId !== realChainId) {
    throw new Error(`Invalid network: wallet is connected to ${realChainId}, but the app is on ${assumedChainId}`);
  }
}
