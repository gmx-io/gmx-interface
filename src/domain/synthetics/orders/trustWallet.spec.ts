import { describe, expect, it } from "vitest";

import { getShouldShowTrustWalletSidePanelWarning } from "./trustWallet";

describe("getShouldShowTrustWalletSidePanelWarning", () => {
  it.each([
    {
      name: "shows for a rejected Trust Wallet Express signature",
      isExpress: true,
      isTrustWallet: true,
      isUserRejectedError: true,
      expected: true,
    },
    {
      name: "does not show for a Classic transaction",
      isExpress: false,
      isTrustWallet: true,
      isUserRejectedError: true,
      expected: false,
    },
    {
      name: "does not show for another wallet",
      isExpress: true,
      isTrustWallet: false,
      isUserRejectedError: true,
      expected: false,
    },
    {
      name: "does not show for another error",
      isExpress: true,
      isTrustWallet: true,
      isUserRejectedError: false,
      expected: false,
    },
  ])("$name", ({ isExpress, isTrustWallet, isUserRejectedError, expected }) => {
    expect(
      getShouldShowTrustWalletSidePanelWarning({
        isExpress,
        isTrustWallet,
        isUserRejectedError,
      })
    ).toBe(expected);
  });
});
