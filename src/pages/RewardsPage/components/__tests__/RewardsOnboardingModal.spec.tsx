import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REWARDS_ONBOARDING_DISMISSED_KEY } from "config/localStorage";

import { getRewardsOnboardingPath } from "../../rewardsRoutes";
import { RewardsOnboardingModal } from "../RewardsOnboardingModal";

vi.mock("components/Modal/ModalWithPortal", () => ({
  default: ({
    isVisible,
    label,
    headerContent,
    hideCloseButton,
    children,
    setIsVisible,
  }: {
    isVisible?: boolean;
    label?: React.ReactNode;
    headerContent?: React.ReactNode;
    hideCloseButton?: boolean;
    children: React.ReactNode;
    setIsVisible: (isVisible: boolean) => void;
  }) =>
    isVisible ? (
      <div role="dialog" aria-label={String(label)}>
        {headerContent}
        {!hideCloseButton ? (
          <button type="button" aria-label="Close dialog" onClick={() => setIsVisible(false)} />
        ) : null}
        {children}
      </div>
    ) : null,
}));

i18n.load({ en: {} });
i18n.activate("en");

function LocationProbe() {
  const { pathname, search } = useLocation();

  return <div data-testid="location">{`${pathname}${search}`}</div>;
}

function getRouterEntries(entry: string) {
  return [entry];
}

const DISMISSED_STORAGE_KEY = JSON.stringify(REWARDS_ONBOARDING_DISMISSED_KEY);

describe("RewardsOnboardingModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(cleanup);

  it.each([
    { shouldAutoOpen: true, dismissed: false, entry: "/rewards", isOpen: true, location: "/rewards" },
    { shouldAutoOpen: false, dismissed: false, entry: "/rewards", isOpen: false, location: "/rewards" },
    { shouldAutoOpen: true, dismissed: true, entry: "/rewards", isOpen: false, location: "/rewards" },
    {
      shouldAutoOpen: false,
      dismissed: true,
      entry: `${getRewardsOnboardingPath()}&rewardsDebug=banners`,
      isOpen: true,
      location: "/rewards?rewardsDebug=banners",
    },
  ])(
    "autoOpen=$shouldAutoOpen dismissed=$dismissed entry=$entry -> open=$isOpen",
    async ({ shouldAutoOpen, dismissed, entry, isOpen, location }) => {
      if (dismissed) localStorage.setItem(DISMISSED_STORAGE_KEY, "true");

      render(
        <I18nProvider i18n={i18n}>
          <MemoryRouter initialEntries={getRouterEntries(entry)}>
            <RewardsOnboardingModal shouldAutoOpen={shouldAutoOpen} />
            <LocationProbe />
          </MemoryRouter>
        </I18nProvider>
      );

      await waitFor(() => expect(screen.getByTestId("location").textContent).toBe(location));
      if (!isOpen) {
        expect(screen.queryByRole("dialog")).toBeNull();
        return;
      }

      expect(await screen.findByRole("dialog", { name: "How it works" })).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Skip" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(localStorage.getItem(DISMISSED_STORAGE_KEY)).toBe("true");
    }
  );
});
