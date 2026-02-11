import { useEffect, useMemo } from "react";
import { useAccount } from "wagmi";

import { SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY, SUPPORT_CHAT_WAS_EVER_SHOWN_KEY } from "config/localStorage";
import { useIsLargeAccountVolumeStats } from "domain/synthetics/accountStats/useIsLargeAccountData";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";

import {
  SUPPORT_CHAT_MIN_AGG_30_DAYS_VOLUME,
  SUPPORT_CHAT_MIN_AGG_ALL_TIME_VOLUME,
  SUPPORT_CHAT_MIN_WALLET_PORTFOLIO_USD,
} from "./constants";
import { useWalletPortfolioUsd } from "./useWalletPortfolioUsd";

export function useShowSupportChat() {
  const { isNonEoaAccountOnAnyChain, isLoading: isAccountTypeLoading } = useIsNonEoaAccountOnAnyChain();
  const { isConnected, address: account, isConnecting, isReconnecting } = useAccount();
  const { data: largeAccountVolumeStatsData, isLoading: isLargeAccountVolumeStatsLoading } =
    useIsLargeAccountVolumeStats({ account });
  const { walletPortfolioUsd, isWalletPortfolioUsdLoading } = useWalletPortfolioUsd();
  const [supportChatWasEverShown] = useLocalStorageSerializeKey<boolean>(SUPPORT_CHAT_WAS_EVER_SHOWN_KEY, false);
  const [lastConnectedState, setLastConnectedState] = useLocalStorageSerializeKey<boolean>(
    SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY,
    false
  );

  const totalVolume = largeAccountVolumeStatsData?.totalVolume;
  const last30DaysVolume = largeAccountVolumeStatsData?.last30DaysVolume;

  const isLargeAccountForSupportChat = useMemo(() => {
    const isTotalVolumeEligible = totalVolume !== undefined && totalVolume >= SUPPORT_CHAT_MIN_AGG_ALL_TIME_VOLUME;
    const isMonthlyVolumeEligible =
      last30DaysVolume !== undefined && last30DaysVolume >= SUPPORT_CHAT_MIN_AGG_30_DAYS_VOLUME;
    const isWalletPortfolioEligible =
      walletPortfolioUsd !== undefined && walletPortfolioUsd >= SUPPORT_CHAT_MIN_WALLET_PORTFOLIO_USD;

    return isTotalVolumeEligible || isMonthlyVolumeEligible || isWalletPortfolioEligible;
  }, [totalVolume, last30DaysVolume, walletPortfolioUsd]);

  const showWhileConnecting = (isConnecting || isReconnecting) && lastConnectedState;

  const isLoadedAndEligible =
    !isAccountTypeLoading &&
    !isLargeAccountVolumeStatsLoading &&
    !isWalletPortfolioUsdLoading &&
    isLargeAccountForSupportChat;

  const shouldShowSupportChat =
    (isConnected || showWhileConnecting) && (isLoadedAndEligible || supportChatWasEverShown);

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
