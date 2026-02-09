import Intercom, { update } from "@intercom/messenger-js-sdk";
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { useAccount } from "wagmi";

import { getChainName, SettlementChainId } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { SUPPORT_CHAT_WAS_EVER_SHOWN_KEY } from "config/localStorage";
import { ThemeMode, useTheme } from "context/ThemeContext/ThemeContext";
import { fetchMultichainTokenBalances } from "domain/multichain/fetchMultichainTokenBalances";
import { useIsLargeAccountVolumeStats } from "domain/synthetics/accountStats/useIsLargeAccountData";
import { usePeriodAccountStats } from "domain/synthetics/accountStats/usePeriodAccountStats";
import { useTokenRecentPricesRequest, useTokensDataRequest } from "domain/synthetics/tokens";
import { expandDecimals } from "lib/numbers";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { buildTokenChainDataArray, useAvailableToTradeAssetMultichain } from "components/GmxAccountModal/hooks";

import { useChainId } from "./chains";
import { getTimePeriodsInSeconds } from "./dates";
import { useLocalStorageSerializeKey } from "./localStorage";
import { formatAmountForMetrics } from "./metrics";

const INTERCOM_APP_ID = "blsw8a15";

const SUPPORT_CHAT_MIN_DAILY_VOLUME = expandDecimals(1n, USD_DECIMALS);
const SUPPORT_CHAT_MIN_AGG_14_DAYS_VOLUME = expandDecimals(1n, USD_DECIMALS);
const SUPPORT_CHAT_MIN_AGG_ALL_TIME_VOLUME = expandDecimals(1n, USD_DECIMALS);

const TIME_PERIODS = getTimePeriodsInSeconds();

export function useEligibleToShowSupportChat() {
  const { isLoading: isAccountTypeLoading } = useIsNonEoaAccountOnAnyChain();
  const { isConnected, address: account } = useAccount();
  const isLargeAccountVolumeStats = useIsLargeAccountVolumeStats({ account });
  const [supportChatWasEverShown] = useLocalStorageSerializeKey<boolean>(SUPPORT_CHAT_WAS_EVER_SHOWN_KEY, false);

  const totalVolume = isLargeAccountVolumeStats.data?.totalVolume;

  const isLargeAccountForSupportChat = useMemo(() => {
    if (!isLargeAccountVolumeStats.data || totalVolume === undefined) {
      return false;
    }

    const { volumeInLast30DaysInfo } = isLargeAccountVolumeStats.data;
    const { maxDailyVolume, last14DaysVolume } = volumeInLast30DaysInfo;

    return (
      maxDailyVolume >= SUPPORT_CHAT_MIN_DAILY_VOLUME ||
      last14DaysVolume >= SUPPORT_CHAT_MIN_AGG_14_DAYS_VOLUME ||
      totalVolume >= SUPPORT_CHAT_MIN_AGG_ALL_TIME_VOLUME
    );
  }, [isLargeAccountVolumeStats.data, totalVolume]);

  const eligibleToShowSupportChat =
    (isConnected && !isAccountTypeLoading && !isLargeAccountVolumeStats.isLoading && isLargeAccountForSupportChat) ||
    supportChatWasEverShown;

  return eligibleToShowSupportChat;
}

