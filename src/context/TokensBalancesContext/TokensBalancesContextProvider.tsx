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

import type { TokenBalancesData, TokenData, TokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { bigMath } from "sdk/utils/bigmath";
import { TokenBalanceType } from "sdk/utils/tokens/types";

export type TokenBalanceUpdate = {
  isPending?: boolean;
  balanceType: TokenBalanceType;
  /**
   * Used only for native token
   */
  balance?: bigint;
  diff?: bigint;
  clearTimerId?: number;
};

export type TokensBalancesUpdates = {
  [tokenAddress: string]: TokenBalanceUpdate | undefined;
};

type TokensBalancesContextType = {
  websocketTokenBalancesUpdates: TokensBalancesUpdates;
  optimisticTokensBalancesUpdates: TokensBalancesUpdates;
  setWebsocketTokenBalancesUpdates: Dispatch<SetStateAction<TokensBalancesUpdates>>;
  setOptimisticTokensBalancesUpdates: Dispatch<SetStateAction<TokensBalancesUpdates>>;
  addOptimisticTokensBalancesUpdates: (tokenBalanceUpdates: TokensBalancesUpdates) => void;
  resetTokensBalancesUpdates: (tokenAddresses: string[], balanceType: TokenBalanceType) => void;
};

const MAX_PENDING_TIME_MS = 5_000;

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

  const addOptimisticTokensBalancesUpdates = useCallback((tokenBalanceUpdates: TokensBalancesUpdates) => {
    setOptimisticTokensBalancesUpdates((prevState) => {
      const clearTimerId = window.setTimeout(() => {
        setOptimisticTokensBalancesUpdates((clearingState) => {
          let newState = { ...clearingState };

          for (const [tokenAddress] of Object.entries(tokenBalanceUpdates)) {
            if (!clearingState[tokenAddress] || clearingState[tokenAddress]?.clearTimerId !== clearTimerId) {
              continue;
            }

            const prevBalanceUpdate = clearingState[tokenAddress]!;

            newState[tokenAddress] = {
              ...prevBalanceUpdate,
              isPending: false,
              clearTimerId: undefined,
            };
          }

          return newState;
        });
      }, MAX_PENDING_TIME_MS);

      let newState = { ...prevState };

      for (const [tokenAddress, balanceUpdate] of Object.entries(tokenBalanceUpdates)) {
        if (!balanceUpdate) {
          continue;
        }
        const prevBalanceUpdate = prevState[tokenAddress];

        let diff = 0n;
        if (balanceUpdate.diff !== undefined) {
          diff = balanceUpdate.diff;

          if (
            prevBalanceUpdate &&
            prevBalanceUpdate.balanceType === balanceUpdate.balanceType &&
            prevBalanceUpdate.diff !== undefined
          ) {
            diff += prevBalanceUpdate.diff;
          }
        }

        newState[tokenAddress] = {
          balanceType: balanceUpdate.balanceType,
          isPending: balanceUpdate.isPending,
          diff,
          clearTimerId: balanceUpdate.isPending ? clearTimerId : undefined,
        };
      }

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
      addOptimisticTokensBalancesUpdates,
    }),
    [
      addOptimisticTokensBalancesUpdates,
      optimisticTokensBalancesUpdates,
      resetTokensBalancesUpdates,
      websocketTokenBalancesUpdates,
    ]
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
    const tokenData = { ...(nextBalancesData[tokenAddress] as TokenData) };

    if (tokenData.walletBalance !== undefined) {
      tokenData.walletBalance = updateTokenBalance(balanceUpdate, tokenData.walletBalance, TokenBalanceType.Wallet);
    }
    if (tokenData.gmxAccountBalance !== undefined) {
      tokenData.gmxAccountBalance = updateTokenBalance(
        balanceUpdate,
        tokenData.gmxAccountBalance,
        TokenBalanceType.GmxAccount
      );
    }
    if (tokenData.sourceChainBalance !== undefined) {
      tokenData.sourceChainBalance = updateTokenBalance(
        balanceUpdate,
        tokenData.sourceChainBalance,
        TokenBalanceType.SourceChain
      );
    }

    switch (tokenData.balanceType) {
      case TokenBalanceType.GmxAccount:
        tokenData.balance = tokenData.gmxAccountBalance!;
        break;
      case TokenBalanceType.Wallet:
        tokenData.balance = tokenData.walletBalance!;
        break;
      case TokenBalanceType.SourceChain:
        tokenData.balance = tokenData.sourceChainBalance!;
        break;
    }

    nextBalancesData[tokenAddress] = tokenData;
  }

  return nextBalancesData;
};

export function updateTokenBalance(balanceUpdate: TokenBalanceUpdate, balance: bigint, balanceType: TokenBalanceType) {
  if (balanceType !== balanceUpdate.balanceType) {
    return balance;
  }

  if (balanceUpdate.diff !== undefined) {
    // avoid negative balances
    return bigMath.max(0n, balance + balanceUpdate.diff);
  } else if (balanceUpdate.balance !== undefined) {
    return balanceUpdate.balance;
  }

  return balance;
}
