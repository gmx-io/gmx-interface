import { keccak256, stringToHex } from "viem";
import { describe, expect, it } from "vitest";

import {
  BALANCER_PROGRAM_ANNOUNCEMENT_END_TIMESTAMP,
  BALANCER_PROGRAM_PROSPECT_ADDRESS_HASHES,
  getBalancerProgramAddressHash,
  shouldShowBalancerProgramAnnouncement,
} from "./balancerProgramAnnouncementLogic";

describe("getBalancerProgramAddressHash", () => {
  it("normalizes address casing before hashing", () => {
    const lowercaseAddress = "0x00000000000000000000000000000000000000ab";
    const uppercaseAddress = "0x00000000000000000000000000000000000000AB";

    expect(getBalancerProgramAddressHash(lowercaseAddress)).toBe(getBalancerProgramAddressHash(uppercaseAddress));
  });

  it("returns undefined for an invalid address", () => {
    expect(getBalancerProgramAddressHash("not-an-address")).toBeUndefined();
  });
});

describe("shouldShowBalancerProgramAnnouncement", () => {
  const prospectHash = BALANCER_PROGRAM_PROSPECT_ADDRESS_HASHES.values().next().value!;
  const activeTime = BALANCER_PROGRAM_ANNOUNCEMENT_END_TIMESTAMP - 1;

  it("configures all nine prospect hashes", () => {
    expect(BALANCER_PROGRAM_PROSPECT_ADDRESS_HASHES.size).toBe(9);
  });

  it("shows for an eligible, non-dismissed wallet while the flag and campaign are active", () => {
    expect(
      shouldShowBalancerProgramAnnouncement({
        accountHash: prospectHash,
        flagEnabled: true,
        isDismissed: false,
        now: activeTime,
      })
    ).toBe(true);
  });

  it.each([
    { accountHash: undefined, flagEnabled: true, isDismissed: false, now: activeTime },
    {
      accountHash: keccak256(stringToHex("not-a-prospect")),
      flagEnabled: true,
      isDismissed: false,
      now: activeTime,
    },
    { accountHash: prospectHash, flagEnabled: false, isDismissed: false, now: activeTime },
    { accountHash: prospectHash, flagEnabled: true, isDismissed: true, now: activeTime },
    {
      accountHash: prospectHash,
      flagEnabled: true,
      isDismissed: false,
      now: BALANCER_PROGRAM_ANNOUNCEMENT_END_TIMESTAMP,
    },
  ])("hides when any visibility requirement is not met", (params) => {
    expect(shouldShowBalancerProgramAnnouncement(params)).toBe(false);
  });
});
