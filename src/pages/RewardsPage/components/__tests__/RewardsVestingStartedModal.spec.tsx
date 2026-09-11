import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  sendRewardsVestingStartedDialogActionEvent,
  sendRewardsVestingStartedDialogShownEvent,
} from "lib/userAnalytics/rewardsEvents";

import { RewardsVestingStartedModal } from "../RewardsVestingStartedModal";

vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsVestingStartedDialogActionEvent: vi.fn(),
  sendRewardsVestingStartedDialogShownEvent: vi.fn(),
}));

vi.mock("components/Modal/ModalWithPortal", () => ({
  default: ({
    isVisible,
    label,
    children,
  }: {
    isVisible?: boolean;
    label?: React.ReactNode;
    children: React.ReactNode;
  }) =>
    isVisible ? (
      <div role="dialog" aria-label={String(label)}>
        {children}
      </div>
    ) : null,
}));

const mockSendShownEvent = vi.mocked(sendRewardsVestingStartedDialogShownEvent);
const mockSendActionEvent = vi.mocked(sendRewardsVestingStartedDialogActionEvent);

i18n.load({ en: {} });
i18n.activate("en");

function renderModal({ isVisible = true, onClose = vi.fn() }: { isVisible?: boolean; onClose?: () => void } = {}) {
  const result = render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsVestingStartedModal isVisible={isVisible} onClose={onClose} />
      </MemoryRouter>
    </I18nProvider>
  );

  return { ...result, onClose };
}

describe("RewardsVestingStartedModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("invites the trader to refer others when vesting starts", () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "Your esGMX is now vesting!" })).toBeDefined();
    expect(
      screen.getByText(
        "Did you know you can earn more rewards by inviting other traders? Receive 50% of the rewards earned by traders you refer."
      )
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Invite traders" }).getAttribute("href")).toBe("/referrals/affiliates");
  });

  it("reports the dialog once it becomes visible", () => {
    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <RewardsVestingStartedModal isVisible={false} onClose={vi.fn()} />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(mockSendShownEvent).not.toHaveBeenCalled();

    rerender(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <RewardsVestingStartedModal isVisible onClose={vi.fn()} />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(mockSendShownEvent).toHaveBeenCalledTimes(1);
  });

  it("closes and reports the action when the invite is followed", () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole("link", { name: "Invite traders" }));

    expect(mockSendActionEvent).toHaveBeenCalledWith("InviteTraders");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes and reports the action when skipped", () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(mockSendActionEvent).toHaveBeenCalledWith("Skip");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
