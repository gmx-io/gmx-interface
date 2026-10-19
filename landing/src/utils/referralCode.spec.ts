import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PENDING_REFERRAL_CODE_KEY } from "config/localStorage";

import { captureLandingReferralCode, getLandingReferralCode } from "./referralCode";

const HEX_CODE = "0x3542f3fa9016e9921dfc406f05601f17faecc338c73eb738ebf21a825eb96747";

function openLanding(search: string) {
  window.history.replaceState({}, "", `/${search}`);
}

describe("landing referral code PRO-4493", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("captures and forwards a text code", () => {
    openLanding("?ref=TheGMXBalancer");
    captureLandingReferralCode();

    expect(getLandingReferralCode()).toBe("TheGMXBalancer");
  });

  it("captures and forwards a bytes32 hex code", () => {
    openLanding(`?ref=${HEX_CODE}`);
    captureLandingReferralCode();

    expect(getLandingReferralCode()).toBe(HEX_CODE);

    openLanding(`?ref=0x${HEX_CODE.slice(2).toUpperCase()}`);
    captureLandingReferralCode();

    expect(getLandingReferralCode()).toBe(`0x${HEX_CODE.slice(2).toUpperCase()}`);
  });

  it("replaces a previously saved code with a new hex code", () => {
    window.localStorage.setItem(PENDING_REFERRAL_CODE_KEY, "OLD_CODE");

    openLanding(`?ref=${HEX_CODE}`);
    captureLandingReferralCode();

    expect(getLandingReferralCode()).toBe(HEX_CODE);
  });

  it("ignores an invalid code and keeps the saved one", () => {
    window.localStorage.setItem(PENDING_REFERRAL_CODE_KEY, "OLD_CODE");

    openLanding(`?ref=${"A".repeat(21)}`);
    captureLandingReferralCode();
    openLanding(`?ref=${HEX_CODE}00`);
    captureLandingReferralCode();

    expect(getLandingReferralCode()).toBe("OLD_CODE");
  });

  it("doesn't forward an invalid stored code", () => {
    window.localStorage.setItem(PENDING_REFERRAL_CODE_KEY, "A".repeat(21));

    expect(getLandingReferralCode()).toBeNull();
  });
});
