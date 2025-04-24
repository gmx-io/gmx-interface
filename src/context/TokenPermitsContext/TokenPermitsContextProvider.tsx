import React, { createContext, useContext, useMemo } from "react";

import { getTokenPermitsKey } from "config/localStorage";
import { createAndSignTokenPermit, getTokenPermitParams } from "domain/tokens/permitUtils";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_PERMIT_DEADLINE_DURATION } from "sdk/configs/express";
import { SignedTokenPermit } from "sdk/types/tokens";
import { nowInSeconds } from "sdk/utils/time";

export type TokenPermitsState = {
  tokenPermits: SignedTokenPermit[] | undefined;
  addTokenPermit: (
    tokenAddress: string,
    spenderAddress: string,
    value: bigint,
    verifyingContract: string
  ) => Promise<void>;
  resetTokenPermits: () => void;
};

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
    []
  );

  const state = useMemo(() => {
    async function addTokenPermit(
      tokenAddress: string,
      spenderAddress: string,
      value: bigint,
      verifyingContract: string
    ) {
      if (!signer) {
        return;
      }

      const permitParams = await getTokenPermitParams(chainId, signer.address, tokenAddress, signer.provider);

      const tokenPermit = await createAndSignTokenPermit(chainId, signer, tokenAddress, spenderAddress, value, {
        name: permitParams.name,
        version: permitParams.version,
        nonce: permitParams.nonce,
        domainSeparator: permitParams.domainSeparator,
        deadline: BigInt(nowInSeconds() + DEFAULT_PERMIT_DEADLINE_DURATION),
        verifyingContract,
      });

      setTokenPermits((old) => [...(old ?? []), tokenPermit]);
    }

    function resetTokenPermits() {
      setTokenPermits([]);
    }

    return {
      tokenPermits,
      addTokenPermit,
      resetTokenPermits,
    };
  }, [tokenPermits, signer, chainId, setTokenPermits]);

  return <TokenPermitsContext.Provider value={state}>{children}</TokenPermitsContext.Provider>;
}
