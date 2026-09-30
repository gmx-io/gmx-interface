import { useEffect, useRef } from "react";
import { useSessionStorage } from "react-use";
import { useAccount } from "wagmi";

import { SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useSearchParams from "lib/useSearchParams";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";

import { SUPPORT_CHAT_OPENED_WITHOUT_WALLET_SESSION_KEY } from "./constants";

export function useShowSupportChat() {
  const { isConnected } = useAccount();
  const isWalletInitializing = useIsWalletInitializing();
  const [lastConnectedState, setLastConnectedState] = useLocalStorageSerializeKey<boolean>(
    SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY,
    false
  );

  const { openChat } = useSearchParams<{ openChat?: string }>();
  const shouldOpenChatOnBoot = useRef(Boolean(openChat)).current;
  const [wasOpenedWithoutWallet, setWasOpenedWithoutWallet] = useSessionStorage<boolean>(
    SUPPORT_CHAT_OPENED_WITHOUT_WALLET_SESSION_KEY,
    shouldOpenChatOnBoot
  );

  const showWhileConnecting = isWalletInitializing && lastConnectedState;

  const shouldShowSupportChat = isConnected || showWhileConnecting || wasOpenedWithoutWallet;

  useEffect(() => {
    if (shouldOpenChatOnBoot) {
      setWasOpenedWithoutWallet(true);
    }
  }, [shouldOpenChatOnBoot, setWasOpenedWithoutWallet]);

  useEffect(() => {
    if (isConnected) {
      setWasOpenedWithoutWallet(false);
    }
  }, [isConnected, setWasOpenedWithoutWallet]);

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
