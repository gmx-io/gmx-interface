import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import type { AccountIncentiveStatus, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { USD_DECIMALS } from "lib/numbers";
import {
  sendRewardsManualAllocationDialogActionEvent,
  sendRewardsManualAllocationDialogShownEvent,
} from "lib/userAnalytics/rewardsEvents";

import { HistoricalRewardsAllocationModal } from "../HistoricalRewardsAllocationModal";
import {
  getShouldShowHistoricalRewardsAllocationModal,
  useHistoricalRewardsAllocationModal,
} from "../useHistoricalRewardsAllocationModal";

vi.mock("context/IncentivesV2Context/IncentivesV2Context", () => ({
  useIncentivesV2State: vi.fn(),
}));
vi.mock("domain/synthetics/incentives/v2/useAccountIncentiveStatus", () => ({
  useAccountIncentiveStatus: vi.fn(),
}));
vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsManualAllocationDialogActionEvent: vi.fn(),
  sendRewardsManualAllocationDialogShownEvent: vi.fn(),
}));

vi.mock("components/Modal/ModalWithPortal", () => ({
  default: ({
    isVisible,
    label,
    children,
  }: {
    isVisible?: boolean;
    label?: React.ReactNode;
    children: React.ReactNode;
  }) =>
    isVisible ? (
      <div role="dialog" aria-label={String(label)}>
        {children}
      </div>
    ) : null,
}));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const USD_UNIT = 10n ** BigInt(USD_DECIMALS);
const config = { epochTimestamp: 100 } as IncentivesConfig;
const activeStatus = {
  epochTimestamp: 100,
  manualRewardCapUsd: 1_000n * USD_UNIT,
  manualRewardConsumedUsd: 250n * USD_UNIT,
  manualRewardRemainingUsd: 750n * USD_UNIT,
} as AccountIncentiveStatus;
const unconsumedStatus = {
  ...activeStatus,
  manualRewardConsumedUsd: 0n,
  manualRewardRemainingUsd: activeStatus.manualRewardCapUsd,
};
const mockUseIncentivesV2State = vi.mocked(useIncentivesV2State);
const mockUseAccountIncentiveStatus = vi.mocked(useAccountIncentiveStatus);
let latestModalState: ReturnType<typeof useHistoricalRewardsAllocationModal>;

function HookHarness({ account }: { account?: string }) {
  latestModalState = useHistoricalRewardsAllocationModal({ chainId: ARBITRUM, account });

  return null;
}

function normalizeText(element: HTMLElement) {
  return element.textContent?.replace(/\s/g, "");
}

i18n.load({ en: {} });
i18n.activate("en");

describe("HistoricalRewardsAllocationModal", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "active", config, isStale: false },
      isActive: true,
      refreshConfig: vi.fn(),
    });
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: unconsumedStatus,
      error: undefined,
      loading: false,
      isValidating: false,
      mutate: vi.fn(),
      endpoint: "https://example.com/graphql",
    });
  });

  afterEach(cleanup);

  it.each([
    ["inactive", { activeEpochTimestamp: undefined }],
    ["mixed epoch", { activeEpochTimestamp: 200 }],
    ["partially consumed", { status: activeStatus }],
    ["exhausted", { status: { ...unconsumedStatus, manualRewardRemainingUsd: 0n } }],
    ["disconnected", { account: undefined }],
    ["dismissed", { dismissed: true }],
  ])("stays closed when the program state is %s", (_label, override) => {
    expect(
      getShouldShowHistoricalRewardsAllocationModal({
        dismissed: false,
        account: ACCOUNT,
        status: unconsumedStatus,
        activeEpochTimestamp: 100,
        ...override,
      })
    ).toBe(false);
  });

  it("opens for a current-epoch account with an unconsumed historical reward cap", () => {
    expect(
      getShouldShowHistoricalRewardsAllocationModal({
        dismissed: false,
        account: ACCOUNT,
        status: unconsumedStatus,
        activeEpochTimestamp: 100,
      })
    ).toBe(true);
  });

  it("closes an open modal immediately when availability or account state becomes invalid", async () => {
    const view = render(<HookHarness account={ACCOUNT} />);

    await waitFor(() => expect(latestModalState.isVisible).toBe(true));

    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "inactive" },
      isActive: false,
      refreshConfig: vi.fn(),
    });
    view.rerender(<HookHarness account={ACCOUNT} />);
    await waitFor(() => expect(latestModalState.isVisible).toBe(false));

    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "active", config, isStale: false },
      isActive: true,
      refreshConfig: vi.fn(),
    });
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: unconsumedStatus,
      error: undefined,
      loading: false,
      isValidating: false,
      mutate: vi.fn(),
      endpoint: "https://example.com/graphql",
    });
    view.rerender(<HookHarness account={ACCOUNT} />);
    await waitFor(() => expect(latestModalState.isVisible).toBe(true));

    mockUseAccountIncentiveStatus.mockReturnValue({
      data: { ...unconsumedStatus, epochTimestamp: 99 },
      error: undefined,
      loading: false,
      isValidating: false,
      mutate: vi.fn(),
      endpoint: "https://example.com/graphql",
    });
    view.rerender(<HookHarness account={ACCOUNT} />);
    await waitFor(() => expect(latestModalState.isVisible).toBe(false));

    mockUseAccountIncentiveStatus.mockReturnValue({
      data: { ...unconsumedStatus, manualRewardRemainingUsd: 0n },
      error: undefined,
      loading: false,
      isValidating: false,
      mutate: vi.fn(),
      endpoint: "https://example.com/graphql",
    });
    view.rerender(<HookHarness account={ACCOUNT} />);
    expect(latestModalState.isVisible).toBe(false);

    view.rerender(<HookHarness account={undefined} />);
    expect(latestModalState.isVisible).toBe(false);
  });

  it("shows cap consumption and the historical referral banner", () => {
    const onClose = vi.fn();
    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <HistoricalRewardsAllocationModal
            isVisible
            onClose={onClose}
            rewardCapUsd={activeStatus.manualRewardCapUsd}
            rewardConsumedUsd={activeStatus.manualRewardConsumedUsd}
            rewardRemainingUsd={activeStatus.manualRewardRemainingUsd}
          />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(normalizeText(screen.getByText("Bonus remaining").parentElement!)).toContain("$750");
    expect(normalizeText(screen.getByText(/used out of a/))).toBe("$250usedoutofa$1,000rewardcap");
    expect(screen.getByText("Know someone who traded on GMX?")).toBeDefined();
    expect(sendRewardsManualAllocationDialogShownEvent).toHaveBeenCalledWith({
      rewardCapUsd: activeStatus.manualRewardCapUsd,
      rewardConsumedUsd: activeStatus.manualRewardConsumedUsd,
      rewardRemainingUsd: activeStatus.manualRewardRemainingUsd,
    });

    const shareLink = screen.getByRole("link", { name: /Share your rewards/ });
    expect(shareLink.getAttribute("href")).toBe("/referrals");
    fireEvent.click(shareLink);
    expect(sendRewardsManualAllocationDialogActionEvent).toHaveBeenCalledWith("Share");
    expect(onClose).toHaveBeenCalled();
  });
});
