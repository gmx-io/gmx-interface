import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

vi.mock("domain/synthetics/uiFlags/useUiFlagEvents", () => ({
  useUiFlagEvents: () => [
    {
      data: {
        id: "generic",
        flagName: "generic",
        title: "Generic flag announcement",
        content: "Generic content",
        variant: "info",
      },
      dismiss: vi.fn(),
    },
    {
      data: {
        id: "warning",
        flagName: "warning",
        title: "Warning flag announcement",
        content: "Warning content",
        variant: "error",
      },
      dismiss: vi.fn(),
    },
  ],
}));

vi.mock("components/AnnouncementBanner/AnnouncementBanner", () => ({
  AnnouncementBanner: ({ headerLabel }: { headerLabel: string }) => (
    <div data-stack-item={headerLabel}>{headerLabel}</div>
  ),
}));

vi.mock("components/BalancerProgramAnnouncement/BalancerProgramAnnouncement", () => ({
  BalancerProgramAnnouncement: () => <div data-stack-item="targeted">Targeted</div>,
}));

vi.mock("components/BalancerProgramAnnouncement/useBalancerProgramAnnouncement", () => ({
  useBalancerProgramAnnouncement: () => ({ isVisible: true, dismiss: vi.fn() }),
}));

vi.mock("components/DelistingExitAnnouncements/DelistingBanner", () => ({
  DelistingBanner: () => <div data-stack-item="delisting">Delisting</div>,
}));

vi.mock("components/DelistingExitAnnouncements/useDelistingExitAnnouncements", () => ({
  useDelistingExitAnnouncements: () => ({ announcements: [{ id: "delisting" }], dismiss: vi.fn() }),
}));

vi.mock("./useWhatsNewAnnouncements", () => ({
  useWhatsNewAnnouncements: () => ({ cards: [{ id: "generic-card" }], dismiss: vi.fn() }),
}));

vi.mock("./WhatsNewToast", () => ({
  WhatsNewToast: () => <div data-stack-item="whats-new">What's new</div>,
}));

import { WhatsNewToastContainer } from "./WhatsNewToastContainer";

describe("WhatsNewToastContainer", () => {
  it("keeps warnings above the targeted campaign and generic announcements below it", () => {
    const { container } = render(
      <MemoryRouter>
        <WhatsNewToastContainer />
      </MemoryRouter>
    );

    const stackOrder = Array.from(container.querySelectorAll("[data-stack-item]")).map((item) =>
      item.getAttribute("data-stack-item")
    );

    expect(stackOrder).toEqual([
      "delisting",
      "Warning flag announcement",
      "targeted",
      "Generic flag announcement",
      "whats-new",
    ]);
  });
});
