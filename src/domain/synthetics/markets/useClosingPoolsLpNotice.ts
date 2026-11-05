import { useCallback, useMemo, useReducer } from "react";

import { USD_DECIMALS } from "config/factors";
import { CLOSING_POOLS_LP_NOTICE_DISMISSED_KEY } from "config/localStorage";
import { QA_ACCOUNT, isQaMockOn } from "config/qaMocks";
import { useChainId } from "lib/chains";
import { readLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";
import { expandDecimals } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import {
  ClosingPoolLpHolding,
  ClosingPoolsLpNotice,
  getClosingPoolLpHoldings,
  getClosingPoolsLpNotice,
  getNotifiableClosingMarkets,
  getUndismissedClosingMarkets,
  parseDismissedMarkets,
} from "./closingPoolsLpNotice";
import { useMarketTokensDataRequest } from "./useMarketTokensData";

function getQaHoldings(chainId: number): ClosingPoolLpHolding[] {
  const names = ["NEAR", "XRP"];
  return getNotifiableClosingMarkets(chainId)
    .slice(0, names.length)
    .map((marketAddress, i) => ({
      marketAddress,
      name: names[i],
      usd: expandDecimals(50_000 - i * 30_000, USD_DECIMALS),
    }));
}

export function useClosingPoolsLpNotice(): {
  notice: ClosingPoolsLpNotice | undefined;
  isLoading: boolean;
  dismiss: () => void;
} {
  const { account } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const [, forceRerender] = useReducer((count: number) => count + 1, 0);
  const isQa = isQaMockOn("funds");
  const keyAccount = isQa ? QA_ACCOUNT : account;

  const dismissedMarkets =
    readLocalStorageItem([CLOSING_POOLS_LP_NOTICE_DISMISSED_KEY, chainId, keyAccount], {
      deserializer: parseDismissedMarkets,
    }) ?? [];
  const undismissedMarkets = getUndismissedClosingMarkets(chainId, dismissedMarkets);
  const enabled = !isQa && Boolean(account) && undismissedMarkets.length > 0;

  const { marketTokensData } = useMarketTokensDataRequest(chainId, srcChainId, {
    isDeposit: true,
    account,
    withGlv: false,
    enabled,
  });

  const holdings = useMemo(
    () => (isQa ? getQaHoldings(chainId) : enabled ? getClosingPoolLpHoldings(chainId, marketTokensData) : []),
    [chainId, enabled, isQa, marketTokensData]
  );

  const dismiss = useCallback(() => {
    const key = [CLOSING_POOLS_LP_NOTICE_DISMISSED_KEY, chainId, keyAccount];
    const previous = readLocalStorageItem(key, { deserializer: parseDismissedMarkets }) ?? [];

    writeLocalStorageItem(key, Array.from(new Set([...previous, ...getNotifiableClosingMarkets(chainId)])), {
      serializer: JSON.stringify,
    });
    forceRerender();
  }, [keyAccount, chainId]);

  return {
    notice: getClosingPoolsLpNotice(holdings, undismissedMarkets),
    isLoading: enabled && marketTokensData === undefined,
    dismiss,
  };
}
