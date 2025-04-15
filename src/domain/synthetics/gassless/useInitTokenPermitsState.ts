import { useMemo } from "react";

import { getTokenPermitsKey } from "config/localStorage";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_PERMIT_DEADLINE_DURATION } from "sdk/configs/express";
import { SignedTokenPermit } from "sdk/types/tokens";
import { nowInSeconds } from "sdk/utils/time";

import { createAndSignTokenPermit } from "./txns/tokenPermitUtils";

export type TokenPermitsState = ReturnType<typeof useInitTokenPermitsState>;

export function useInitTokenPermitsState() {
  const { chainId } = useChainId();
  const { signer } = useWallet();

  const [tokenPermits, setTokenPermits] = useLocalStorageSerializeKey<SignedTokenPermit[]>(
    getTokenPermitsKey(chainId),
    []
  );

  return useMemo(() => {
    async function addTokenPermit(tokenAddress: string, spenderAddress: string, value: bigint) {
      if (!signer) {
        return;
      }

      const tokenPermit = await createAndSignTokenPermit(
        chainId,
        signer,
        tokenAddress,
        spenderAddress,
        value,
        BigInt(nowInSeconds() + DEFAULT_PERMIT_DEADLINE_DURATION)
      );

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
}
