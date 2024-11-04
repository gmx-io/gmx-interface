import { getIsFlagEnabled } from "config/ab";
import { TokenBalancesData, TokenData, TokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { EMPTY_OBJECT } from "lib/objects";
import entries from "lodash/entries";
import noop from "lodash/noop";
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

export type TokenBalanceUpdate = {
  balance?: bigint;
  diff?: bigint;
};

export type TokensBalancesUpdates = {
  [tokenAddress: string]: TokenBalanceUpdate | undefined;
};

type TokensBalancesContextType = {
  tokensBalancesUpdates: TokensBalancesUpdates;
  setTokensBalancesUpdates: Dispatch<SetStateAction<TokensBalancesUpdates>>;
  resetTokensBalancesUpdates: (tokenAddresses: string[]) => void;
};

const DEFAULT_TOKENS_BALANCES_CONTEXT: TokensBalancesContextType = {
  tokensBalancesUpdates: EMPTY_OBJECT,
  setTokensBalancesUpdates: noop,
  resetTokensBalancesUpdates: noop,
};

const Context = createContext<TokensBalancesContextType>(DEFAULT_TOKENS_BALANCES_CONTEXT);

export function TokensBalancesContextProvider({ children }: PropsWithChildren) {
  const { chainId } = useChainId();

  const [tokensBalancesUpdates, setTokensBalancesUpdates] = useState<TokensBalancesUpdates>(
    DEFAULT_TOKENS_BALANCES_CONTEXT.tokensBalancesUpdates
  );

  const resetTokensBalancesUpdates = useCallback((tokenAddresses: string[]) => {
    setTokensBalancesUpdates((old) => {
      const newState = { ...old };

      tokenAddresses.forEach((tokenAddress) => {
        delete newState[tokenAddress];
      });

      return newState;
    });
  }, []);

  useEffect(() => {
    setTokensBalancesUpdates({});
  }, [chainId]);

  const state = useMemo(
    () => ({ tokensBalancesUpdates, setTokensBalancesUpdates, resetTokensBalancesUpdates }),
    [resetTokensBalancesUpdates, tokensBalancesUpdates]
  );

  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export function useTokensBalancesContext(): TokensBalancesContextType {
  return useContext(Context);
}

export function useUpdatedTokensBalances<T extends TokenBalancesData | TokensData>(balancesData?: T): T | undefined {
  const { tokensBalancesUpdates } = useTokensBalancesContext();

  return useMemo(() => {
    if (!balancesData || !getIsFlagEnabled("testWebsocketBalances")) {
      return balancesData;
    }

    const result = { ...balancesData };
    const updateEntries = entries(tokensBalancesUpdates);

    for (const [tokenAddress, balanceUpdate] of updateEntries) {
      if (!balanceUpdate || result[tokenAddress] === undefined) {
        continue;
      }

      if (typeof result[tokenAddress] === "bigint") {
        result[tokenAddress] = updateTokenBalance(balanceUpdate, result[tokenAddress] as bigint);
      } else if (typeof (result[tokenAddress] as TokenData).balance === "bigint") {
        const tokenData = { ...(result[tokenAddress] as TokenData & { balance: bigint }) };
        tokenData.balance = updateTokenBalance(balanceUpdate, tokenData.balance);
        result[tokenAddress] = tokenData;
      }
    }

    return result;
  }, [balancesData, tokensBalancesUpdates]);
}

export function updateTokenBalance(balanceUpdate: TokenBalanceUpdate, balance: bigint) {
  if (balanceUpdate.diff !== undefined) {
    return balance + balanceUpdate.diff;
  } else if (balanceUpdate.balance !== undefined) {
    return balanceUpdate.balance;
  }

  return balance;
}
