import { useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, BOTANIX, UiSupportedChain } from "config/chains";
import useRouteQuery from "lib/useRouteQuery";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

const validNetworks: Record<UiSupportedChain, number> = {
  [ARBITRUM]: 42161,
  [AVALANCHE]: 43114,
  [AVALANCHE_FUJI]: 43113,
  [BOTANIX]: 42161,
};

export function useChangeNetworkByQueryParameter() {
  const query = useRouteQuery();
  const loadedRef = useRef(false);
  const timeoutRef = useRef(0);
  const { active } = useWallet();
  const history = useHistory();

  useEffect(() => {
    if (!active) {
      timeoutRef.current = window.setTimeout(() => {
        switchNetwork(chainId, false);
      }, 2_000);
      return;
    }

    if (loadedRef.current) {
      return;
    }

    loadedRef.current = true;
    clearTimeout(timeoutRef.current ?? 0);

    const chainId = Number(query.get("chainId"));
    query.delete("chainId");

    history.replace({
      search: query.toString(),
    });
    if (chainId in validNetworks) {
      switchNetwork(chainId, active);
      alert("switch!");
    }
  }, [active, history, query]);
}
