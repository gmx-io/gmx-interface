import { keccak256, stringToHex } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE } from "sdk/configs/chains";

import {
  TargetedAnnouncementCampaign,
  getTargetedAnnouncementAddressHash,
  shouldShowTargetedAnnouncement,
} from "./targetedAnnouncementLogic";

const listedHash = getTargetedAnnouncementAddressHash("0x00000000000000000000000000000000000000ab")!;

const campaign: TargetedAnnouncementCampaign = {
  flag: "showTestAnnouncement",
  endTimestamp: Date.UTC(2026, 11, 1),
  dismissedKey: "test-announcement-dismissed",
  addressHashes: new Set([listedHash]),
};

const visibleParams = {
  campaign,
  accountHash: listedHash,
  chainId: ARBITRUM,
  flagEnabled: true,
  isDismissed: false,
  now: campaign.endTimestamp - 1,
};

describe("getTargetedAnnouncementAddressHash", () => {
  it("normalizes address casing before hashing", () => {
    expect(getTargetedAnnouncementAddressHash("0x00000000000000000000000000000000000000AB")).toBe(listedHash);
  });

  it("returns undefined for an invalid address", () => {
    expect(getTargetedAnnouncementAddressHash("not-an-address")).toBeUndefined();
  });
});

describe("shouldShowTargetedAnnouncement", () => {
  it("shows for a listed, non-dismissed wallet while the flag and campaign are active", () => {
    expect(shouldShowTargetedAnnouncement(visibleParams)).toBe(true);
  });

  it("shows on any chain when the campaign has no chain restriction", () => {
    expect(shouldShowTargetedAnnouncement({ ...visibleParams, chainId: AVALANCHE })).toBe(true);
    expect(shouldShowTargetedAnnouncement({ ...visibleParams, chainId: undefined })).toBe(true);
  });

  it("limits a chain-bound campaign to its chains", () => {
    const arbitrumCampaign = { ...campaign, chainIds: [ARBITRUM] };

    expect(shouldShowTargetedAnnouncement({ ...visibleParams, campaign: arbitrumCampaign })).toBe(true);
    expect(shouldShowTargetedAnnouncement({ ...visibleParams, campaign: arbitrumCampaign, chainId: AVALANCHE })).toBe(
      false
    );
    expect(shouldShowTargetedAnnouncement({ ...visibleParams, campaign: arbitrumCampaign, chainId: undefined })).toBe(
      false
    );
  });

  it.each([
    { accountHash: undefined },
    { accountHash: keccak256(stringToHex("not-listed")) },
    { flagEnabled: false },
    { isDismissed: true },
    { now: campaign.endTimestamp },
  ])("hides when a visibility requirement is not met: %o", (override) => {
    expect(shouldShowTargetedAnnouncement({ ...visibleParams, ...override })).toBe(false);
  });
});
