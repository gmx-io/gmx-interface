import { getAddress, keccak256, stringToHex, type Hash } from "viem";

export type TargetedAnnouncementCampaign = {
  flag: string;
  endTimestamp: number;
  dismissedKey: string;
  addressHashes: Set<Hash>;
  chainIds?: readonly number[];
};

export function getTargetedAnnouncementAddressHash(address: string | undefined): Hash | undefined {
  if (!address) return undefined;

  try {
    return keccak256(stringToHex(getAddress(address)));
  } catch {
    return undefined;
  }
}

function isCampaignChain(campaign: TargetedAnnouncementCampaign, chainId: number | undefined): boolean {
  if (campaign.chainIds === undefined) return true;

  return chainId !== undefined && campaign.chainIds.includes(chainId);
}

export function shouldShowTargetedAnnouncement({
  campaign,
  accountHash,
  chainId,
  flagEnabled,
  isDismissed,
  now,
}: {
  campaign: TargetedAnnouncementCampaign;
  accountHash: Hash | undefined;
  chainId: number | undefined;
  flagEnabled: boolean;
  isDismissed: boolean;
  now: number;
}): boolean {
  return (
    flagEnabled &&
    !isDismissed &&
    now < campaign.endTimestamp &&
    isCampaignChain(campaign, chainId) &&
    accountHash !== undefined &&
    campaign.addressHashes.has(accountHash)
  );
}
