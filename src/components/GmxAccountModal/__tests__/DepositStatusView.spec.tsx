import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DepositStatusView } from "../DepositStatusView";

const mocks = vi.hoisted(() => ({
  setIsVisibleOrView: vi.fn(),
  tryEnableSubaccount: vi.fn(),
  pushEvent: vi.fn(),
}));

vi.mock("context/GmxAccountContext/hooks", () => ({
  useGmxAccountModalOpen: () => ["depositStatus", mocks.setIsVisibleOrView] as const,
  useGmxAccountSelectedTransferGuid: () => [undefined, vi.fn()] as const,
}));

vi.mock("context/SubaccountContext/SubaccountContextProvider", () => ({
  useSubaccountContext: () => ({
    tryEnableSubaccount: mocks.tryEnableSubaccount,
  }),
}));

vi.mock("domain/multichain/useGmxAccountFundingHistory", () => ({
  useGmxAccountFundingHistoryItem: () => undefined,
}));

vi.mock("lib/userAnalytics", () => ({
  userAnalytics: {
    pushEvent: mocks.pushEvent,
  },
}));

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

function renderView() {
  const view = render(
    <I18nProvider i18n={i18n}>
      <DepositStatusView />
    </I18nProvider>
  );

  return {
    enableButton: view.getByRole("button", { name: "Enable One-Click Trading" }) as HTMLButtonElement,
    remindLaterButton: view.getByRole("button", { name: "Remind me later" }) as HTMLButtonElement,
  };
}

describe("DepositStatusView one-click promotion", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("returns to the transfer history on Remind me later without starting the enable flow or writing storage", () => {
    const { remindLaterButton } = renderView();

    fireEvent.click(remindLaterButton);

    expect(mocks.tryEnableSubaccount).not.toHaveBeenCalled();
    expect(mocks.setIsVisibleOrView).toHaveBeenCalledTimes(1);
    expect(mocks.setIsVisibleOrView).toHaveBeenCalledWith("transferHistory");
    expect(localStorage.length).toBe(0);
    expect(mocks.pushEvent).toHaveBeenCalledWith({
      event: "OneClickPromotion",
      data: { action: "UserRejected" },
    });
  });

  it("stays on the promotion when enabling is rejected: no navigation, the button is clickable again", async () => {
    let resolveEnable!: (isActivated: boolean) => void;
    mocks.tryEnableSubaccount.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveEnable = resolve;
        })
    );

    const { enableButton } = renderView();

    fireEvent.click(enableButton);

    expect(mocks.tryEnableSubaccount).toHaveBeenCalledTimes(1);
    expect(enableButton.disabled).toBe(true);

    resolveEnable(false);

    await waitFor(() => expect(enableButton.disabled).toBe(false));

    expect(mocks.setIsVisibleOrView).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(mocks.pushEvent).not.toHaveBeenCalledWith({
      event: "OneClickPromotion",
      data: { action: "EnableOneClickSuccess" },
    });

    fireEvent.click(enableButton);
    expect(mocks.tryEnableSubaccount).toHaveBeenCalledTimes(2);
  });

  it("moves to the transfer history when enabling succeeds", async () => {
    mocks.tryEnableSubaccount.mockResolvedValue(true);

    const { enableButton } = renderView();

    fireEvent.click(enableButton);

    await waitFor(() => expect(mocks.setIsVisibleOrView).toHaveBeenCalledWith("transferHistory"));
    expect(mocks.tryEnableSubaccount).toHaveBeenCalledTimes(1);
    expect(mocks.pushEvent).toHaveBeenCalledWith({
      event: "OneClickPromotion",
      data: { action: "EnableOneClickSuccess" },
    });
  });
});
