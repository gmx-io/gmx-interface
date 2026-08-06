import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import type { AffiliateCodesState } from "domain/referrals";

import { useShareReferralCodeState } from "../useShareReferralCodeState";

const mocks = vi.hoisted(() => ({
  affiliateCodes: { code: null, success: false } as AffiliateCodesState,
  usedReferralCode: undefined as string | undefined,
  setStoredValue: vi.fn(),
}));

vi.mock("domain/referrals", () => ({
  useAffiliateCodes: () => mocks.affiliateCodes,
  useUserReferralCode: () => ({ userReferralCodeString: mocks.usedReferralCode }),
}));

vi.mock("lib/localStorage", () => ({
  useLocalStorageSerializeKey: () => [false, mocks.setStoredValue],
}));

vi.mock("lib/userAnalytics", () => ({
  userAnalytics: { pushEvent: vi.fn() },
}));

type HookResult = ReturnType<typeof useShareReferralCodeState>;

function Harness({ onResult }: { onResult: (result: HookResult) => void }) {
  onResult(
    useShareReferralCodeState({
      chainId: ARBITRUM,
      account: "0x123",
      isOpen: true,
      source: "positions-list",
    })
  );
  return null;
}

function setup() {
  let result!: HookResult;
  render(<Harness onResult={(nextResult) => (result = nextResult)} />);
  return () => result;
}

describe("useShareReferralCodeState", () => {
  beforeEach(() => {
    mocks.affiliateCodes = { code: null, success: false };
    mocks.usedReferralCode = undefined;
  });

  afterEach(cleanup);

  it("does not show a used code while owned-code lookup is pending", () => {
    mocks.usedReferralCode = "sonicash";

    const result = setup()();

    expect(result.code).toBeUndefined();
    expect(result.referralCodeOwnerKind).toBeUndefined();
    expect(result.shareAffiliateCode).toEqual({ code: null, success: false });
    expect(result.shouldPromptToCreateReferralCode).toBe(false);
  });

  it("uses the currently owned code instead of the active discount code", () => {
    mocks.affiliateCodes = { code: "test_12", success: true };
    mocks.usedReferralCode = "sonicash";

    const result = setup()();

    expect(result.code).toBe("test_12");
    expect(result.referralCodeOwnerKind).toBe("created");
    expect(result.shareAffiliateCode).toEqual({ code: "test_12", success: true });
  });

  it("uses a regular active code only after confirming there is no owned code", () => {
    mocks.affiliateCodes = { code: null, success: true };
    mocks.usedReferralCode = "sonicash";

    const result = setup()();

    expect(result.code).toBe("sonicash");
    expect(result.referralCodeOwnerKind).toBe("used");
    expect(result.shareAffiliateCode).toEqual({ code: "sonicash", success: true });
  });

  it.each(["EARNED_TRADER_DISCOUNT_5", "EARNED_TRADER_DISCOUNT_10", "DIRECT_GMX_DISCOUNT_5", "DIRECT_GMX_DISCOUNT_10"])(
    "hides protocol-assigned code %s",
    (protocolCode) => {
      mocks.affiliateCodes = { code: null, success: true };
      mocks.usedReferralCode = protocolCode;

      const result = setup()();

      expect(result.code).toBeUndefined();
      expect(result.referralCodeOwnerKind).toBeUndefined();
      expect(result.shareAffiliateCode).toEqual({ code: null, success: true });
    }
  );
});
