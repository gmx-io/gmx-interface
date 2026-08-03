import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { BalancerProgramAnnouncement } from "./BalancerProgramAnnouncement";

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(cleanup);

describe("BalancerProgramAnnouncement", () => {
  it("renders the complete campaign copy and only the two official links", () => {
    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <BalancerProgramAnnouncement onDismiss={vi.fn()} />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByText("You're eligible for Balancer Program rewards").classList.contains("truncate")).toBe(false);
    expect(screen.getByText(/Your trading on this account already qualifies/)).toBeTruthy();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(screen.getByRole("link", { name: "@GMXPartners" }).getAttribute("href")).toBe("https://t.me/GMXPartners");
    expect(screen.getByRole("link", { name: "See program announcement" }).getAttribute("href")).toBe(
      "https://x.com/GMX_IO/status/2079201995190338026"
    );
  });

  it("dismisses from the close button", () => {
    const onDismiss = vi.fn();
    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <BalancerProgramAnnouncement onDismiss={onDismiss} />
        </MemoryRouter>
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
