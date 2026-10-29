import { useCallback, useMemo, useReducer } from "react";

import { CLOSING_POOLS_LP_NOTICE_DISMISSED_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import { readLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";

import {
  ClosingPoolsLpNotice,
  getClosingPoolLpHoldings,
  getClosingPoolsLpNotice,
  getNotifiableClosingMarkets,
  getUndismissedClosingMarkets,
  parseDismissedMarkets,
} from "./closingPoolsLpNotice";
import { useMarketTokensDataRequest } from "./useMarketTokensData";

export function useClosingPoolsLpNotice(): {
  notice: ClosingPoolsLpNotice | undefined;
  dismiss: () => void;
} {
  const { account } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const [, forceRerender] = useReducer((count: number) => count + 1, 0);

  const dismissedMarkets =
    readLocalStorageItem([CLOSING_POOLS_LP_NOTICE_DISMISSED_KEY, chainId, account], {
      deserializer: parseDismissedMarkets,
    }) ?? [];
  const undismissedMarkets = getUndismissedClosingMarkets(chainId, dismissedMarkets);
  const enabled = Boolean(account) && undismissedMarkets.length > 0;

  const { marketTokensData } = useMarketTokensDataRequest(chainId, srcChainId, {
    isDeposit: true,
    account,
    withGlv: false,
    enabled,
  });

  const holdings = useMemo(
    () => (enabled ? getClosingPoolLpHoldings(chainId, marketTokensData) : []),
    [chainId, enabled, marketTokensData]
  );

  const dismiss = useCallback(() => {
    const key = [CLOSING_POOLS_LP_NOTICE_DISMISSED_KEY, chainId, account];
    const previous = readLocalStorageItem(key, { deserializer: parseDismissedMarkets }) ?? [];

    writeLocalStorageItem(key, Array.from(new Set([...previous, ...getNotifiableClosingMarkets(chainId)])), {
      serializer: JSON.stringify,
    });
    forceRerender();
  }, [account, chainId]);

  return { notice: getClosingPoolsLpNotice(holdings, undismissedMarkets), dismiss };
}
