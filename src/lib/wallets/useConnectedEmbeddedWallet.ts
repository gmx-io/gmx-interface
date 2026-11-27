import { getEmbeddedConnectedWallet, useWallets } from "@privy-io/react-auth";
import { isAddressEqual } from "viem";
import { useAccount } from "wagmi";

import { getPrivyWagmiConnectorId } from "./privyWagmi";

/** The Privy embedded wallet, only while it is the account the app trades with */
export function useConnectedEmbeddedWallet() {
  const { address, connector } = useAccount();
  const { wallets } = useWallets();
  const embeddedWallet = getEmbeddedConnectedWallet(wallets);

  if (
    !embeddedWallet ||
    !address ||
    !isAddressEqual(embeddedWallet.address, address) ||
    // an external wallet that imported the exported embedded key has the same address
    connector?.id !== getPrivyWagmiConnectorId(embeddedWallet)
  ) {
    return undefined;
  }

  return embeddedWallet;
}
