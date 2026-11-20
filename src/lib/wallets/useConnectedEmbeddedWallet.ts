import { getEmbeddedConnectedWallet, useWallets } from "@privy-io/react-auth";
import { isAddressEqual } from "viem";
import { useAccount } from "wagmi";

/** The Privy embedded wallet, only while it is the account the app trades with */
export function useConnectedEmbeddedWallet() {
  const { address } = useAccount();
  const { wallets } = useWallets();
  const embeddedWallet = getEmbeddedConnectedWallet(wallets);

  if (!embeddedWallet || !address || !isAddressEqual(embeddedWallet.address, address)) {
    return undefined;
  }

  return embeddedWallet;
}
