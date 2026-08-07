import { cleanup, render, waitFor } from "@testing-library/react";
import { print } from "graphql";
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

function Harness({
  account,
  enabled,
  onResult,
}: {
  account: string;
  enabled: boolean;
  onResult: (result: HookResult) => void;
}) {
  onResult(useAffiliateCodes(ARBITRUM, account, enabled));
  return null;
}

function setup(enabled = true, account = "0x123") {
  let result!: HookResult;
  render(<Harness account={account} enabled={enabled} onResult={(nextResult) => (result = nextResult)} />);
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

  it("queries owned codes case-insensitively without changing the account casing", async () => {
    const account = "0x1640e916e10610Ba39aAC5Cd8a08acF3cCae1A4c";
    const ownedCode = encodeReferralCode("H4X");
    mocks.query.mockResolvedValue({
      data: {
        affiliateStats: [{ referralCode: ownedCode }],
        referralCodes: [{ code: ownedCode }],
      },
    });

    const getResult = setup(true, account);

    await waitFor(() => expect(getResult()).toEqual({ code: "H4X", success: true }));

    const queryOptions = mocks.query.mock.calls[0][0];
    const queryText = print(queryOptions.query);
    expect(queryText).toContain("affiliate_contains_nocase: $account");
    expect(queryText).toContain("owner_contains_nocase: $account");
    expect(queryOptions.variables).toEqual({ account });
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
