import entries from "lodash/entries";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { TokenBalancesData, TokenData, TokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { TokenBalanceType } from "sdk/types/tokens";

export type TokenBalanceUpdate = {
  isPending?: boolean;
  balanceType: TokenBalanceType;
  balance?: bigint;
  diff?: bigint;
};

export type TokensBalancesUpdates = {
  [tokenAddress: string]: TokenBalanceUpdate | undefined;
};

type TokensBalancesContextType = {
  websocketTokenBalancesUpdates: TokensBalancesUpdates;
  optimisticTokensBalancesUpdates: TokensBalancesUpdates;
  setWebsocketTokenBalancesUpdates: Dispatch<SetStateAction<TokensBalancesUpdates>>;
  setOptimisticTokensBalancesUpdates: Dispatch<SetStateAction<TokensBalancesUpdates>>;
  resetTokensBalancesUpdates: (tokenAddresses: string[], balanceType: TokenBalanceType) => void;
};

const Context = createContext<TokensBalancesContextType | null>(null);

/**
 * Token balances update schema:
 *
 * 1. Set optimistic balances updates in useOrderTxnCallbacks and mark them with isPending: true
 * 2. When receiving websocket transfer event or express transaction relayer error, mark related optimistic updates with isPending: false and apply websocket updates
 * 3. When balances are updated from rpc, reset pending optimistic and websocket updates
 */

export function TokensBalancesContextProvider({ children }: PropsWithChildren) {
  const { chainId } = useChainId();

  const [optimisticTokensBalancesUpdates, setOptimisticTokensBalancesUpdates] = useState<TokensBalancesUpdates>({});
  const [websocketTokenBalancesUpdates, setWebsocketTokenBalancesUpdates] = useState<TokensBalancesUpdates>({});

  const resetTokensBalancesUpdates = useCallback((tokenAddresses: string[], balanceType: TokenBalanceType) => {
    setWebsocketTokenBalancesUpdates((old) => {
      const newState = { ...old };

      tokenAddresses.forEach((tokenAddress) => {
        if (newState[tokenAddress]?.balanceType !== balanceType) {
          return;
        }

        if (!newState[tokenAddress]?.isPending) {
          delete newState[tokenAddress];
        }
      });

      return newState;
    });
    setOptimisticTokensBalancesUpdates((old) => {
      const newState = { ...old };

      tokenAddresses.forEach((tokenAddress) => {
        if (newState[tokenAddress]?.balanceType !== balanceType) {
          return;
        }

        if (!newState[tokenAddress]?.isPending) {
          delete newState[tokenAddress];
        }
      });

      return newState;
    });
  }, []);

  useEffect(() => {
    setWebsocketTokenBalancesUpdates({});
    setOptimisticTokensBalancesUpdates({});
  }, [chainId]);

  const state = useMemo(
    () => ({
      websocketTokenBalancesUpdates,
      optimisticTokensBalancesUpdates,
      setOptimisticTokensBalancesUpdates,
      setWebsocketTokenBalancesUpdates,
      resetTokensBalancesUpdates,
    }),
    [websocketTokenBalancesUpdates, optimisticTokensBalancesUpdates, resetTokensBalancesUpdates]
  );

  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export function useTokensBalancesUpdates(): TokensBalancesContextType {
  const context = useContext(Context);

  if (!context) {
    throw new Error("useTokensBalancesUpdates must be used within a TokensBalancesContextProvider");
  }

  return context;
}

export function useUpdatedTokensBalances(
  balancesData: TokensData | undefined,
  balanceType?: undefined
): TokensData | undefined;
export function useUpdatedTokensBalances(
  balancesData: TokenBalancesData | undefined,
  balanceType: TokenBalanceType
): TokenBalancesData | undefined;
export function useUpdatedTokensBalances<T extends TokenBalancesData | TokensData>(
  balancesData: T | undefined,
  balanceType: T extends TokensData ? undefined : TokenBalanceType
): T | undefined {
  const { websocketTokenBalancesUpdates, optimisticTokensBalancesUpdates } = useTokensBalancesUpdates();

  return useMemo(() => {
    if (!balancesData) {
      return balancesData;
    }

    let nextBalancesData = balancesData;

    const optimisticUpdateEntries = entries(optimisticTokensBalancesUpdates);
    const websocketUpdateEntries = entries(websocketTokenBalancesUpdates);

    // Apply optimistic updates
    for (const [tokenAddress, balanceUpdate] of optimisticUpdateEntries) {
      if (balanceUpdate && !websocketTokenBalancesUpdates[tokenAddress]) {
        nextBalancesData = applyBalanceUpdate(nextBalancesData, tokenAddress, balanceUpdate, balanceType);
      }
    }

    // Apply websocket updates (these take priority and override optimistic updates)
    for (const [tokenAddress, balanceUpdate] of websocketUpdateEntries) {
      if (balanceUpdate) {
        nextBalancesData = applyBalanceUpdate(nextBalancesData, tokenAddress, balanceUpdate, balanceType);
      }
    }

    return nextBalancesData;
  }, [balanceType, balancesData, optimisticTokensBalancesUpdates, websocketTokenBalancesUpdates]);
}

const applyBalanceUpdate = <T extends TokenBalancesData | TokensData>(
  currentUpdates: T,
  tokenAddress: string,
  balanceUpdate: TokenBalanceUpdate,
  balanceType: T extends TokensData ? undefined : TokenBalanceType
): T => {
  const nextBalancesData = { ...currentUpdates };

  if (!balanceUpdate || nextBalancesData[tokenAddress] === undefined) {
    return nextBalancesData;
  }

  if (typeof nextBalancesData[tokenAddress] === "bigint") {
    nextBalancesData[tokenAddress] = updateTokenBalance(
      balanceUpdate,
      nextBalancesData[tokenAddress] as bigint,
      balanceType!
    );
  } else if (typeof (nextBalancesData[tokenAddress] as TokenData).balance === "bigint") {
    const tokenData = { ...(nextBalancesData[tokenAddress] as TokenData & { balance: bigint }) };
    tokenData.balance = updateTokenBalance(
      balanceUpdate,
      tokenData.balance,
      tokenData.balanceType ?? TokenBalanceType.Wallet
    );
    nextBalancesData[tokenAddress] = tokenData;
  }

  return nextBalancesData;
};

export function updateTokenBalance(balanceUpdate: TokenBalanceUpdate, balance: bigint, balanceType: TokenBalanceType) {
  if (balanceType !== balanceUpdate.balanceType) {
    return balance;
  }

  if (balanceUpdate.diff !== undefined) {
    return balance + balanceUpdate.diff;
  } else if (balanceUpdate.balance !== undefined) {
    return balanceUpdate.balance;
  }

  return balance;
}
