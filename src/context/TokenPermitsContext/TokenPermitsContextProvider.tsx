import React, { createContext, useCallback, useContext, useMemo } from "react";

import { getTokenPermitsKey } from "config/localStorage";
import { createAndSignTokenPermit, getIsPermitExpired } from "domain/tokens/permitUtils";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { metrics } from "lib/metrics";
import useWallet from "lib/wallets/useWallet";
import { SignedTokenPermit } from "sdk/types/tokens";

export type TokenPermitsState = {
  tokenPermits: SignedTokenPermit[];
  addTokenPermit: AddTokenPermitFn;
  resetTokenPermits: () => void;
};

export type AddTokenPermitFn = (tokenAddress: string, spenderAddress: string, value: bigint) => Promise<void>;

const TokenPermitsContext = createContext<TokenPermitsState | undefined>(undefined);

export function useTokenPermitsContext() {
  const context = useContext(TokenPermitsContext);
  if (!context) {
    throw new Error("useTokenPermits must be used within TokenPermitsContextProvider");
  }
  return context;
}

export function TokenPermitsContextProvider({ children }: { children: React.ReactNode }) {
  const { chainId } = useChainId();
  const { signer } = useWallet();

  const [tokenPermits, setTokenPermits] = useLocalStorageSerializeKey<SignedTokenPermit[]>(
    getTokenPermitsKey(chainId),
    [],
    {
      raw: false,
      serializer: (val) => {
        if (!val) {
          return "";
        }

        return JSON.stringify(val);
      },
      deserializer: (stored) => {
        if (!stored) {
          return undefined;
        }

        try {
          const parsed = JSON.parse(stored);
          return parsed.map((permit: any) => ({
            ...permit,
            value: BigInt(permit.value),
            deadline: BigInt(permit.deadline),
          }));
        } catch (e) {
          return undefined;
        }
      },
    }
  );

  const addTokenPermit = useCallback(
    async (tokenAddress: string, spenderAddress: string, value: bigint) => {
      if (!signer?.provider) {
        return;
      }

      try {
        const tokenPermit = await createAndSignTokenPermit(chainId, signer, tokenAddress, spenderAddress, value);

        setTokenPermits(tokenPermits?.concat(tokenPermit) ?? [tokenPermit]);
      } catch (e) {
        metrics.pushError(e, "tokenPermits.addTokenPermit");
        throw e;
      }
    },
    [chainId, setTokenPermits, tokenPermits, signer]
  );

  const resetTokenPermits = useCallback(() => {
    setTokenPermits([]);
  }, [setTokenPermits]);

  const state = useMemo(() => {
    return {
      tokenPermits: tokenPermits?.filter((permit) => !getIsPermitExpired(permit)) ?? [],
      addTokenPermit,
      resetTokenPermits,
    };
  }, [tokenPermits, addTokenPermit, resetTokenPermits]);

  return <TokenPermitsContext.Provider value={state}>{children}</TokenPermitsContext.Provider>;
}
