import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, expect, it, vi } from "vitest";

import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import type { UiFlagEventData } from "config/uiFlagEvents";

import { WhatsNewToastContainer } from "./WhatsNewToastContainer";

const solanaBanner: UiFlagEventData = {
  id: "solana-service-disruption",
  flagName: "showSolanaServiceDisruptionBanner",
  title: "Solana service disruption",
  content: "Trading on Solana may be temporarily unavailable.",
  variant: "error",
  network: "solana",
};

vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: ARBITRUM, networkId: SOLANA_NETWORK_ID }) }));
vi.mock("domain/synthetics/uiFlags/useUiFlagEvents", () => ({
  useUiFlagEvents: () => [{ data: solanaBanner, dismiss: () => undefined }],
}));
vi.mock("components/AppUpdateBanner/useAppUpdateBanner", () => ({
  useAppUpdateBanner: () => ({ isVisible: false, dismiss: () => undefined, applyUpdate: () => undefined }),
}));
vi.mock("components/WalletExtensionConnectionBanner/useWalletExtensionConnectionBanner", () => ({
  useWalletExtensionConnectionBanner: () => ({ isVisible: false, dismiss: () => undefined }),
}));

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(cleanup);

it("renders UI flag banners on Solana, where the EVM announcements are not mounted", () => {
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <WhatsNewToastContainer />
      </MemoryRouter>
    </I18nProvider>
  );

  expect(screen.getByText("Solana service disruption")).toBeTruthy();
});
