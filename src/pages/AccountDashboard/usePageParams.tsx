import { useEffect, useMemo } from "react";
import { useHistory, useParams } from "react-router-dom";
import { checksumAddress, isAddress, type Address } from "viem";

import { SUPPORTED_CHAIN_IDS, UiSupportedChain } from "config/chains";
import useSearchParams from "lib/useSearchParams";

import { buildAccountDashboardUrl } from "./buildAccountDashboardUrl";
import { NETWORK_SLUGS_ID_MAP } from "./constants";

export function usePageParams(initialChainId: number) {
  const history = useHistory();

  const params = useParams<{ account?: Address }>();
  const queryParams = useSearchParams<{ network?: string; v?: string }>();
  const chainIdFromParams = NETWORK_SLUGS_ID_MAP[queryParams.network || ""] as number | undefined;
  const chainId = chainIdFromParams ?? initialChainId;
  const accountFromParams = params.account || undefined;
  const account = useMemo(
    () =>
      accountFromParams && isAddress(accountFromParams.toLowerCase())
        ? checksumAddress(accountFromParams)
        : accountFromParams,
    [accountFromParams]
  );

  const version = parseInt(queryParams.v ?? "2");

  useEffect(() => {
    let patch = undefined as any;
    if (!chainIdFromParams || !SUPPORTED_CHAIN_IDS.includes(chainIdFromParams as UiSupportedChain)) {
      patch = { chainId: initialChainId };
    }

    if (version !== 1 && version !== 2) {
      patch = { ...patch, version: 2 };
    }

    if (account !== accountFromParams) {
      patch = { ...patch, account };
    }

    if (patch) {
      history.replace(buildAccountDashboardUrl(account, patch.chainId ?? chainId, patch.version ?? version));
    }
  }, [account, accountFromParams, chainId, chainIdFromParams, history, initialChainId, version]);

  return { chainId, version, account };
}
