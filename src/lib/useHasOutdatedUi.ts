import useSWR from "swr";

import { UI_VERSION } from "config/env";

import { isDevelopment } from "config/env";
import { REQUIRED_UI_VERSION_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { useOracleKeeperFetcher } from "./oracleKeeperFetcher";

export function useHasOutdatedUi() {
  const { chainId } = useChainId();
  const { active } = useWallet();
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const { data: minVersion, mutate } = useSWR([chainId, active], {
    fetcher: () => oracleKeeperFetcher.fetchUiVersion(UI_VERSION, active),
  });

  let hasOutdatedUi = false;

  if (typeof minVersion === "number" && minVersion > UI_VERSION) {
    hasOutdatedUi = true;
  }

  if (isDevelopment()) {
    const localStorageVersion = localStorage.getItem(REQUIRED_UI_VERSION_KEY);
    hasOutdatedUi = Boolean(localStorageVersion && parseFloat(localStorageVersion) > UI_VERSION);
  }

  return { data: hasOutdatedUi, mutate };
}
