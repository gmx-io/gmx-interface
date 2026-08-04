import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { OneClickTokenApprovalPreview } from "./OneClickTokenApprovalPreview";

const approvalState = vi.hoisted(() => ({
  current: {
    canBatch: true,
    isApproving: false,
    pendingTokens: [
      { address: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa", symbol: "USDC" },
      { address: "0xBbbBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbbBBbB", symbol: "WETH" },
    ],
  },
}));

vi.mock("context/SubaccountContext/SubaccountContextProvider", () => ({
  useSubaccountContext: () => ({ oneClickTokenApproval: approvalState.current }),
}));

vi.mock("components/TokenIcon/TokenIcon", () => ({
  default: ({ symbol }: { symbol: string }) => <span data-token-symbol={symbol} />,
}));

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(() => {
  cleanup();
  approvalState.current = {
    canBatch: true,
    isApproving: false,
    pendingTokens: [
      { address: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa", symbol: "USDC" },
      { address: "0xBbbBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbbBBbB", symbol: "WETH" },
    ],
  };
});

describe("OneClickTokenApprovalPreview", () => {
  it("lists each pending token as an unlimited optional approval", () => {
    const view = render(
      <I18nProvider i18n={i18n}>
        <OneClickTokenApprovalPreview />
      </I18nProvider>
    );

    expect(view.getByText("Optional token approvals")).toBeTruthy();
    expect(view.getByText("USDC")).toBeTruthy();
    expect(view.getByText("WETH")).toBeTruthy();
    expect(view.getAllByText("Unlimited")).toHaveLength(2);
    expect(view.getByText("Skipping this request won't interrupt One-Click setup.")).toBeTruthy();
  });

  it("stays hidden when atomic batching is unavailable", () => {
    approvalState.current.canBatch = false;

    const view = render(
      <I18nProvider i18n={i18n}>
        <OneClickTokenApprovalPreview />
      </I18nProvider>
    );

    expect(view.container.querySelector('[data-qa="one-click-token-approval-preview"]')).toBeNull();
  });
});
