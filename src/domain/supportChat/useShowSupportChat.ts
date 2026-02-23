import { useEffect } from "react";
import { useAccount } from "wagmi";

import { SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY } from "config/localStorage";
import { useIsLargeAccountVolumeStats } from "domain/synthetics/accountStats/useIsLargeAccountData";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";

import { useWalletPortfolioUsd } from "./useWalletPortfolioUsd";

export function useShowSupportChat() {
  const { isNonEoaAccountOnAnyChain, isLoading: isAccountTypeLoading } = useIsNonEoaAccountOnAnyChain();
  const { isConnected, address: account, isConnecting, isReconnecting } = useAccount();
  const { data: largeAccountVolumeStatsData, isLoading: isLargeAccountVolumeStatsLoading } =
    useIsLargeAccountVolumeStats({ account });
  const { walletPortfolioUsd, isWalletPortfolioUsdLoading } = useWalletPortfolioUsd();
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
    isNonEoaAccountOnAnyChain,
    isNonEoaAccountOnAnyChainLoading: isAccountTypeLoading,
    largeAccountVolumeStatsData,
    isLargeAccountVolumeStatsLoading,
    walletPortfolioUsd,
    isWalletPortfolioUsdLoading,
  };
}
