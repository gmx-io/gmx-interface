import Intercom, { boot, onUnreadCountChange, show, shutdown, update } from "@intercom/messenger-js-sdk";
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
import { AccountType, useAccountType } from "lib/wallets/useAccountType";

import { useAvailableToTradeAssetMultichain } from "components/GmxAccountModal/hooks";

import { INTERCOM_APP_ID } from "./constants";
import { getTraderTier } from "./getTraderTier";
import { useShowSupportChat } from "./useShowSupportChat";
import { useSupportChatUnreadCount } from "./useSupportChatUnreadCount";
import { useWalletPortfolioUsd } from "./useWalletPortfolioUsd";
import { getOrCreateSupportChatUserId, themeToIntercomTheme } from "./utils";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.SmartAccount]: "Smart Wallet",
  [AccountType.PostEip7702EOA]: "EOA",
  [AccountType.EOA]: "EOA",
};

export function useSupportChat() {
  const { shouldShowSupportChat, shouldOpenChatOnBoot } = useShowSupportChat();
  const { address: account, connector } = useAccount();
  const { accountType, isLoading: isAccountTypeLoading } = useAccountType();
  const { data: largeAccountVolumeStatsData, isLoading: isLargeAccountVolumeStatsLoading } =
    useIsLargeAccountVolumeStats({ account });
  const { walletPortfolioUsd, isWalletPortfolioUsdLoading } = useWalletPortfolioUsd();
  const { expressOrdersEnabled } = useSettings();
  const { subaccount } = useSubaccountContext();
  const { themeMode } = useTheme();
  const { chainId, srcChainId } = useChainId();
  const initializedAddress = useRef<string | undefined>(undefined);
  const wasIntercomInitialized = useRef(false);
  const themeModeRef = useRef(themeMode);
  themeModeRef.current = themeMode;
  const lastSentIntercomTheme = useRef<ReturnType<typeof themeToIntercomTheme> | undefined>(undefined);

  const { gmxAccountUsd, isLoading: isGmxAccountUsdLoading } = useAvailableToTradeAssetMultichain({
    enabled: shouldShowSupportChat,
  });

  const [, setSupportChatUnreadCount] = useSupportChatUnreadCount();

  const customUserAttributes = useMemo(() => {
    if (
      isWalletPortfolioUsdLoading ||
      isAccountTypeLoading ||
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
      "Wallet Type": accountType === undefined ? undefined : ACCOUNT_TYPE_LABELS[accountType],
      "Trading Mode": !expressOrdersEnabled ? "Classic" : subaccount ? "OneClick" : "Express",
    };
  }, [
    isWalletPortfolioUsdLoading,
    isAccountTypeLoading,
    isLargeAccountVolumeStatsLoading,
    isGmxAccountUsdLoading,
    largeAccountVolumeStatsData?.totalVolume,
    largeAccountVolumeStatsData?.last30DaysVolume,
    walletPortfolioUsd,
    gmxAccountUsd,
    srcChainId,
    chainId,
    accountType,
    expressOrdersEnabled,
    subaccount,
  ]);

  useEffect(() => {
    if (!shouldShowSupportChat) {
      return;
    }

    const supportChatUserId = getOrCreateSupportChatUserId();

    const intercomSettings = {
      app_id: INTERCOM_APP_ID,
      alignment: "left",
      horizontal_padding: 20,
      vertical_padding: 20,
      hide_default_launcher: true,
      hide_notifications: false,
      user_id: supportChatUserId,
      // theme goes into the boot settings: update({ theme_mode }) during the boot window
      // suppresses the initial unread count delivery in the Intercom widget
      theme_mode: themeToIntercomTheme(themeModeRef.current),
    };
    lastSentIntercomTheme.current = intercomSettings.theme_mode;

    if (wasIntercomInitialized.current) {
      // Intercom() is a no-op after the first call; after shutdown() only boot() revives the messenger
      boot(intercomSettings);
    } else {
      Intercom(intercomSettings);
      wasIntercomInitialized.current = true;
    }

    onUnreadCountChange((unreadCount: number) => {
      setSupportChatUnreadCount(unreadCount);
    });

    // show() must run on every boot: the cleanup's shutdown() closes the messenger,
    // so a consumed-once flag would leave the StrictMode remount without an open chat
    if (shouldOpenChatOnBoot) {
      show();
    }

    return () => {
      shutdown();
      initializedAddress.current = undefined;
    };
  }, [shouldShowSupportChat, shouldOpenChatOnBoot, setSupportChatUnreadCount]);

  useEffect(() => {
    if (!shouldShowSupportChat) {
      return;
    }

    const intercomTheme = themeToIntercomTheme(themeMode);

    // only on actual theme switches: an update({ theme_mode }) right after boot suppresses
    // the initial unread count delivery in the Intercom widget
    if (lastSentIntercomTheme.current === intercomTheme) {
      return;
    }

    lastSentIntercomTheme.current = intercomTheme;
    update({
      theme_mode: intercomTheme,
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
