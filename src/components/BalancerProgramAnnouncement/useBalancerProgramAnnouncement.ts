import { useCallback, useEffect, useMemo, useReducer } from "react";

import { BALANCER_PROGRAM_ANNOUNCEMENT_DISMISSED_KEY } from "config/localStorage";
import { useUiFlagsRequest } from "domain/synthetics/uiFlags/useUiFlagsRequest";
import { readLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";

import {
  BALANCER_PROGRAM_ANNOUNCEMENT_END_TIMESTAMP,
  BALANCER_PROGRAM_ANNOUNCEMENT_FLAG,
  getBalancerProgramAddressHash,
  shouldShowBalancerProgramAnnouncement,
} from "./balancerProgramAnnouncementLogic";

const MAX_TIMEOUT_MS = 2_147_483_647;

export function useBalancerProgramAnnouncement() {
  const { account } = useWallet();
  const { uiFlags } = useUiFlagsRequest();
  const [stateVersion, bumpStateVersion] = useReducer((version: number) => version + 1, 0);

  const accountHash = useMemo(() => getBalancerProgramAddressHash(account), [account]);
  const dismissalKey = [BALANCER_PROGRAM_ANNOUNCEMENT_DISMISSED_KEY, accountHash];
  const isDismissed =
    readLocalStorageItem(dismissalKey, {
      deserializer: (value) => value === "true",
    }) ?? false;

  const isVisible = shouldShowBalancerProgramAnnouncement({
    accountHash,
    flagEnabled: uiFlags?.[BALANCER_PROGRAM_ANNOUNCEMENT_FLAG]?.enabled === true,
    isDismissed,
    now: Date.now(),
  });

  useEffect(() => {
    if (!isVisible) return;

    const remainingMs = BALANCER_PROGRAM_ANNOUNCEMENT_END_TIMESTAMP - Date.now();
    if (remainingMs <= 0) return;

    const timeoutId = window.setTimeout(bumpStateVersion, Math.min(remainingMs + 1, MAX_TIMEOUT_MS));
    return () => window.clearTimeout(timeoutId);
  }, [isVisible, stateVersion]);

  const dismiss = useCallback(() => {
    if (!accountHash) return;

    writeLocalStorageItem([BALANCER_PROGRAM_ANNOUNCEMENT_DISMISSED_KEY, accountHash], true, {
      serializer: String,
    });
    bumpStateVersion();
  }, [accountHash]);

  return { isVisible, dismiss };
}
