import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { encodeReferralCode } from "sdk/utils/referrals";

import { useAffiliateCodes } from "../index";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("lib/indexers", () => ({
  getReferralsGraphClient: () => ({ query: mocks.query }),
}));

type HookResult = ReturnType<typeof useAffiliateCodes>;

function Harness({ enabled, onResult }: { enabled: boolean; onResult: (result: HookResult) => void }) {
  onResult(useAffiliateCodes(ARBITRUM, "0x123", enabled));
  return null;
}

function setup(enabled = true) {
  let result!: HookResult;
  render(<Harness enabled={enabled} onResult={(nextResult) => (result = nextResult)} />);
  return () => result;
}

describe("useAffiliateCodes", () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  afterEach(cleanup);

  it("does not query while sharing is closed", () => {
    const getResult = setup(false);

    expect(mocks.query).not.toHaveBeenCalled();
    expect(getResult()).toEqual({ code: null, success: false });
  });

  it("selects the highest-volume code the user still owns", async () => {
    const transferredCode = encodeReferralCode("sonicash");
    const ownedCode = encodeReferralCode("test_12");
    mocks.query.mockResolvedValue({
      data: {
        affiliateStats: [{ referralCode: transferredCode }, { referralCode: ownedCode }],
        referralCodes: [{ code: ownedCode }],
      },
    });

    const getResult = setup();

    await waitFor(() => expect(getResult()).toEqual({ code: "test_12", success: true }));
  });

  it("returns an owned code that has no historical volume", async () => {
    const ownedCode = encodeReferralCode("new_code");
    mocks.query.mockResolvedValue({
      data: {
        affiliateStats: [],
        referralCodes: [{ code: ownedCode }],
      },
    });

    const getResult = setup();

    await waitFor(() => expect(getResult()).toEqual({ code: "new_code", success: true }));
  });

  it("confirms that the user owns no code even when historical stats exist", async () => {
    mocks.query.mockResolvedValue({
      data: {
        affiliateStats: [{ referralCode: encodeReferralCode("old_code") }],
        referralCodes: [],
      },
    });

    const getResult = setup();

    await waitFor(() => expect(getResult()).toEqual({ code: null, success: true }));
  });
});
