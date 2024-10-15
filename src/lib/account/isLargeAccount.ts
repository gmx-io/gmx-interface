import { IS_LARGE_ACCOUNT_KEY } from "config/localStorage";
import { useEffect } from "react";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useIsLargeAccountData } from "domain/synthetics/accountStats/useIsLargeAccountData";
import { getStorageItem } from "lib/metrics/storage";

let isLargeAccount = getIsLargeAccountStoredValue();

function getIsLargeAccountStoredValue() {
  return getStorageItem(IS_LARGE_ACCOUNT_KEY, true) === "true";
}

export function getIsLargeAccount() {
  return isLargeAccount;
}

export function useIsLargeAccountTracker(account?: string) {
  const isLargeCurrentAccount = useIsLargeAccountData(account);
  const [isLargeAccountStoredValue, setIsLargeAccountStoredValue] = useLocalStorageSerializeKey<boolean>(
    IS_LARGE_ACCOUNT_KEY,
    false
  );

  useEffect(() => {
    if (!account) {
      isLargeAccount = false;
    } else if (isLargeCurrentAccount !== undefined) {
      setIsLargeAccountStoredValue(isLargeCurrentAccount);
      isLargeAccount = isLargeCurrentAccount;
    } else if (isLargeAccountStoredValue) {
      isLargeAccount = true;
    } else {
      isLargeAccount = false;
    }
  }, [account, isLargeCurrentAccount, isLargeAccountStoredValue, setIsLargeAccountStoredValue]);

  return isLargeAccount;
}
