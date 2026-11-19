import { useEffect } from "react";

import { ARBITRUM } from "config/chains";
import { getCollateralCloseDestinationKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useChainId } from "lib/chains";
import { hasStoredLocalStorageValue } from "lib/localStorage";
import { AccountType, useAccountType } from "lib/wallets/useAccountType";
import useWallet from "lib/wallets/useWallet";
import { useWalletCanSignTypedData } from "lib/wallets/useWalletSessionChains";

export function useInitCollateralCloseDestination() {
  const { chainId, srcChainId } = useChainId();
  const { account } = useWallet();
  const settings = useSettings();
  const { accountType, isLoading: isAccountTypeLoading } = useAccountType();
  const { canSignTypedData, isLoading: isCanSignLoading } = useWalletCanSignTypedData();

  useEffect(() => {
    if (
      settings.receiveToGmxAccount !== null ||
      !account ||
      chainId !== ARBITRUM ||
      // source-chain closes always go to the GMX Account, so the first direct Arbitrum visit picks the default
      srcChainId !== undefined ||
      // for one render after an account switch or reconnect, SWR gives an undefined type without isLoading
      accountType === undefined ||
      isAccountTypeLoading ||
      isCanSignLoading
    ) {
      return;
    }

    // settings lag one render behind an account or chain switch, so the previous key's null can pass the check above
    if (hasStoredLocalStorageValue(getCollateralCloseDestinationKey(chainId, account))) {
      return;
    }

    settings.setReceiveToGmxAccount(accountType === AccountType.SmartAccount && canSignTypedData);
  }, [settings, chainId, srcChainId, account, accountType, isAccountTypeLoading, canSignTypedData, isCanSignLoading]);
}
