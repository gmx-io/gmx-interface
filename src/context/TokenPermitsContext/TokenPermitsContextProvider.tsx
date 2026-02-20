import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";

import { getTokenPermitsKey, PERMITS_DISABLED_KEY } from "config/localStorage";
import { createAndSignTokenPermit, getIsPermitExpired, validateTokenPermitSignature } from "domain/tokens/permitUtils";
import { useChainId } from "lib/chains";
import { getInvalidPermitSignatureError } from "lib/errors/customErrors";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";
import { SignedTokenPermit } from "sdk/utils/tokens/types";

const PERMIT_CLEANUP_POLL_MS = 5_000;

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

  const [isPermitsDisabled, setIsPermitsDisabled] = useLocalStorageSerializeKey<boolean>(PERMITS_DISABLED_KEY, false);

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

  useEffect(
    function revalidatePermits() {
      if (!tokenPermits?.length) return;

      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const cleanExpired = () => {
        const valid = tokenPermits.filter((permit) => !getIsPermitExpired(permit));
        if (valid.length !== tokenPermits.length) {
          setTokenPermits(valid);
        } else {
          timeoutId = setTimeout(cleanExpired, PERMIT_CLEANUP_POLL_MS);
        }
      };

      cleanExpired();

      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          cleanExpired();
        }
      };

      document.addEventListener("visibilitychange", onVisibilityChange);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };
    },
    [tokenPermits, setTokenPermits]
  );

  const state = useMemo(
    () => ({
      isPermitsDisabled: Boolean(isPermitsDisabled),
      setIsPermitsDisabled,
      tokenPermits: tokenPermits ?? [],
      addTokenPermit,
      resetTokenPermits,
    }),
    [isPermitsDisabled, setIsPermitsDisabled, tokenPermits, addTokenPermit, resetTokenPermits]
  );

  return <TokenPermitsContext.Provider value={state}>{children}</TokenPermitsContext.Provider>;
}
