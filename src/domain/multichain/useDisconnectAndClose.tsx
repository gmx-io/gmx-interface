import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback } from "react";
import { useDisconnect } from "wagmi";

import { SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY, CURRENT_PROVIDER_LOCALSTORAGE_KEY } from "config/localStorage";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { userAnalytics } from "lib/userAnalytics";
import { DisconnectWalletEvent } from "lib/userAnalytics/types";
import { disconnectPrivyWalletsFromWagmi } from "lib/wallets/privyWagmi";

export function useDisconnectAndClose() {
  const { setIsSettingsVisible } = useSettings();
  const [, setIsVisible] = useGmxAccountModalOpen();
  const { logout } = usePrivy();
  const { wallets } = useWallets();
  const { disconnectAsync } = useDisconnect();

  const handleDisconnect = useCallback(async () => {
    userAnalytics.pushEvent<DisconnectWalletEvent>({
      event: "ConnectWalletAction",
      data: {
        action: "Disconnect",
      },
    });

    localStorage.removeItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY);
    localStorage.removeItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY);

    try {
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
  }, [disconnectAsync, logout, setIsVisible, setIsSettingsVisible, wallets]);

  return handleDisconnect;
}
