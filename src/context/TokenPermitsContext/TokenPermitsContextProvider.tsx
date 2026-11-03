import uniq from "lodash/uniq";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useLatest } from "react-use";
import useSWR from "swr";
import { isAddressEqual, type Address } from "viem";

import { isSolanaNetwork } from "config/chains";
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
import { getInvalidPermitSignatureError, PERMIT_WALLET_CHANGED_ERROR } from "lib/errors/customErrors";
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
  /** permitsChainId: the chain the permits were signed for, when it may no longer be the current one */
  removeTokenPermits: (permits: SignedTokenPermit[], permitsChainId?: number) => void;
  /** Only for failures a retry won't fix; `target` defaults to the current chain and account */
  disableTokenPermits: (tokenAddresses: string[], target?: { chainId: number; account: string }) => void;
};

export type AddTokenPermitFn = (
  tokenAddress: string,
  spenderAddress: string,
  value: bigint,
  options?: { deadline?: bigint }
) => Promise<void>;

const TokenPermitsContext = createContext<TokenPermitsState | undefined>(undefined);

function readFallbackTokens(key: NonNullable<ReturnType<typeof getTokenPermitsFallbackKey>>): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(JSON.stringify(key)) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function removeInactiveStoredTokenPermits(chainId: number, owner: string, permits: SignedTokenPermit[]) {
  const key = JSON.stringify(getTokenPermitsKey(chainId, owner));
  const stored = localStorage.getItem(key);

  if (!stored) return;

  try {
    const parsed: SignedTokenPermit[] = JSON.parse(stored);
    const remaining = parsed.filter((storedPermit) => !permits.some((p) => getIsSameTokenPermit(storedPermit, p)));

    if (remaining.length !== parsed.length) {
      localStorage.setItem(key, JSON.stringify(remaining));
    }
  } catch (e) {
    // a broken entry is replaced on the next write for that account
  }
}

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
  const { chainId, networkId } = useChainId();
  const { signer } = useWallet();
  const account = signer?.address;
  const { uiFlags } = useUiFlagsRequest();
  const { isTokenPermitsQaOverrideEnabled } = useSettings();
  const accountType = useTokenPermitAccountType(chainId, isSolanaNetwork(networkId) ? undefined : account);

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

  // several permits can be signed in one flow (One-Click activation), before a re-render refreshes the closure;
  // the list is only reused while the account and chain it was read for are still the active ones
  const walletKey = `${chainId}:${account}`;
  const latestStoredTokenPermits = useRef({
    walletKey,
    chainId,
    account,
    permits: storedTokenPermits,
    setTokenPermits,
  });
  latestStoredTokenPermits.current = { walletKey, chainId, account, permits: storedTokenPermits, setTokenPermits };

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
    async (tokenAddress: string, spenderAddress: string, value: bigint, options?: { deadline?: bigint }) => {
      // returning quietly would read as a signed permit to the caller while nothing was stored
      if (!signer?.provider) {
        throw new Error("Wallet is not ready to sign a permit");
      }

      const signerWalletKey = `${chainId}:${signer.address}`;
      const assertWalletUnchanged = () => {
        if (latestStoredTokenPermits.current.walletKey !== signerWalletKey) {
          throw new Error(PERMIT_WALLET_CHANGED_ERROR);
        }
      };

      assertWalletUnchanged();

      const { permit } = await createAndSignTokenPermit(
        chainId,
        signer,
        tokenAddress,
        spenderAddress,
        value,
        options?.deadline
      );

      // before the signature check: a wallet that signs with the newly selected account would read as a bad signature
      assertWalletUnchanged();

      const validationResult = await validateTokenPermitSignature(chainId, permit);

      if (!validationResult.isValid) {
        throw getInvalidPermitSignatureError({
          isValid: validationResult.isValid,
          permit,
          error: validationResult.error,
        });
      }

      assertWalletUnchanged();

      // a newer permit reuses the on-chain nonce, so it replaces the older one for the same token and spender
      const otherPermits = (latestStoredTokenPermits.current.permits ?? []).filter(
        (p) => p.token !== permit.token || p.spender !== permit.spender
      );
      const nextPermits = [...otherPermits, permit];

      latestStoredTokenPermits.current = { ...latestStoredTokenPermits.current, permits: nextPermits };
      latestStoredTokenPermits.current.setTokenPermits(nextPermits);
    },
    [chainId, signer]
  );

  const removeTokenPermits = useCallback(
    (permits: SignedTokenPermit[], permitsChainId?: number) => {
      // the latest render's wallet and list: callers often hold a closure from before a switch or a newer permit
      const latest = latestStoredTokenPermits.current;
      const isActive = (permit: SignedTokenPermit) =>
        (permitsChainId ?? chainId) === latest.chainId &&
        latest.account !== undefined &&
        isAddressEqual(permit.owner as Address, latest.account as Address);

      uniq(permits.filter((permit) => !isActive(permit)).map((permit) => permit.owner)).forEach((owner) => {
        removeInactiveStoredTokenPermits(permitsChainId ?? chainId, owner, permits);
      });

      const activePermits = permits.filter(isActive);

      if (!latest.permits?.length || activePermits.length === 0) {
        return;
      }

      const nextPermits = latest.permits.filter(
        (stored) => !activePermits.some((p) => getIsSameTokenPermit(stored, p))
      );

      latestStoredTokenPermits.current = { ...latest, permits: nextPermits };
      latest.setTokenPermits(nextPermits);
    },
    [chainId]
  );

  const latestFallbackContext = useLatest({ chainId, account, setFallbackTokens });

  const disableTokenPermits = useCallback(
    (tokenAddresses: string[], target?: { chainId: number; account: string }) => {
      const current = latestFallbackContext.current;
      const targetChainId = target?.chainId ?? current.chainId;
      const targetAccount = target?.account ?? current.account;
      const key = getTokenPermitsFallbackKey(targetChainId, targetAccount);

      if (!key || !targetAccount) return;

      // read from storage rather than the render: callers can run after another disable or a wallet switch
      const storedTokens = readFallbackTokens(key);
      const newTokens = uniq(tokenAddresses).filter((tokenAddress) => !storedTokens.includes(tokenAddress));

      if (newTokens.length === 0) return;

      const nextTokens = [...storedTokens, ...newTokens];
      const isCurrent =
        targetChainId === current.chainId &&
        current.account !== undefined &&
        isAddressEqual(targetAccount as Address, current.account as Address);

      if (isCurrent) {
        current.setFallbackTokens(nextTokens);
      } else {
        localStorage.setItem(JSON.stringify(key), JSON.stringify(nextTokens));
      }
    },
    [latestFallbackContext]
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
