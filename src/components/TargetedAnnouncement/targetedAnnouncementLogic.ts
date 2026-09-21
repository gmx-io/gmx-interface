import { getAddress, keccak256, stringToHex, type Hash } from "viem";

export type TargetedAnnouncementCampaign = {
  flag: string;
  endTimestamp: number;
  dismissedKey: string;
  addressHashes: Set<Hash>;
};

export function getTargetedAnnouncementAddressHash(address: string | undefined): Hash | undefined {
  if (!address) return undefined;

  try {
    return keccak256(stringToHex(getAddress(address)));
  } catch {
    return undefined;
  }
}

export function shouldShowTargetedAnnouncement({
  campaign,
  accountHash,
  flagEnabled,
  isDismissed,
  now,
}: {
  campaign: TargetedAnnouncementCampaign;
  accountHash: Hash | undefined;
  flagEnabled: boolean;
  isDismissed: boolean;
  now: number;
}): boolean {
  return (
    flagEnabled &&
    !isDismissed &&
    now < campaign.endTimestamp &&
    accountHash !== undefined &&
    campaign.addressHashes.has(accountHash)
  );
}
