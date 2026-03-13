import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";

import { getTokenPermitsKey, PERMITS_DISABLED_KEY } from "config/localStorage";
import { createAndSignTokenPermit, getIsPermitExpired, validateTokenPermitSignature } from "domain/tokens/permitUtils";
import { useChainId } from "lib/chains";
import { getInvalidPermitSignatureError } from "lib/errors/customErrors";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";
import { nowInSeconds } from "sdk/utils/time";
import { SignedTokenPermit } from "sdk/utils/tokens/types";

const PERMIT_EXPIRY_BUFFER_MS = 500;

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

      const now = nowInSeconds();
      const valid = tokenPermits.filter((permit) => !getIsPermitExpired(permit));

      if (valid.length !== tokenPermits.length) {
        setTokenPermits(valid);
        return;
      }

      const nearestDeadline = Math.min(...tokenPermits.map((p) => Number(p.deadline)));
      const msUntilExpiry = (nearestDeadline - now + 1) * 1000 + PERMIT_EXPIRY_BUFFER_MS;

      const timeoutId = setTimeout(
        () => {
          setTokenPermits(tokenPermits.filter((p) => !getIsPermitExpired(p)));
        },
        Math.max(0, msUntilExpiry)
      );

      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          const stillValid = tokenPermits.filter((permit) => !getIsPermitExpired(permit));
          if (stillValid.length !== tokenPermits.length) {
            setTokenPermits(stillValid);
          }
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

  const activeTokenPermits = useMemo(
    () => (tokenPermits ?? []).filter((permit) => !getIsPermitExpired(permit)),
    [tokenPermits]
  );

  const state = useMemo(
    () => ({
      isPermitsDisabled: Boolean(isPermitsDisabled),
      setIsPermitsDisabled,
      tokenPermits: activeTokenPermits,
      addTokenPermit,
      resetTokenPermits,
    }),
    [isPermitsDisabled, setIsPermitsDisabled, activeTokenPermits, addTokenPermit, resetTokenPermits]
  );

  return <TokenPermitsContext.Provider value={state}>{children}</TokenPermitsContext.Provider>;
}
