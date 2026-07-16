import { useEffect } from "react";
import { useAccount } from "wagmi";

import { SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";

export function useShowSupportChat() {
  const { isConnected } = useAccount();
  const isWalletInitializing = useIsWalletInitializing();
  const [lastConnectedState, setLastConnectedState] = useLocalStorageSerializeKey<boolean>(
    SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY,
    false
  );

  const showWhileConnecting = isWalletInitializing && lastConnectedState;

  const shouldShowSupportChat = isConnected || showWhileConnecting;

  useEffect(() => {
    if (!isWalletInitializing) {
      setLastConnectedState(isConnected);
    }
  }, [isWalletInitializing, isConnected, setLastConnectedState]);

  return {
    shouldShowSupportChat,
  };
}
