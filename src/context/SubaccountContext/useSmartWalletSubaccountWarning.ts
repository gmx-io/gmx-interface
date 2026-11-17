import { useEffect } from "react";
import { toast } from "react-toastify";
import { useLatest } from "react-use";

import { useIsContractAccount } from "lib/wallets/useWalletSessionChains";

import { SMART_WALLET_SUBACCOUNT_TOAST_ID, getSmartWalletSubaccountToastContent } from "components/Errors/errorToasts";

import { useSubaccountContext } from "./SubaccountContextProvider";

export function useSmartWalletSubaccountWarning() {
  const { subaccount, tryDisableSubaccount } = useSubaccountContext();
  const { isContractAccount } = useIsContractAccount();
  const latestTryDisableSubaccount = useLatest(tryDisableSubaccount);

  const shouldShow = Boolean(subaccount) && isContractAccount;

  useEffect(() => {
    if (shouldShow) {
      toast.error(
        getSmartWalletSubaccountToastContent(() => latestTryDisableSubaccount.current()),
        {
          toastId: SMART_WALLET_SUBACCOUNT_TOAST_ID,
          autoClose: false,
          delay: 2000,
        }
      );
    } else {
      toast.dismiss(SMART_WALLET_SUBACCOUNT_TOAST_ID);
    }
  }, [shouldShow, latestTryDisableSubaccount]);

  useEffect(() => {
    return () => {
      toast.dismiss(SMART_WALLET_SUBACCOUNT_TOAST_ID);
    };
  }, []);
}
