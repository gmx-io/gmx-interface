import { useEffect, useSyncExternalStore } from "react";
import { toast } from "react-toastify";

import { useChainId } from "lib/chains";
import { useNonSigningAccount } from "lib/wallets/useAccountType";

import {
  NON_EOA_ACCOUNT_CHAIN_WARNING_TOAST_ID,
  getNonEoaAccountChainWarningToastContent,
} from "components/Errors/errorToasts";

const toastSubscribe = (onStoreChange: () => void): (() => void) => {
  const cleanup = toast.onChange(({ id }) => {
    if (id === NON_EOA_ACCOUNT_CHAIN_WARNING_TOAST_ID) {
      onStoreChange();
    }
  });

  return cleanup;
};

const toastGetSnapshot = () => toast.isActive(NON_EOA_ACCOUNT_CHAIN_WARNING_TOAST_ID);

export function useNonEoaAccountChainWarning() {
  const { srcChainId } = useChainId();
  const { isNonSigningAccountOnAnyChain } = useNonSigningAccount();

  const isActive = useSyncExternalStore(toastSubscribe, toastGetSnapshot);

  useEffect(() => {
    if (srcChainId && isNonSigningAccountOnAnyChain) {
      toast.error(getNonEoaAccountChainWarningToastContent(srcChainId), {
        toastId: NON_EOA_ACCOUNT_CHAIN_WARNING_TOAST_ID,
        autoClose: false,
        closeButton: false,
        delay: 2000,
      });
    } else if (!srcChainId || !isNonSigningAccountOnAnyChain) {
      toast.dismiss(NON_EOA_ACCOUNT_CHAIN_WARNING_TOAST_ID);
    }
  }, [isActive, isNonSigningAccountOnAnyChain, srcChainId]);

  useEffect(() => {
    return () => {
      toast.dismiss(NON_EOA_ACCOUNT_CHAIN_WARNING_TOAST_ID);
    };
  }, []);
}
