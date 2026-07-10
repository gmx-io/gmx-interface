import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect } from "react";
import { useAccount } from "wagmi";

import { SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";

export function useShowSupportChat() {
  const { address: account, isConnected, isConnecting, isReconnecting } = useAccount();
  const { ready: isPrivyReady } = usePrivy();
  const { ready: isWalletsReady, wallets } = useWallets();
  const [lastConnectedState, setLastConnectedState] = useLocalStorageSerializeKey<boolean>(
    SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY,
    false
  );

  // @privy-io/wagmi forces reconnectOnMount: false, so while Privy restores the session on page load
  // wagmi reports plain "disconnected" (never "reconnecting")
  const isWalletInitializing =
    !isPrivyReady || !isWalletsReady || (wallets.length > 0 && !account) || isConnecting || isReconnecting;

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
