import { describe, expect, it } from "vitest";

import { getShouldAllowPermit } from "./useTokenApproval";

describe("getShouldAllowPermit", () => {
  it("allows permit for a loaded EOA flow", () => {
    expect(
      getShouldAllowPermit({
        allowPermit: true,
        isSmartAccount: false,
        isAccountTypeUnavailable: false,
      })
    ).toBe(true);
  });

  it("routes smart accounts to approve", () => {
    expect(
      getShouldAllowPermit({
        allowPermit: true,
        isSmartAccount: true,
        isAccountTypeUnavailable: false,
      })
    ).toBe(false);
  });

  it("fails closed while the account type is loading", () => {
    expect(
      getShouldAllowPermit({
        allowPermit: true,
        isSmartAccount: false,
        isAccountTypeUnavailable: true,
      })
    ).toBe(false);
  });
});
