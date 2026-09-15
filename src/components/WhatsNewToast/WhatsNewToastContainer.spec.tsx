import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "sdk/configs/chains";

import { USDG_POOLS_ANNOUNCEMENT_CAMPAIGN } from "components/UsdgPoolsAnnouncement/usdgPoolsAnnouncementCampaign";

const USDG_WALLET = "usdg-wallet";
const USDG_BANNER_TITLE = "Early access: new USDG LP pools with 8% boost APR at launch";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: USDG_WALLET, chainId: ARBITRUM }),
}));

vi.mock("domain/synthetics/uiFlags/useUiFlagsRequest", () => ({
  useUiFlagsRequest: () => ({
    uiFlags: {
      [USDG_POOLS_ANNOUNCEMENT_CAMPAIGN.flag]: {
        enabled: true,
        createdAt: "2026-09-15T00:00:00.000Z",
        updatedAt: "2026-09-15T00:00:00.000Z",
      },
    },
  }),
}));

vi.mock("components/TargetedAnnouncement/targetedAnnouncementLogic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("components/TargetedAnnouncement/targetedAnnouncementLogic")>();
  const [usdgHash] = USDG_POOLS_ANNOUNCEMENT_CAMPAIGN.addressHashes;

  return {
    ...actual,
    getTargetedAnnouncementAddressHash: (account: string | undefined) =>
      account === USDG_WALLET ? usdgHash : undefined,
  };
});

vi.mock("domain/synthetics/uiFlags/useUiFlagEvents", () => ({ useUiFlagEvents: () => [] }));
vi.mock("components/AppUpdateBanner/useAppUpdateBanner", () => ({
  useAppUpdateBanner: () => ({ isVisible: false, dismiss: vi.fn(), applyUpdate: vi.fn() }),
}));
vi.mock("components/DelistingExitAnnouncements/useDelistingExitAnnouncements", () => ({
  useDelistingExitAnnouncements: () => ({ announcements: [], dismiss: vi.fn() }),
}));
vi.mock("components/WalletExtensionConnectionBanner/useWalletExtensionConnectionBanner", () => ({
  useWalletExtensionConnectionBanner: () => ({ isVisible: false, dismiss: vi.fn() }),
}));
vi.mock("./useWhatsNewAnnouncements", () => ({
  useWhatsNewAnnouncements: () => ({ cards: [], dismiss: vi.fn() }),
}));

import { WhatsNewToastContainer } from "./WhatsNewToastContainer";

const TRADE_ENTRIES = ["/trade"];
const ANNOUNCEMENTS_ENTRIES = ["/announcements"];

function renderAt(initialEntries: string[]) {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={initialEntries}>
        <WhatsNewToastContainer />
      </MemoryRouter>
    </I18nProvider>
  );
}

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("WhatsNewToastContainer USDG pools announcement", () => {
  it("renders for an eligible wallet on a regular page", () => {
    renderAt(TRADE_ENTRIES);

    expect(screen.queryByText(USDG_BANNER_TITLE)).not.toBeNull();
  });

  it("stays hidden on /announcements", () => {
    renderAt(ANNOUNCEMENTS_ENTRIES);

    expect(screen.queryByText(USDG_BANNER_TITLE)).toBeNull();
  });
});
