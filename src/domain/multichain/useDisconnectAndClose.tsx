import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback } from "react";
import { useAccount, useDisconnect } from "wagmi";

import { SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY, CURRENT_PROVIDER_LOCALSTORAGE_KEY } from "config/localStorage";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useChainId } from "lib/chains";
import { userAnalytics } from "lib/userAnalytics";
import { DisconnectWalletEvent } from "lib/userAnalytics/types";
import { disconnectPrivyWalletsFromWagmi } from "lib/wallets/privyWagmi";
import { clearRememberedSolanaWallet } from "solana-interface/wallet/solanaWalletSession";
import { useSolanaWallet } from "solana-interface/wallet/useSolanaWallet";

export function useDisconnectAndClose() {
  const { setIsSettingsVisible } = useSettings();
  const [, setIsVisible] = useGmxAccountModalOpen();
  const { logout } = usePrivy();
  const { wallets } = useWallets();
  const { disconnectAsync } = useDisconnect();
  const { isSolana } = useChainId();
  const { address: evmAddress } = useAccount();
  const solanaWallet = useSolanaWallet();

  const handleDisconnect = useCallback(async () => {
    userAnalytics.pushEvent<DisconnectWalletEvent>({
      event: "ConnectWalletAction",
      data: {
        action: "Disconnect",
      },
    });

    try {
      if (isSolana) {
        clearRememberedSolanaWallet();
        await Promise.resolve(solanaWallet.wallet?.disconnect()).catch(() => undefined);
        // Privy keeps embedded EVM wallets in useWallets() until logout, so an empty list never happens.
        if (!evmAddress) {
          await Promise.allSettled([logout()]);
        }
        return;
      }

      localStorage.removeItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY);
      localStorage.removeItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY);

      // Mark Privy-backed wagmi connectors disconnected before and after provider disconnects:
      // injected wallets can mutate wagmi storage while their disconnect handlers run.
      await disconnectPrivyWalletsFromWagmi(wallets);

      await Promise.allSettled([
        disconnectAsync(),
        ...wallets.map((wallet) => Promise.resolve().then(() => wallet.disconnect())),
      ]);
      await disconnectPrivyWalletsFromWagmi(wallets);
      await Promise.allSettled([logout()]);
    } finally {
      setIsVisible(false);
      setIsSettingsVisible(false);
    }
  }, [
    disconnectAsync,
    evmAddress,
    isSolana,
    logout,
    setIsVisible,
    setIsSettingsVisible,
    solanaWallet.wallet,
    wallets,
  ]);

  return handleDisconnect;
}
