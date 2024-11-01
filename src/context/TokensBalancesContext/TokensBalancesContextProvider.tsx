import { useChainId } from "lib/chains";
import { EMPTY_OBJECT } from "lib/objects";
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
  resetTokensBalancesUpdates: () => void;
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

  const resetTokensBalancesUpdates = useCallback(() => {
    setTokensBalancesUpdates({});
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
