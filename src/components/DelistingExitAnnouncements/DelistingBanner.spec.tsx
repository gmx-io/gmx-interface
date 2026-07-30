import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { DelistingBanner } from "./DelistingBanner";
import type { DelistingToast } from "./delistingExitAnnouncementsLogic";

const ITEM: DelistingToast = {
  id: "delisting-final-notice-liquidity",
  title: "Final notice: market delistings",
  bodyText:
    "USDC-DAI will be disabled after August 5, 2026, 23:59 UTC. Withdraw your liquidity before then. GM tokens left in a disabled pool won't be accessible after that.",
  markets: ["0x1"],
  link: { text: "Withdraw liquidity", href: "/pools" },
};

const onDismiss = vi.fn();

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

describe("DelistingBanner", () => {
  it("renders the full final notice with error styling", () => {
    const { container } = render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <DelistingBanner item={ITEM} onDismiss={onDismiss} />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(container.querySelector('[data-qa="announcement-banner"]')?.classList.contains("bg-red-900/90")).toBe(true);
    expect(screen.getByText(ITEM.title).classList.contains("truncate")).toBe(false);
    expect(screen.getByText(ITEM.bodyText)).toBeTruthy();
    const actionLink = screen.getByRole("link", { name: "Withdraw liquidity" });
    expect(actionLink.getAttribute("href")).toBe("/pools");
    expect(actionLink.classList.contains("font-medium")).toBe(true);
    expect(screen.getByRole("link", { name: "Read more" }).getAttribute("href")).toBe(
      "/announcements?id=personal-delisting-final-notice"
    );
  });
});
