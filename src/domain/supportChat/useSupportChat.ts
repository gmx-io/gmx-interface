import Intercom, { onUnreadCountChange, shutdown, update } from "@intercom/messenger-js-sdk";
import { useEffect, useMemo, useRef } from "react";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useTheme } from "context/ThemeContext/ThemeContext";
import { useIsLargeAccountVolumeStats } from "domain/synthetics/accountStats/useIsLargeAccountData";
import { useChainId } from "lib/chains";
import { formatAmountForMetrics } from "lib/metrics";
import { tradingErrorTracker } from "lib/tradingErrorTracker";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";

import { useAvailableToTradeAssetMultichain } from "components/GmxAccountModal/hooks";

import { INTERCOM_APP_ID } from "./constants";
import { getTraderTier } from "./getTraderTier";
import { useShowSupportChat } from "./useShowSupportChat";
import { useSupportChatUnreadCount } from "./useSupportChatUnreadCount";
import { useWalletPortfolioUsd } from "./useWalletPortfolioUsd";
import { getOrCreateSupportChatUserId, themeToIntercomTheme } from "./utils";

export function useSupportChat() {
  const { shouldShowSupportChat } = useShowSupportChat();
  const { address: account, connector } = useAccount();
  const { isNonEoaAccountOnAnyChain, isLoading: isNonEoaAccountOnAnyChainLoading } = useIsNonEoaAccountOnAnyChain();
  const { data: largeAccountVolumeStatsData, isLoading: isLargeAccountVolumeStatsLoading } =
    useIsLargeAccountVolumeStats({ account });
  const { walletPortfolioUsd, isWalletPortfolioUsdLoading } = useWalletPortfolioUsd();
  const { expressOrdersEnabled } = useSettings();
  const { subaccount } = useSubaccountContext();
  const { themeMode } = useTheme();
  const { chainId, srcChainId } = useChainId();
  const initializedAddress = useRef<string | undefined>(undefined);

  const { gmxAccountUsd, isLoading: isGmxAccountUsdLoading } = useAvailableToTradeAssetMultichain({
    enabled: shouldShowSupportChat,
  });

  const [, setSupportChatUnreadCount] = useSupportChatUnreadCount();

  const customUserAttributes = useMemo(() => {
    if (
      isWalletPortfolioUsdLoading ||
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
      "Last 30d Volume": formatAmountForMetrics(
        largeAccountVolumeStatsData?.last30DaysVolume,
        USD_DECIMALS,
        "toSecondOrderInt"
      ),
      "Wallet Portfolio USD": formatAmountForMetrics(walletPortfolioUsd, USD_DECIMALS, "toSecondOrderInt"),
      "GMX Account Portfolio USD": formatAmountForMetrics(gmxAccountUsd, USD_DECIMALS, "toSecondOrderInt"),
      Tier: getTraderTier({
        volume30d: largeAccountVolumeStatsData?.last30DaysVolume,
        volumeLifetime: largeAccountVolumeStatsData?.totalVolume,
        walletPortfolio: walletPortfolioUsd,
        gmxAccount: gmxAccountUsd,
      }),
      "Active Network": getChainName(srcChainId ?? chainId),
      "Wallet Type": isNonEoaAccountOnAnyChain ? "Smart Wallet" : "EOA",
      "Trading Mode": !expressOrdersEnabled ? "Classic" : subaccount ? "OneClick" : "Express",
    };
  }, [
    isWalletPortfolioUsdLoading,
    isNonEoaAccountOnAnyChainLoading,
    isLargeAccountVolumeStatsLoading,
    isGmxAccountUsdLoading,
    largeAccountVolumeStatsData?.totalVolume,
    largeAccountVolumeStatsData?.last30DaysVolume,
    walletPortfolioUsd,
    gmxAccountUsd,
    srcChainId,
    chainId,
    isNonEoaAccountOnAnyChain,
    expressOrdersEnabled,
    subaccount,
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

    return () => {
      shutdown();
    };
  }, [shouldShowSupportChat, setSupportChatUnreadCount]);

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

  useEffect(() => {
    tradingErrorTracker.setSupportChatContext({
      walletAddress: account,
      walletProvider: connector?.name,
      network: getChainName(srcChainId ?? chainId),
    });
  }, [account, connector?.name, srcChainId, chainId]);
}
