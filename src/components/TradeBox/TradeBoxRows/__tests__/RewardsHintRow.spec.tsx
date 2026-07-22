import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAccount } from "wagmi";

import { ARBITRUM } from "config/chains";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import type { AccountIncentiveStatus, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { useChainId } from "lib/chains";

import { RewardsHintRow } from "../RewardsHintRow";

vi.mock("context/IncentivesV2Context/IncentivesV2Context", () => ({
  useIncentivesV2State: vi.fn(),
}));
vi.mock("domain/synthetics/incentives/v2/useAccountIncentiveStatus", () => ({
  useAccountIncentiveStatus: vi.fn(),
}));
vi.mock("lib/chains", () => ({ useChainId: vi.fn() }));
vi.mock("wagmi", () => ({ useAccount: vi.fn() }));
vi.mock("img/ic_multiplier_solid.svg?react", () => ({ default: () => <svg /> }));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const mockUseIncentivesV2State = vi.mocked(useIncentivesV2State);
const mockUseAccountIncentiveStatus = vi.mocked(useAccountIncentiveStatus);
const mockUseAccount = vi.mocked(useAccount);
const mockUseChainId = vi.mocked(useChainId);
const CONFIG = { epochTimestamp: 1, epochDuration: 1, multiplierDecimals: 100n } as IncentivesConfig;
const ZERO_STATUS = { epochTimestamp: CONFIG.epochTimestamp, multiplier: 0n } as AccountIncentiveStatus;

i18n.load({ en: {} });
i18n.activate("en");

function renderRow(feesType: "increase" | "decrease" | "swap") {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsHintRow feesType={feesType} />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("RewardsHintRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccount.mockReturnValue({ address: ACCOUNT } as ReturnType<typeof useAccount>);
    mockUseChainId.mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "active", config: CONFIG, isStale: false },
      isActive: true,
      refreshConfig: vi.fn(),
    });
    mockUseAccountIncentiveStatus.mockReturnValue({ data: ZERO_STATUS, loading: false } as ReturnType<
      typeof useAccountIncentiveStatus
    >);
  });

  afterEach(cleanup);

  it.each(["increase", "decrease"] as const)("renders the V1 row structure for eligible %s trades", (feesType) => {
    renderRow(feesType);

    const link = screen.getByRole("link", { name: /Trade or stake.*unlock your rewards multiplier/ });
    expect(link.getAttribute("href")).toBe("/rewards");
    expect(link.textContent).toContain("0.0x");
    expect(screen.getByText("0.0x").className).toContain("text-typography-disabled");
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: ACCOUNT,
      enabled: true,
    });
  });

  it("shows the config-scaled persistent multiplier without claiming an estimated reward", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: { ...ZERO_STATUS, multiplier: 250n },
      loading: false,
    } as ReturnType<typeof useAccountIncentiveStatus>);

    renderRow("increase");

    const link = screen.getByRole("link", { name: /Current multiplier.*Earn rewards on eligible trades/ });
    expect(link.textContent).toContain("2.5x");
    expect(link.textContent).not.toContain("Estimated");
  });

  it("uses a neutral badge and copy for an unknown or stale multiplier", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: { ...ZERO_STATUS, epochTimestamp: CONFIG.epochTimestamp + 1 },
      loading: false,
    } as ReturnType<typeof useAccountIncentiveStatus>);

    renderRow("decrease");

    const link = screen.getByRole("link", { name: /View tiers and indexed rewards/ });
    expect(link.textContent).toContain("-");
    expect(link.textContent).not.toContain("0.0x");
    expect(link.textContent).not.toContain("Trade or stake");
    expect(screen.getByText("-").getAttribute("aria-hidden")).toBe("true");
  });

  it("uses the neutral state while account status is loading", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({ data: undefined, loading: true } as ReturnType<
      typeof useAccountIncentiveStatus
    >);

    renderRow("increase");

    const link = screen.getByRole("link", { name: /View tiers and indexed rewards/ });
    expect(link.textContent).toContain("-");
    expect(link.textContent).not.toContain("Trade or stake");
  });

  it("does not request status and uses the neutral state when the wallet is disconnected", () => {
    mockUseAccount.mockReturnValue({ address: undefined } as ReturnType<typeof useAccount>);
    mockUseAccountIncentiveStatus.mockReturnValue({ data: undefined, loading: false } as ReturnType<
      typeof useAccountIncentiveStatus
    >);

    renderRow("increase");

    expect(screen.getByRole("link", { name: /View tiers and indexed rewards/ }).textContent).toContain("-");
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: undefined,
      enabled: false,
    });
  });

  it("does not show the hint for swaps", () => {
    const { container } = renderRow("swap");

    expect(container.innerHTML).toBe("");
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: ACCOUNT,
      enabled: false,
    });
  });

  it("does not claim rewards before an incentives config is active", () => {
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "loading" },
      isActive: false,
      refreshConfig: vi.fn(),
    });

    const { container } = renderRow("increase");

    expect(container.innerHTML).toBe("");
  });

  it("does not show the hint outside Arbitrum", () => {
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "unsupported-chain" },
      isActive: false,
      refreshConfig: vi.fn(),
    });

    const { container } = renderRow("increase");

    expect(container.innerHTML).toBe("");
  });
});
