import { useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";
import { useAccount } from "wagmi";

import type { SettlementChainId } from "config/chains";
import { getChainIdFromSearchParam, getSettlementChainIdForSelectedChain } from "lib/chains/chainIdSearchParam";
import { extendError } from "lib/errors";
import { SMART_WALLET_CHAIN_UNAVAILABLE_ERROR } from "lib/errors/customErrors";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import useSearchParams from "lib/useSearchParams";
import { switchNetwork } from "lib/wallets";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";

import { getSmartWalletChainUnavailableToastContent } from "components/Errors/errorToasts";

export function useChainIdSearchParam({
  settlementChainId,
  setSettlementChainId,
}: {
  settlementChainId: SettlementChainId;
  setSettlementChainId: (chainId: SettlementChainId) => void;
}) {
  const history = useHistory();
  const { chainId: chainIdParam } = useSearchParams<{ chainId?: string }>();
  const isWalletInitializing = useIsWalletInitializing();
  const { chainId: walletChainId } = useAccount();
  const processedChainIdParamRef = useRef<string>();

  useEffect(() => {
    if (!chainIdParam) {
      processedChainIdParamRef.current = undefined;
      return;
    }

    if (isWalletInitializing || processedChainIdParamRef.current === chainIdParam) {
      return;
    }

    const deleteChainIdParam = () => {
      const searchParams = new URLSearchParams(history.location.search);

      if (!searchParams.has("chainId")) {
        return;
      }

      searchParams.delete("chainId");
      history.replace({ pathname: history.location.pathname, search: searchParams.toString() });
    };

    const requestedChainId = getChainIdFromSearchParam(chainIdParam);

    if (requestedChainId === undefined) {
      processedChainIdParamRef.current = chainIdParam;
      deleteChainIdParam();
      return;
    }

    if (walletChainId === undefined) {
      const requestedSettlementChainId = getSettlementChainIdForSelectedChain(requestedChainId, settlementChainId);

      if (requestedSettlementChainId !== settlementChainId) {
        setSettlementChainId(requestedSettlementChainId);
        return;
      }
    }

    processedChainIdParamRef.current = chainIdParam;

    switchNetwork(requestedChainId, true, { fallbackToAppSelectionOnError: true })
      .catch((error) => {
        if (error?.message === SMART_WALLET_CHAIN_UNAVAILABLE_ERROR) {
          helperToast.error(getSmartWalletChainUnavailableToastContent(requestedChainId));
        }

        metrics.pushError(
          extendError(error, { data: { chainId: requestedChainId } }),
          "chainIdSearchParam.switchNetwork"
        );
      })
      .finally(deleteChainIdParam);
  }, [chainIdParam, isWalletInitializing, walletChainId, settlementChainId, setSettlementChainId, history]);
}
