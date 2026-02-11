import Intercom, { onUnreadCountChange, shutdown, update } from "@intercom/messenger-js-sdk";
import { useEffect, useMemo, useRef } from "react";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { SUPPORT_CHAT_WAS_EVER_SHOWN_KEY } from "config/localStorage";
import { useTheme } from "context/ThemeContext/ThemeContext";
import { usePeriodAccountStats } from "domain/synthetics/accountStats/usePeriodAccountStats";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmountForMetrics } from "lib/metrics";

import { useAvailableToTradeAssetMultichain } from "components/GmxAccountModal/hooks";

import { INTERCOM_APP_ID, TIME_PERIODS } from "./constants";
import { useShowSupportChat } from "./useShowSupportChat";
import { useSupportChatUnreadCount } from "./useSupportChatUnreadCount";
import { useWalletPortfolioUsd } from "./useWalletPortfolioUsd";
import { getOrCreateSupportChatUserId, themeToIntercomTheme } from "./utils";

export function useSupportChat() {
  const {
    shouldShowSupportChat,
    isNonEoaAccountOnAnyChain,
    isNonEoaAccountOnAnyChainLoading,
    largeAccountVolumeStatsData,
    isLargeAccountVolumeStatsLoading,
  } = useShowSupportChat();
  const { address: account } = useAccount();
  const [, setSupportChatWasEverShown] = useLocalStorageSerializeKey<boolean>(SUPPORT_CHAT_WAS_EVER_SHOWN_KEY, false);
  const { themeMode } = useTheme();
  const { chainId, srcChainId } = useChainId();
  const initializedAddress = useRef<string | undefined>(undefined);

  const { data: lastMonthAccountStats, loading: isLastMonthAccountStatsLoading } = usePeriodAccountStats(chainId, {
    account,
    from: TIME_PERIODS.month[0],
    to: TIME_PERIODS.month[1],
    enabled: shouldShowSupportChat,
    refreshInterval: 0,
  });

  const { walletPortfolioUsd, isWalletPortfolioUsdLoading } = useWalletPortfolioUsd({
    enabled: shouldShowSupportChat,
  });

  const { gmxAccountUsd, isLoading: isGmxAccountUsdLoading } = useAvailableToTradeAssetMultichain({
    enabled: shouldShowSupportChat,
  });

  const [, setSupportChatUnreadCount] = useSupportChatUnreadCount();

  const customUserAttributes = useMemo(() => {
    if (
      isWalletPortfolioUsdLoading ||
      isLastMonthAccountStatsLoading ||
      isNonEoaAccountOnAnyChainLoading ||
      isLargeAccountVolumeStatsLoading ||
      isGmxAccountUsdLoading
    ) {
      return undefined;
    }

    return {
      "Total Volume": formatAmountForMetrics(
        largeAccountVolumeStatsData?.totalVolume,
        USD_DECIMALS,
        "toSecondOrderInt"
      ),
      "Last 30d Volume": formatAmountForMetrics(lastMonthAccountStats?.volume, USD_DECIMALS, "toSecondOrderInt"),
      "Wallet Portfolio USD": formatAmountForMetrics(walletPortfolioUsd, USD_DECIMALS, "toSecondOrderInt"),
      "GMX Account Portfolio USD": formatAmountForMetrics(gmxAccountUsd, USD_DECIMALS, "toSecondOrderInt"),
      "Active Network": getChainName(srcChainId ?? chainId),
      "Wallet Type": isNonEoaAccountOnAnyChain ? "Smart Wallet" : "EOA",
    };
  }, [
    isWalletPortfolioUsdLoading,
    isLastMonthAccountStatsLoading,
    isNonEoaAccountOnAnyChainLoading,
    isLargeAccountVolumeStatsLoading,
    isGmxAccountUsdLoading,
    largeAccountVolumeStatsData?.totalVolume,
    lastMonthAccountStats?.volume,
    walletPortfolioUsd,
    gmxAccountUsd,
    srcChainId,
    chainId,
    isNonEoaAccountOnAnyChain,
  ]);

  useEffect(() => {
    if (!shouldShowSupportChat) {
      return;
    }

    const supportChatUserId = getOrCreateSupportChatUserId();

    Intercom({
      app_id: INTERCOM_APP_ID,
      alignment: "left",
      horizontal_padding: 20,
      vertical_padding: 20,
      hide_default_launcher: true,
      hide_notifications: false,
      user_id: supportChatUserId,
    });

    onUnreadCountChange((unreadCount: number) => {
      setSupportChatUnreadCount(unreadCount);
    });

    setSupportChatWasEverShown(true);

    return () => {
      shutdown();
    };
  }, [shouldShowSupportChat, setSupportChatUnreadCount, setSupportChatWasEverShown]);

  useEffect(() => {
    if (!shouldShowSupportChat) {
      return;
    }

    update({
      theme_mode: themeToIntercomTheme(themeMode),
    });
  }, [shouldShowSupportChat, themeMode]);

  useEffect(() => {
    if (initializedAddress.current === account || !shouldShowSupportChat || !customUserAttributes) {
      return;
    }

    initializedAddress.current = account;
    update(customUserAttributes);
  }, [shouldShowSupportChat, customUserAttributes, account]);
}
