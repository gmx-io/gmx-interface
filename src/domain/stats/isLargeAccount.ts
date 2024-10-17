import { IS_LARGE_ACCOUNT_KEY } from "config/localStorage";
import { useEffect } from "react";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useIsLargeAccountData } from "domain/synthetics/accountStats/useIsLargeAccountData";

let isLargeAccount = getIsLargeAccountStoredValue();

function getIsLargeAccountStoredValue() {
  const storedValue = localStorage.getItem(JSON.stringify(IS_LARGE_ACCOUNT_KEY));

  return storedValue === "true";
}

export function getIsLargeAccount() {
  return isLargeAccount;
}

export function useIsLargeAccountTracker(account?: string) {
  const isCurrentAccountLarge = useIsLargeAccountData(account);
  const [isCurrentAccountLargeStoredValue, setIsCurrentAccountLargeStoredValue] = useLocalStorageSerializeKey<boolean>(
    IS_LARGE_ACCOUNT_KEY,
    false
  );

  useEffect(() => {
    if (!account) {
      isLargeAccount = false;
    } else if (isCurrentAccountLarge !== undefined) {
      setIsCurrentAccountLargeStoredValue(isCurrentAccountLarge);
      isLargeAccount = isCurrentAccountLarge;
    } else if (isCurrentAccountLargeStoredValue) {
      isLargeAccount = true;
    } else {
      isLargeAccount = false;
    }
  }, [account, isCurrentAccountLarge, isCurrentAccountLargeStoredValue, setIsCurrentAccountLargeStoredValue]);

  return isLargeAccount;
}
