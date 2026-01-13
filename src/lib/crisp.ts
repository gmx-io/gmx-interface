import { useLingui } from "@lingui/react";
import { Crisp } from "crisp-sdk-web";
import { useEffect } from "react";
import { useAccount, useAccountEffect } from "wagmi";

import { getChainName } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  useIsLargeAccountData,
  useIsLargeAccountVolumeStats,
} from "domain/synthetics/accountStats/useIsLargeAccountData";
import { useChainId } from "lib/chains";
import { formatAmountHuman } from "lib/numbers";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";

const CRISP_WEBSITE_ID = "65f73ff1-ea6e-40f4-8b03-fbdae7785384";

export function useCrisp() {
  const { i18n } = useLingui();
  const locale = i18n.locale;
  const { chainId, srcChainId } = useChainId();
  const { isNonEoaAccountOnAnyChain, isLoading: isAccountTypeLoading } = useIsNonEoaAccountOnAnyChain();
  const { isConnected, address: account } = useAccount();
  const isLargeAccount = useIsLargeAccountData(account);
  const isLargeAccountVolumeStats = useIsLargeAccountVolumeStats({ account });
  const totalVolume = isLargeAccountVolumeStats.data?.totalVolume;
  const { crispChatHidden } = useSettings();

  const eligibleToShowCrisp =
    isConnected && !isAccountTypeLoading && !isLargeAccountVolumeStats.isLoading && isLargeAccount;

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
