import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAccount } from "wagmi";

import { ARBITRUM } from "config/chains";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import type { IncentivesAvailability } from "domain/synthetics/incentives/v2/availability";
import type { AccountIncentiveStatus, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { useChainId } from "lib/chains";
import { PRECISION } from "lib/numbers";

import { RewardsSection } from "../RewardsSection";

vi.mock("wagmi", () => ({ useAccount: vi.fn() }));
vi.mock("lib/chains", () => ({ useChainId: vi.fn() }));
vi.mock("context/GmxAccountContext/hooks", () => ({ useGmxAccountModalOpen: vi.fn() }));
vi.mock("context/IncentivesV2Context/IncentivesV2Context", () => ({ useIncentivesV2State: vi.fn() }));
vi.mock("domain/synthetics/incentives/v2/useAccountIncentiveStatus", () => ({
  useAccountIncentiveStatus: vi.fn(),
}));
vi.mock("img/ic_chevron_right.svg?react", () => ({ default: () => <svg /> }));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const CONFIG = { epochTimestamp: 1_000, multiplierDecimals: 100n } as IncentivesConfig;
const STATUS = {
  epochTimestamp: CONFIG.epochTimestamp,
  multiplier: 250n,
  rewardsUsd: 75n * PRECISION,
} as AccountIncentiveStatus;
const setOpen = vi.fn();
const mockUseAccount = vi.mocked(useAccount);
const mockUseChainId = vi.mocked(useChainId);
const mockUseGmxAccountModalOpen = vi.mocked(useGmxAccountModalOpen);
const mockUseIncentivesV2State = vi.mocked(useIncentivesV2State);
const mockUseAccountIncentiveStatus = vi.mocked(useAccountIncentiveStatus);

i18n.load({ en: {} });
i18n.activate("en");

function renderSection() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsSection />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("RewardsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccount.mockReturnValue({ address: ACCOUNT } as ReturnType<typeof useAccount>);
    mockUseChainId.mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
    mockUseGmxAccountModalOpen.mockReturnValue([true, setOpen]);
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "active", config: CONFIG, isStale: false },
      isActive: true,
      refreshConfig: vi.fn(),
    });
    mockUseAccountIncentiveStatus.mockReturnValue({ data: STATUS, loading: false } as ReturnType<
      typeof useAccountIncentiveStatus
    >);
  });

  afterEach(cleanup);

  it("links to V2 rewards and renders a config-scaled multiplier without the removed current-epoch summary", () => {
    renderSection();

    const link = screen.getByRole("link", { name: /Rewards/ });
    expect(link.getAttribute("href")).toBe("/rewards");
    expect(link.textContent).toContain("Multiplier");
    expect(link.textContent).toContain("2.5x");
    expect(link.textContent).not.toContain("Provisional");
    expect(link.textContent).not.toContain("Current epoch rewards");
    expect(link.textContent).not.toContain("Persistent multiplier");
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: ACCOUNT,
      enabled: true,
    });

    fireEvent.click(link);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it("keeps the generic rewards link while the multiplier is loading", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({ data: undefined, loading: true } as ReturnType<
      typeof useAccountIncentiveStatus
    >);

    renderSection();

    const link = screen.getByRole("link", { name: /Rewards/ });
    expect(link.textContent).toContain("Rewards");
    expect(link.textContent).toContain("…");
    expect(link.textContent).not.toContain("Current epoch rewards");
  });

  it("does not render or request account data on unsupported chains", () => {
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "unsupported-chain" },
      isActive: false,
      refreshConfig: vi.fn(),
    });

    const { container } = renderSection();

    expect(container.innerHTML).toBe("");
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: ACCOUNT,
      enabled: false,
    });
  });

  it.each<[string, IncentivesAvailability]>([
    ["loading", { status: "loading" }],
    ["inactive", { status: "inactive" }],
    ["unavailable", { status: "error", error: new Error("unavailable") }],
  ])("does not render the current-epoch card while incentives are %s", (_label, availability) => {
    mockUseIncentivesV2State.mockReturnValue({
      availability,
      isActive: false,
      refreshConfig: vi.fn(),
    });

    const { container } = renderSection();

    expect(container.innerHTML).toBe("");
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: ACCOUNT,
      enabled: false,
    });
  });
});
