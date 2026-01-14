import { useLingui } from "@lingui/react";
import { Crisp } from "crisp-sdk-web";
import { useEffect, useMemo } from "react";
import { useAccount, useAccountEffect } from "wagmi";

import { getChainName } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useIsLargeAccountVolumeStats } from "domain/synthetics/accountStats/useIsLargeAccountData";
import { useChainId } from "lib/chains";
import { expandDecimals, formatAmountHuman } from "lib/numbers";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";
import { bigMath } from "sdk/utils/bigmath";

const CRISP_WEBSITE_ID = "65f73ff1-ea6e-40f4-8b03-fbdae7785384";

const CRISP_MIN_DAILY_VOLUME = expandDecimals(1n, USD_DECIMALS);
const CRISP_MIN_AGG_14_DAYS_VOLUME = expandDecimals(1n, USD_DECIMALS);
const CRISP_MIN_AGG_ALL_TIME_VOLUME = expandDecimals(1n, USD_DECIMALS);

export function useCrisp() {
  const { i18n } = useLingui();
  const locale = i18n.locale;
  const { chainId, srcChainId } = useChainId();
  const { isNonEoaAccountOnAnyChain, isLoading: isAccountTypeLoading } = useIsNonEoaAccountOnAnyChain();
  const { isConnected, address: account } = useAccount();
  const isLargeAccountVolumeStats = useIsLargeAccountVolumeStats({ account });
  const { crispChatHidden } = useSettings();

  const totalVolume = isLargeAccountVolumeStats.data?.totalVolume;

  const isLargeAccountForCrisp = useMemo(() => {
    if (!isLargeAccountVolumeStats.data || totalVolume === undefined) {
      return false;
    }

    const maxDailyVolume = isLargeAccountVolumeStats.data.dailyVolume.reduce(
      (max, day) => bigMath.max(max, day.volume),
      0n
    );

    const last14DaysVolume = isLargeAccountVolumeStats.data.dailyVolume
      ?.slice(-14)
      .reduce((acc, day) => acc + day.volume, 0n);

    return (
      maxDailyVolume >= CRISP_MIN_DAILY_VOLUME ||
      last14DaysVolume >= CRISP_MIN_AGG_14_DAYS_VOLUME ||
      totalVolume >= CRISP_MIN_AGG_ALL_TIME_VOLUME
    );
  }, [isLargeAccountVolumeStats.data, totalVolume]);

  // const eligibleToShowCrisp =
  //   isConnected && !isAccountTypeLoading && !isLargeAccountVolumeStats.isLoading && isLargeAccountForCrisp;

  const eligibleToShowCrisp = true;

  useEffect(() => {
    if (!eligibleToShowCrisp || crispChatHidden) {
      return;
    }

    Crisp.configure(CRISP_WEBSITE_ID, {
      autoload: true,
      locale,
    });

    Crisp.session.setData({
      Total_Volume: formatAmountHuman(totalVolume, USD_DECIMALS, true, 0),
      Active_Network: getChainName(srcChainId ?? chainId),
      Account_Type: isNonEoaAccountOnAnyChain ? "Smart Wallet" : "EOA",
    });
  }, [chainId, crispChatHidden, eligibleToShowCrisp, isNonEoaAccountOnAnyChain, locale, srcChainId, totalVolume]);

  useEffect(() => {
    if (!Crisp.isCrispInjected()) {
      return;
    }

    if (crispChatHidden || !eligibleToShowCrisp) {
      Crisp.chat.hide();
    } else if (eligibleToShowCrisp) {
      Crisp.chat.show();
    }
  }, [crispChatHidden, eligibleToShowCrisp]);

  useAccountEffect({
    onDisconnect() {
      Crisp.setTokenId();
      Crisp.session.reset();
      Crisp.chat.hide();
    },
  });
}
