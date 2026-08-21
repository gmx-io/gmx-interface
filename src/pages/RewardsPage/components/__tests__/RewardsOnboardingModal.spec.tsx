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

function getOnboarding(shouldAutoOpen: boolean, entry: string) {
  return (
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={getRouterEntries(entry)}>
        <RewardsOnboardingModal shouldAutoOpen={shouldAutoOpen} />
        <LocationProbe />
      </MemoryRouter>
    </I18nProvider>
  );
}

function renderOnboarding(shouldAutoOpen = true, entry = "/rewards") {
  return render(getOnboarding(shouldAutoOpen, entry));
}

describe("RewardsOnboardingModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(cleanup);

  it("opens once automatically, supports all navigation methods, and can be reopened from the launcher", async () => {
    renderOnboarding();

    const launcher = screen.getByRole("button", { name: "How it works?" });
    expect(launcher.classList.contains("h-32")).toBe(true);
    expect(launcher.classList.contains("gap-4")).toBe(true);
    expect(launcher.classList.contains("px-12")).toBe(true);
    expect(launcher.classList.contains("py-8")).toBe(true);
    expect(launcher.classList.contains("text-13")).toBe(true);
    expect(launcher.querySelector("svg")?.classList.contains("size-16")).toBe(true);

    expect(await screen.findByRole("dialog", { name: "How it works" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Welcome to GMX Rewards" })).toBeDefined();

    const diagramTrack = screen.getByTestId("rewards-onboarding-diagram-track") as HTMLImageElement;
    const track = screen.getByTestId("rewards-onboarding-track") as HTMLDivElement;
    const panels = screen.getAllByTestId("rewards-onboarding-panel");
    const dots = screen.getAllByRole("button", { name: /Go to slide/ });
    expect(panels).toHaveLength(4);
    expect(panels.map((panel) => panel.getAttribute("aria-hidden"))).toEqual(["false", "true", "true", "true"]);
    expect(diagramTrack.style.transform).toBe("translate3d(0px, 0, 0)");
    expect(diagramTrack.parentElement?.parentElement?.classList.contains("overflow-hidden")).toBe(true);
    expect(diagramTrack.classList.contains("motion-reduce:transition-none")).toBe(true);
    expect(track.style.transform).toBe("translate3d(0%, 0, 0)");
    expect(track.classList.contains("motion-reduce:transition-none")).toBe(true);
    expect(screen.getByText("Slide 1 of 4")).toBeDefined();
    expect(dots).toHaveLength(4);
    expect(dots[0].classList.contains("size-8")).toBe(true);
    expect(dots[0].classList.contains("after:-inset-4")).toBe(true);
    expect(dots[0].parentElement?.classList.contains("mb-32")).toBe(true);
    expect(dots[0].parentElement?.classList.contains("gap-8")).toBe(true);
    expect(dots[0].getAttribute("aria-current")).toBe("true");

    const skipButton = screen.getByRole("button", { name: "Skip" });
    expect(skipButton.querySelector("svg")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Close dialog" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(diagramTrack.style.transform).toBe("translate3d(-308px, 0, 0)");
    expect(track.style.transform).toBe("translate3d(-100%, 0, 0)");
    expect(screen.getByText("Slide 2 of 4")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Welcome to GMX Rewards" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Your multiplier is at the core of the rewards program" })
    ).toBeDefined();

    fireEvent.keyDown(screen.getByRole("region", { name: "How GMX Rewards works" }), {
      key: "ArrowRight",
    });
    expect(diagramTrack.style.transform).toBe("translate3d(-605px, 0, 0)");
    expect(track.style.transform).toBe("translate3d(-200%, 0, 0)");
    expect(
      screen.getByRole("heading", { name: "The higher the multiplier, the more rewards you receive" })
    ).toBeDefined();

    fireEvent.click(dots[3]);
    expect(diagramTrack.style.transform).toBe("translate3d(-880px, 0, 0)");
    expect(track.style.transform).toBe("translate3d(-300%, 0, 0)");
    expect(screen.getByRole("heading", { name: "How rewards are distributed" })).toBeDefined();
    expect(dots[3].getAttribute("aria-current")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Get started" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(JSON.parse(localStorage.getItem(JSON.stringify(REWARDS_ONBOARDING_DISMISSED_KEY)) ?? "false")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "How it works?" }));
    expect(await screen.findByRole("heading", { name: "Welcome to GMX Rewards" })).toBeDefined();
    expect(screen.getByTestId("rewards-onboarding-diagram-track").getAttribute("style")).toContain(
      "translate3d(0px, 0, 0)"
    );
    expect(screen.getByTestId("rewards-onboarding-track").getAttribute("style")).toContain("translate3d(0%, 0, 0)");
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("waits for an active program before auto-opening and respects prior dismissal", async () => {
    const view = renderOnboarding(false);

    expect(screen.queryByRole("dialog")).toBeNull();
    view.rerender(getOnboarding(true, "/rewards"));
    expect(await screen.findByRole("dialog", { name: "How it works" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    cleanup();
    renderOnboarding();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens from the rewards deep link even after a prior dismissal and clears the action param", async () => {
    localStorage.setItem(JSON.stringify(REWARDS_ONBOARDING_DISMISSED_KEY), "true");

    renderOnboarding(false, `${getRewardsOnboardingPath()}&rewardsDebug=banners`);

    expect(await screen.findByRole("dialog", { name: "How it works" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Welcome to GMX Rewards" })).toBeDefined();
    expect(screen.getByTestId("location").textContent).toBe("/rewards?rewardsDebug=banners");

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("navigates in both directions with touch swipes", async () => {
    renderOnboarding();
    await screen.findByRole("dialog", { name: "How it works" });

    const slide = screen.getByTestId("rewards-onboarding-slide");
    fireEvent.pointerDown(slide, { pointerType: "touch", pointerId: 1, clientX: 200, clientY: 20 });
    fireEvent.pointerUp(slide, { pointerType: "touch", pointerId: 1, clientX: 120, clientY: 24 });
    expect(screen.getByTestId("rewards-onboarding-diagram-track").getAttribute("style")).toContain(
      "translate3d(-308px, 0, 0)"
    );
    expect(screen.getByTestId("rewards-onboarding-track").getAttribute("style")).toContain("translate3d(-100%, 0, 0)");
    expect(
      screen.getByRole("heading", { name: "Your multiplier is at the core of the rewards program" })
    ).toBeDefined();

    fireEvent.pointerDown(slide, { pointerType: "touch", pointerId: 2, clientX: 200, clientY: 20 });
    fireEvent.pointerUp(slide, { pointerType: "touch", pointerId: 2, clientX: 150, clientY: 100 });
    expect(screen.getByTestId("rewards-onboarding-track").getAttribute("style")).toContain("translate3d(-100%, 0, 0)");

    fireEvent.pointerDown(slide, { pointerType: "touch", pointerId: 3, clientX: 120, clientY: 20 });
    fireEvent.pointerUp(slide, { pointerType: "touch", pointerId: 3, clientX: 200, clientY: 24 });
    expect(screen.getByTestId("rewards-onboarding-diagram-track").getAttribute("style")).toContain(
      "translate3d(0px, 0, 0)"
    );
    expect(screen.getByTestId("rewards-onboarding-track").getAttribute("style")).toContain("translate3d(0%, 0, 0)");
    expect(screen.getByRole("heading", { name: "Welcome to GMX Rewards" })).toBeDefined();
  });
});
