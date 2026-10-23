import Intercom, { boot, onUnreadCountChange, show, shutdown, update } from "@intercom/messenger-js-sdk";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
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

import { clipNotificationFrame } from "./clipNotificationFrame";
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

// Survives the AppRoutes remount on a network switch. After shutdown(), only boot() revives the messenger.
let wasIntercomInitialized = false;

// Counts boots and resets on shutdown. SupportChatEvmAttributes is a child of AppRoutes, so its effects run
// before the boot effect on a remount; it waits for this to change instead of relying on effect order.
let intercomBootId: number | undefined;
const intercomBootListeners = new Set<() => void>();

function setIntercomBootId(bootId: number | undefined) {
  intercomBootId = bootId;
  intercomBootListeners.forEach((listener) => listener());
}

function subscribeIntercomBoot(listener: () => void) {
  intercomBootListeners.add(listener);
  return () => {
    intercomBootListeners.delete(listener);
  };
}

function getIntercomBootId() {
  return intercomBootId;
}

export function useSupportChat() {
  const { shouldShowSupportChat, shouldOpenChatOnBoot } = useShowSupportChat();
  const { themeMode } = useTheme();
  const themeModeRef = useRef(themeMode);
  themeModeRef.current = themeMode;
  const lastSentIntercomTheme = useRef<ReturnType<typeof themeToIntercomTheme> | undefined>(undefined);

  const [, setSupportChatUnreadCount] = useSupportChatUnreadCount();

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
      Environment: "EVM",
      // theme goes into the boot settings: update({ theme_mode }) during the boot window
      // suppresses the initial unread count delivery in the Intercom widget
      theme_mode: themeToIntercomTheme(themeModeRef.current),
    };
    lastSentIntercomTheme.current = intercomSettings.theme_mode;

    if (wasIntercomInitialized) {
      // Intercom() is a no-op after the first call; after shutdown() only boot() revives the messenger
      boot(intercomSettings);
    } else {
      Intercom(intercomSettings);
      wasIntercomInitialized = true;
    }

    setIntercomBootId((intercomBootId ?? 0) + 1);

    onUnreadCountChange((unreadCount: number) => {
      setSupportChatUnreadCount(unreadCount);
    });

    if (shouldOpenChatOnBoot) {
      show();
    }

    const stopClippingNotificationFrame = clipNotificationFrame();

    return () => {
      stopClippingNotificationFrame();
      shutdown();
      setIntercomBootId(undefined);
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
}

/** Volume, portfolio and GMX Account attributes. Mounted on EVM only, so those queries stay off Solana. */
export function SupportChatEvmAttributes() {
  const { shouldShowSupportChat } = useShowSupportChat();
  const { address: account, connector } = useAccount();
  const { accountType, isLoading: isAccountTypeLoading } = useAccountType();
  const { data: largeAccountVolumeStatsData, isLoading: isLargeAccountVolumeStatsLoading } =
    useIsLargeAccountVolumeStats({ account });
  const { walletPortfolioUsd, isWalletPortfolioUsdLoading } = useWalletPortfolioUsd();
  const { expressOrdersEnabled } = useSettings();
  const { subaccount } = useSubaccountContext();
  const { chainId, srcChainId } = useChainId();
  const intercomBootId = useSyncExternalStore(subscribeIntercomBoot, getIntercomBootId);
  const initialized = useRef<{ account: string | undefined; bootId: number } | undefined>(undefined);

  const { gmxAccountUsd, isLoading: isGmxAccountUsdLoading } = useAvailableToTradeAssetMultichain({
    enabled: shouldShowSupportChat,
  });

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
    if (!shouldShowSupportChat || intercomBootId === undefined) {
      initialized.current = undefined;
      return;
    }

    const isSent = initialized.current?.account === account && initialized.current?.bootId === intercomBootId;

    if (isSent || !customUserAttributes) {
      return;
    }

    initialized.current = { account, bootId: intercomBootId };
    update(customUserAttributes);
  }, [shouldShowSupportChat, customUserAttributes, account, intercomBootId]);

  useEffect(() => {
    tradingErrorTracker.setSupportChatContext({
      walletAddress: account,
      walletProvider: connector?.name,
      network: getChainName(srcChainId ?? chainId),
    });
  }, [account, connector?.name, srcChainId, chainId]);

  return null;
}
