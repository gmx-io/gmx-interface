import { useCallback, useEffect, useMemo, useReducer } from "react";

import { useUiFlagsRequest } from "domain/synthetics/uiFlags/useUiFlagsRequest";
import { readLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";

import {
  TargetedAnnouncementCampaign,
  getTargetedAnnouncementAddressHash,
  shouldShowTargetedAnnouncement,
} from "./targetedAnnouncementLogic";

const MAX_TIMEOUT_MS = 2_147_483_647;

export function useTargetedAnnouncement(campaign: TargetedAnnouncementCampaign) {
  const { account, chainId } = useWallet();
  const { uiFlags } = useUiFlagsRequest();
  const [stateVersion, bumpStateVersion] = useReducer((version: number) => version + 1, 0);

  const accountHash = useMemo(() => getTargetedAnnouncementAddressHash(account), [account]);
  const isDismissed =
    readLocalStorageItem([campaign.dismissedKey, accountHash], {
      deserializer: (value) => value === "true",
    }) ?? false;

  const isVisible = shouldShowTargetedAnnouncement({
    campaign,
    accountHash,
    chainId,
    flagEnabled: uiFlags?.[campaign.flag]?.enabled === true,
    isDismissed,
    now: Date.now(),
  });

  useEffect(() => {
    if (!isVisible) return;

    const remainingMs = campaign.endTimestamp - Date.now();
    if (remainingMs <= 0) return;

    const timeoutId = window.setTimeout(bumpStateVersion, Math.min(remainingMs + 1, MAX_TIMEOUT_MS));
    return () => window.clearTimeout(timeoutId);
  }, [isVisible, stateVersion, campaign.endTimestamp]);

  const dismiss = useCallback(() => {
    if (!accountHash) return;

    writeLocalStorageItem([campaign.dismissedKey, accountHash], true, {
      serializer: String,
    });
    bumpStateVersion();
  }, [accountHash, campaign.dismissedKey]);

  return { isVisible, dismiss };
}
