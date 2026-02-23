import { useEffect } from "react";
import { useAccount } from "wagmi";

import { SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";

export function useShowSupportChat() {
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  const [lastConnectedState, setLastConnectedState] = useLocalStorageSerializeKey<boolean>(
    SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY,
    false
  );

  const showWhileConnecting = (isConnecting || isReconnecting) && lastConnectedState;

  const shouldShowSupportChat = isConnected || showWhileConnecting;

  useEffect(() => {
    if (!isConnecting && !isReconnecting) {
      setLastConnectedState(isConnected);
    }
  }, [isConnecting, isReconnecting, isConnected, setLastConnectedState]);

  return {
    shouldShowSupportChat,
  };
}
