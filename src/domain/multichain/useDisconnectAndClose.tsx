import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback } from "react";
import { useDisconnect } from "wagmi";

import { SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY, CURRENT_PROVIDER_LOCALSTORAGE_KEY } from "config/localStorage";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { metrics } from "lib/metrics";
import { userAnalytics } from "lib/userAnalytics";
import { DisconnectWalletEvent } from "lib/userAnalytics/types";
import { removeActivePrivyWalletFromStorage } from "lib/wallets/activeWalletStorage";

function pushRejectedReasons(results: PromiseSettledResult<unknown>[], context: string) {
  results.forEach((result) => {
    if (result.status === "rejected") {
      metrics.pushError(result.reason, context);
    }
  });
}

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
    removeActivePrivyWalletFromStorage();

    const disconnectResults = await Promise.allSettled([
      disconnectAsync(),
      ...wallets.map((wallet) => Promise.resolve().then(() => wallet.disconnect())),
    ]);
    const logoutResults = await Promise.allSettled([logout()]);

    pushRejectedReasons(disconnectResults, "disconnect.wallets");
    pushRejectedReasons(logoutResults, "disconnect.logout");

    setIsVisible(false);
    setIsSettingsVisible(false);
  }, [disconnectAsync, logout, setIsVisible, setIsSettingsVisible, wallets]);

  return handleDisconnect;
}
