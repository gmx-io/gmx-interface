import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REWARDS_ONBOARDING_DISMISSED_KEY } from "config/localStorage";

import { RewardsOnboardingModal } from "../RewardsOnboardingModal";

vi.mock("components/Modal/ModalWithPortal", () => ({
  default: ({
    isVisible,
    label,
    headerContent,
    children,
    setIsVisible,
  }: {
    isVisible?: boolean;
    label?: React.ReactNode;
    headerContent?: React.ReactNode;
    children: React.ReactNode;
    setIsVisible: (isVisible: boolean) => void;
  }) =>
    isVisible ? (
      <div role="dialog" aria-label={String(label)}>
        {headerContent}
        <button type="button" aria-label="Close dialog" onClick={() => setIsVisible(false)} />
        {children}
      </div>
    ) : null,
}));

i18n.load({ en: {} });
i18n.activate("en");

function renderOnboarding(shouldAutoOpen = true) {
  return render(
    <I18nProvider i18n={i18n}>
      <RewardsOnboardingModal shouldAutoOpen={shouldAutoOpen} />
    </I18nProvider>
  );
}

describe("RewardsOnboardingModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(cleanup);

  it("opens once automatically, supports all navigation methods, and can be reopened from the launcher", async () => {
    renderOnboarding();

    expect(await screen.findByRole("dialog", { name: "How it works" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Welcome to GMX Rewards" })).toBeDefined();

    const dots = screen.getAllByRole("button", { name: /Go to slide/ });
    expect(dots).toHaveLength(4);
    expect(dots[0].getAttribute("aria-current")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(
      screen.getByRole("heading", { name: "Your multiplier is at the core of the rewards program" })
    ).toBeDefined();

    fireEvent.keyDown(screen.getByRole("region", { name: "How GMX Rewards works" }), {
      key: "ArrowRight",
    });
    expect(
      screen.getByRole("heading", { name: "The higher the multiplier, the more rewards you receive" })
    ).toBeDefined();

    fireEvent.click(dots[3]);
    expect(screen.getByRole("heading", { name: "How rewards are distributed" })).toBeDefined();
    expect(dots[3].getAttribute("aria-current")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Get started" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(JSON.parse(localStorage.getItem(JSON.stringify(REWARDS_ONBOARDING_DISMISSED_KEY)) ?? "false")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "How it works?" }));
    expect(await screen.findByRole("heading", { name: "Welcome to GMX Rewards" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("waits for an active program before auto-opening and respects prior dismissal", async () => {
    const view = renderOnboarding(false);

    expect(screen.queryByRole("dialog")).toBeNull();
    view.rerender(
      <I18nProvider i18n={i18n}>
        <RewardsOnboardingModal shouldAutoOpen />
      </I18nProvider>
    );
    expect(await screen.findByRole("dialog", { name: "How it works" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    cleanup();
    renderOnboarding();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("navigates in both directions with touch swipes", async () => {
    renderOnboarding();
    await screen.findByRole("dialog", { name: "How it works" });

    const slide = screen.getByTestId("rewards-onboarding-slide");
    fireEvent.pointerDown(slide, { pointerType: "touch", pointerId: 1, clientX: 200, clientY: 20 });
    fireEvent.pointerUp(slide, { pointerType: "touch", pointerId: 1, clientX: 120, clientY: 24 });
    expect(
      screen.getByRole("heading", { name: "Your multiplier is at the core of the rewards program" })
    ).toBeDefined();

    fireEvent.pointerDown(slide, { pointerType: "touch", pointerId: 2, clientX: 120, clientY: 20 });
    fireEvent.pointerUp(slide, { pointerType: "touch", pointerId: 2, clientX: 200, clientY: 24 });
    expect(screen.getByRole("heading", { name: "Welcome to GMX Rewards" })).toBeDefined();
  });
});
