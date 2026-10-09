import uniq from "lodash/uniq";
import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import useSWR from "swr";
import { isAddressEqual, type Address } from "viem";

import { getTokenPermitsFallbackKey, getTokenPermitsKey, LEGACY_PERMITS_DISABLED_KEY } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useUiFlagsRequest } from "domain/synthetics/uiFlags/useUiFlagsRequest";
import {
  createAndSignTokenPermit,
  getIsPermitExpired,
  getIsSameTokenPermit,
  getPermitsExpiryTimeoutMs,
  validateTokenPermitSignature,
} from "domain/tokens/permitUtils";
import {
  getIsTokenPermitAllowed,
  getIsTokenPermitsEnabled,
  getTokenPermitAccountType,
  TokenPermitAccountType,
} from "domain/tokens/tokenPermitsEligibility";
import { useChainId } from "lib/chains";
import { getInvalidPermitSignatureError } from "lib/errors/customErrors";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { EMPTY_ARRAY } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { nowInSeconds } from "sdk/utils/time";
import { SignedTokenPermit } from "sdk/utils/tokens/types";

export type TokenPermitsState = {
  /** Usable permits only: empty while permits are switched off for the account */
  tokenPermits: SignedTokenPermit[];
  accountType: TokenPermitAccountType | undefined;
  getIsPermitAvailable: (tokenAddress: string) => boolean;
  addTokenPermit: AddTokenPermitFn;
  removeTokenPermits: (permits: SignedTokenPermit[]) => void;
  /** Sends the tokens back to the approval transaction for this account */
  disableTokenPermits: (tokenAddresses: string[]) => void;
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

function useTokenPermitAccountType(chainId: number, account: string | undefined) {
  const { data } = useSWR<TokenPermitAccountType>(account ? [account, chainId, "tokenPermitAccountType"] : null, {
    fetcher: () => getTokenPermitAccountType(account!, getPublicClientWithRpc(chainId)),
    refreshInterval: 0,
  });

  return data;
}

export function TokenPermitsContextProvider({ children }: { children: React.ReactNode }) {
  const { chainId } = useChainId();
  const { signer } = useWallet();
  const account = signer?.address;
  const { uiFlags } = useUiFlagsRequest();
  const { isTokenPermitsQaOverrideEnabled } = useSettings();
  const accountType = useTokenPermitAccountType(chainId, account);

  const isEnabled = getIsTokenPermitsEnabled({
    uiFlags,
    accountType,
    isQaOverrideEnabled: isTokenPermitsQaOverrideEnabled,
  });

  useEffect(function retireLegacyPermitsDisabledKey() {
    localStorage.removeItem(JSON.stringify(LEGACY_PERMITS_DISABLED_KEY));
  }, []);

  const [fallbackTokens, setFallbackTokens] = useLocalStorageSerializeKey<string[]>(
    getTokenPermitsFallbackKey(chainId, account),
    []
  );

  const [storedTokenPermits, setTokenPermits] = useLocalStorageSerializeKey<SignedTokenPermit[]>(
    getTokenPermitsKey(chainId, account),
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

  const getIsPermitAvailable = useCallback(
    (tokenAddress: string) =>
      isEnabled && getIsTokenPermitAllowed(chainId, tokenAddress) && !fallbackTokens?.includes(tokenAddress),
    [chainId, fallbackTokens, isEnabled]
  );

  const tokenPermits = useMemo(() => {
    if (!isEnabled || !account || !storedTokenPermits?.length) {
      return EMPTY_ARRAY;
    }

    return storedTokenPermits.filter(
      (permit) => isAddressEqual(permit.owner as Address, account as Address) && getIsPermitAvailable(permit.token)
    );
  }, [account, getIsPermitAvailable, isEnabled, storedTokenPermits]);

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

      // a newer permit reuses the on-chain nonce, so it replaces the older one for the same token and spender
      const otherPermits = (storedTokenPermits ?? []).filter(
        (p) => p.token !== permit.token || p.spender !== permit.spender
      );

      setTokenPermits([...otherPermits, permit]);
    },
    [chainId, setTokenPermits, storedTokenPermits, signer]
  );

  const removeTokenPermits = useCallback(
    (permits: SignedTokenPermit[]) => {
      if (!storedTokenPermits?.length || permits.length === 0) {
        return;
      }

      setTokenPermits(storedTokenPermits.filter((stored) => !permits.some((p) => getIsSameTokenPermit(stored, p))));
    },
    [setTokenPermits, storedTokenPermits]
  );

  const disableTokenPermits = useCallback(
    (tokenAddresses: string[]) => {
      const newTokens = uniq(tokenAddresses).filter((tokenAddress) => !fallbackTokens?.includes(tokenAddress));

      if (newTokens.length > 0) {
        setFallbackTokens([...(fallbackTokens ?? []), ...newTokens]);
      }
    },
    [fallbackTokens, setFallbackTokens]
  );

  useEffect(
    function revalidatePermits() {
      if (!storedTokenPermits?.length) return;

      const valid = storedTokenPermits.filter((permit) => !getIsPermitExpired(permit));

      if (valid.length !== storedTokenPermits.length) {
        setTokenPermits(valid);
        return;
      }

      const timeoutId = setTimeout(
        () => {
          setTokenPermits(storedTokenPermits.filter((p) => !getIsPermitExpired(p)));
        },
        getPermitsExpiryTimeoutMs(storedTokenPermits, nowInSeconds())
      );

      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          const stillValid = storedTokenPermits.filter((permit) => !getIsPermitExpired(permit));
          if (stillValid.length !== storedTokenPermits.length) {
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
    [storedTokenPermits, setTokenPermits]
  );

  const state = useMemo(
    () => ({
      tokenPermits,
      accountType,
      getIsPermitAvailable,
      addTokenPermit,
      removeTokenPermits,
      disableTokenPermits,
    }),
    [tokenPermits, accountType, getIsPermitAvailable, addTokenPermit, removeTokenPermits, disableTokenPermits]
  );

  return <TokenPermitsContext.Provider value={state}>{children}</TokenPermitsContext.Provider>;
}
