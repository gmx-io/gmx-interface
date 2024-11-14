import { TokenBalancesData, TokenData, TokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
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

const Context = createContext<TokensBalancesContextType | null>(null);

export function TokensBalancesContextProvider({ children }: PropsWithChildren) {
  const { chainId } = useChainId();

  const [tokensBalancesUpdates, setTokensBalancesUpdates] = useState<TokensBalancesUpdates>({});

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

export function useTokensBalancesUpdates(): TokensBalancesContextType {
  const context = useContext(Context);

  if (!context) {
    throw new Error("useTokensBalancesUpdates must be used within a TokensBalancesContextProvider");
  }

  return context;
}

export function useUpdatedTokensBalances<T extends TokenBalancesData | TokensData>(balancesData?: T): T | undefined {
  const { tokensBalancesUpdates } = useTokensBalancesUpdates();

  return useMemo(() => {
    if (!balancesData) {
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
