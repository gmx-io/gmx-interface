import { describe, expect, it } from "vitest";

import { getShouldShowTrustWalletSidePanelWarning } from "./trustWallet";

describe("getShouldShowTrustWalletSidePanelWarning", () => {
  it.each([
    {
      name: "shows for a rejected Trust Wallet request",
      isTrustWallet: true,
      isUserRejectedError: true,
      expected: true,
    },
    {
      name: "does not show for another wallet",
      isTrustWallet: false,
      isUserRejectedError: true,
      expected: false,
    },
    {
      name: "does not show for another error",
      isTrustWallet: true,
      isUserRejectedError: false,
      expected: false,
    },
  ])("$name", ({ isTrustWallet, isUserRejectedError, expected }) => {
    expect(
      getShouldShowTrustWalletSidePanelWarning({
        isTrustWallet,
        isUserRejectedError,
      })
    ).toBe(expected);
  });
});
