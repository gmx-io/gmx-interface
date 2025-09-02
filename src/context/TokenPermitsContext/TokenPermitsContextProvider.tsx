import React, { createContext, useCallback, useContext, useMemo } from "react";

import { getTokenPermitsKey } from "config/localStorage";
import { createAndSignTokenPermit, getIsPermitExpired, validateTokenPermitSignature } from "domain/tokens/permitUtils";
import { useChainId } from "lib/chains";
import { getInvalidPermitSignatureError } from "lib/errors/customErrors";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";
import { SignedTokenPermit } from "sdk/types/tokens";

export type TokenPermitsState = {
  tokenPermits: SignedTokenPermit[];
  addTokenPermit: AddTokenPermitFn;
  setIsPermitsDisabled: (disabled: boolean) => void;
  isPermitsDisabled: boolean;
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

  // Test hypothesis: disable permits can improve express success rate
  const isPermitsDisabled = true;

  const [tokenPermits, setTokenPermits] = useLocalStorageSerializeKey<SignedTokenPermit[]>(
    getTokenPermitsKey(chainId, signer?.address),
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

      const { permit } = await createAndSignTokenPermit(chainId, signer, tokenAddress, spenderAddress, value);

      const validationResult = await validateTokenPermitSignature(chainId, permit);

      if (!validationResult.isValid) {
        throw getInvalidPermitSignatureError({
          isValid: validationResult.isValid,
          permit,
          error: validationResult.error,
        });
      }

      setTokenPermits(tokenPermits?.concat(permit) ?? [permit]);
    },
    [chainId, setTokenPermits, tokenPermits, signer]
  );

  const resetTokenPermits = useCallback(() => {
    setTokenPermits([]);
  }, [setTokenPermits]);

  const state = useMemo(
    () => ({
      isPermitsDisabled: Boolean(isPermitsDisabled),
      setIsPermitsDisabled: () => null,
      tokenPermits: tokenPermits?.filter((permit) => !getIsPermitExpired(permit)) ?? [],
      addTokenPermit,
      resetTokenPermits,
    }),
    [isPermitsDisabled, tokenPermits, addTokenPermit, resetTokenPermits]
  );

  return <TokenPermitsContext.Provider value={state}>{children}</TokenPermitsContext.Provider>;
}