export function useSupportChat() {
  const eligibleToShowSupportChat = useEligibleToShowSupportChat();
  const { address: account } = useAccount();
  const [, setSupportChatWasEverShown] = useLocalStorageSerializeKey<boolean>(SUPPORT_CHAT_WAS_EVER_SHOWN_KEY, false);
  const { themeMode } = useTheme();
  const { data: isLargeAccountVolumeStats, isLoading: isIsLargeAccountVolumeStatsLoading } =
    useIsLargeAccountVolumeStats({ account });
  const { chainId, srcChainId } = useChainId();
  const initialized = useRef(false);

  const { isNonEoaAccountOnAnyChain, isLoading: isIsNonEoaAccountOnAnyChainLoading } = useIsNonEoaAccountOnAnyChain();

  const { data: lastMonthAccountStats, loading: isLastMonthAccountStatsLoading } = usePeriodAccountStats(chainId, {
    account,
    from: TIME_PERIODS.month[0],
    to: TIME_PERIODS.month[1],
    enabled: eligibleToShowSupportChat,
    refreshInterval: 0,
  });

  const { walletPortfolioUsd, isWalletPortfolioUsdLoading } = useWalletPortfolioUsd({
    enabled: eligibleToShowSupportChat,
  });

  const { gmxAccountUsd, isLoading: isGmxAccountUsdLoading } = useAvailableToTradeAssetMultichain({
    enabled: eligibleToShowSupportChat,
  });

  const customUserAttributes = useMemo(() => {
    if (
      isWalletPortfolioUsdLoading ||
      isLastMonthAccountStatsLoading ||
      isIsNonEoaAccountOnAnyChainLoading ||
      isIsLargeAccountVolumeStatsLoading ||
      isGmxAccountUsdLoading
    ) {
      return undefined;
    }

    return {
      "Total Volume": formatAmountForMetrics(isLargeAccountVolumeStats?.totalVolume, USD_DECIMALS, "toSecondOrderInt"),
      "Last 30d Volume": formatAmountForMetrics(lastMonthAccountStats?.volume, USD_DECIMALS, "toSecondOrderInt"),
      "Wallet Portfolio USD": formatAmountForMetrics(walletPortfolioUsd, USD_DECIMALS, "toSecondOrderInt"),
      "GMX Account Portfolio USD": formatAmountForMetrics(gmxAccountUsd, USD_DECIMALS, "toSecondOrderInt"),
      "Active Network": getChainName(srcChainId ?? chainId),
      "Wallet Type": isNonEoaAccountOnAnyChain ? "Smart Wallet" : "EOA",
    };
  }, [
    isWalletPortfolioUsdLoading,
    isLastMonthAccountStatsLoading,
    isIsNonEoaAccountOnAnyChainLoading,
    isIsLargeAccountVolumeStatsLoading,
    isGmxAccountUsdLoading,
    isLargeAccountVolumeStats?.totalVolume,
    lastMonthAccountStats?.volume,
    walletPortfolioUsd,
    gmxAccountUsd,
    srcChainId,
    chainId,
    isNonEoaAccountOnAnyChain,
  ]);

  useEffect(() => {
    if (eligibleToShowSupportChat) {
      Intercom({
        app_id: INTERCOM_APP_ID,
        alignment: "left",
        horizontal_padding: 20,
        vertical_padding: 20,
        hide_default_launcher: true,
      });

      setSupportChatWasEverShown(true);
    }
  }, [eligibleToShowSupportChat, setSupportChatWasEverShown]);

  useEffect(() => {
    if (!eligibleToShowSupportChat) {
      return;
    }

    update({
      theme_mode: themeToIntercomTheme(themeMode),
    });
  }, [eligibleToShowSupportChat, themeMode]);

  useEffect(() => {
    if (initialized.current || !eligibleToShowSupportChat || !customUserAttributes) {
      return;
    }

    update(customUserAttributes);

    initialized.current = true;
  }, [eligibleToShowSupportChat, customUserAttributes]);
}

function themeToIntercomTheme(themeMode: ThemeMode): "light" | "dark" | "system" {
  let intercomThemeMode: "light" | "dark" | "system" = "system";
  if (themeMode === "dark") {
    intercomThemeMode = "dark";
  } else if (themeMode === "light") {
    intercomThemeMode = "light";
  }
  return intercomThemeMode;
}

function useWalletPortfolioUsd({ enabled }: { enabled?: boolean } = {}): {
  walletPortfolioUsd: bigint | undefined;
  isWalletPortfolioUsdLoading: boolean;
} {
  const { chainId } = useChainId();
  const { address: account } = useAccount();
  const tokensData = useTokensDataRequest(chainId, undefined, { enabled });
  const { pricesData } = useTokenRecentPricesRequest(chainId, { enabled });

  const { data: multichainTokenBalances, isLoading: isMultichainBalancesLoading } = useSWR(
    account !== undefined && enabled ? ["multichain-trade-tokens-balances-static", chainId, account] : null,
    {
      fetcher: async () =>
        fetchMultichainTokenBalances({
          settlementChainId: chainId as SettlementChainId,
          account: account!,
        }),
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  const walletPortfolioUsd = useMemo(() => {
    let totalUsd = 0n;

    if (tokensData.tokensData) {
      for (const token of Object.values(tokensData.tokensData)) {
        if (token.walletBalance === undefined || token.walletBalance === 0n) {
          continue;
        }
        totalUsd += convertToUsd(token.walletBalance, token.decimals, getMidPrice(token.prices))!;
      }
    }

    if (multichainTokenBalances && pricesData) {
      const tokenChainDataArray = buildTokenChainDataArray({
        tokenBalances: multichainTokenBalances,
        chainId,
        pricesData,
      });

      for (const token of tokenChainDataArray) {
        if (token.sourceChainPrices === undefined || token.sourceChainBalance === undefined) {
          continue;
        }
        totalUsd += convertToUsd(
          token.sourceChainBalance,
          token.sourceChainDecimals,
          getMidPrice(token.sourceChainPrices)
        )!;
      }
    }

    return totalUsd;
  }, [tokensData.tokensData, multichainTokenBalances, pricesData, chainId]);

  return {
    walletPortfolioUsd,
    isWalletPortfolioUsdLoading:
      isMultichainBalancesLoading || !tokensData.isBalancesLoaded || !tokensData.isWalletBalancesLoaded,
  };
}
