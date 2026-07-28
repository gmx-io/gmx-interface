import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";

import { SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useSearchParams from "lib/useSearchParams";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";

export function useShowSupportChat() {
  const { isConnected } = useAccount();
  const isWalletInitializing = useIsWalletInitializing();
  const [lastConnectedState, setLastConnectedState] = useLocalStorageSerializeKey<boolean>(
    SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY,
    false
  );

  const { openChat } = useSearchParams<{ openChat?: string }>();
  // Latched on first render so the widget doesn't shut back down once AppRoutes strips the "openChat" param.
  const shouldOpenChatOnBoot = useRef(Boolean(openChat)).current;

  const showWhileConnecting = isWalletInitializing && lastConnectedState;

  const shouldShowSupportChat = isConnected || showWhileConnecting || shouldOpenChatOnBoot;

  useEffect(() => {
    if (!isWalletInitializing) {
      setLastConnectedState(isConnected);
    }
  }, [isWalletInitializing, isConnected, setLastConnectedState]);

  return {
    shouldShowSupportChat,
    shouldOpenChatOnBoot,
  };
}
