import useSWR from "swr";
import { type Hash } from "viem";

import { useUiFlagsRequest } from "domain/synthetics/uiFlags/useUiFlagsRequest";
import { createTimeoutSignal } from "lib/abortSignalHelpers";
import useWallet from "lib/wallets/useWallet";

import { LazyTargetedAnnouncementCampaign } from "./targetedAnnouncementLogic";
import { useTargetedAnnouncement } from "./useTargetedAnnouncement";

const NO_ADDRESS_HASHES = new Set<Hash>();

const ADDRESS_HASHES_SWR_OPTIONS = {
  refreshInterval: 0,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  shouldRetryOnError: false,
};

async function fetchAddressHashes(url: string): Promise<Set<Hash>> {
  const response = await fetch(url, { signal: createTimeoutSignal(10_000) });

  if (!response.ok) {
    throw new Error(`Failed to load address hashes: ${response.status}`);
  }

  const hashes: Hash[] = await response.json();

  return new Set(hashes);
}

export function useLazyTargetedAnnouncement(campaign: LazyTargetedAnnouncementCampaign) {
  const { account } = useWallet();
  const { uiFlags } = useUiFlagsRequest();
  const isRunning = uiFlags?.[campaign.flag]?.enabled === true && Date.now() < campaign.endTimestamp;

  const { data: addressHashes, isLoading } = useSWR(
    account && isRunning ? ["targetedAnnouncementAddressHashes", campaign.flag] : null,
    () => fetchAddressHashes(campaign.addressHashesUrl),
    ADDRESS_HASHES_SWR_OPTIONS
  );

  const { isVisible, dismiss } = useTargetedAnnouncement({
    flag: campaign.flag,
    endTimestamp: campaign.endTimestamp,
    dismissedKey: campaign.dismissedKey,
    addressHashes: addressHashes ?? NO_ADDRESS_HASHES,
  });

  return { isVisible, dismiss, isLoading };
}
