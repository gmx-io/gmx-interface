import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { useLatestGtPrice } from "domain/synthetics/incentives/v2/useLatestGtPrice";
import type { RatioVestingData } from "domain/vesting/ratioVesting";
import { useRewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { PRECISION } from "lib/numbers";
import { sendRewardsNavigationEvent } from "lib/userAnalytics/rewardsEvents";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";

import { RewardsSummaryRow } from "../RewardsSummaryRow";

vi.mock("domain/vesting/useRewardsVestingData", () => ({
  useRewardsVestingData: vi.fn(),
}));

vi.mock("domain/synthetics/incentives/v2/useLatestGtPrice", () => ({
  useLatestGtPrice: vi.fn(),
}));

vi.mock("lib/wallets/useIsWalletInitializing", () => ({
  useIsWalletInitializing: vi.fn(),
}));

vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsBannerEvent: vi.fn(),
  sendRewardsNavigationEvent: vi.fn(),
}));

const CHECKSUMMED_ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const GMX_UNIT = 10n ** BigInt(ES_GMX_DECIMALS);
const GT_UNIT = 10n ** BigInt(GT_DECIMALS);
const mockUseRewardsVestingData = vi.mocked(useRewardsVestingData);
const mockUseLatestGtPrice = vi.mocked(useLatestGtPrice);
const mockUseIsWalletInitializing = vi.mocked(useIsWalletInitializing);
const mockSendRewardsNavigationEvent = vi.mocked(sendRewardsNavigationEvent);

function usd(value: bigint) {
  return value * PRECISION;
}

function normalizeText(text: string | null | undefined) {
  return text?.replace(/\s/g, "") ?? "";
}

async function expectTooltipText(text: string) {
  const expectedText = normalizeText(text);

  await waitFor(() => {
    expect(
      Array.from(document.querySelectorAll(".Tooltip-popup")).some((tooltip) =>
        normalizeText(tooltip.textContent).includes(expectedText)
      )
    ).toBe(true);
  });
}

const allTimeSummary: LeaderboardEntry = {
  rank: 7,
  address: CHECKSUMMED_ACCOUNT,
  tradingVolume: usd(100_000n),
  referralVolume: usd(25_000n),
  esGmxRewards: 12n * GMX_UNIT,
  gtRewards: 150n * GT_UNIT,
  rewardsUsd: usd(500n),
  multiplier: null,
};

const ratioVesting: RatioVestingData = {
  pairRatioFactor: 5n * 10n ** 30n,
  capUsedAmount: 0n,
  unpaidClaimAmount: 0n,
  deactivatedAt: 0n,
  isFrozen: false,
  isIssuerBindingConfirmed: true,
  esTokenAllowance: 0n,
  pairTokenAllowance: 0n,
  tranches: [],
};

type RewardsSummaryRowProps = React.ComponentProps<typeof RewardsSummaryRow>;

const defaultProps: RewardsSummaryRowProps = {
  chainId: ARBITRUM,
  account: CHECKSUMMED_ACCOUNT,
  allTimeSummary,
  summaryState: "ready",
};

i18n.load({ en: {} });
i18n.activate("en");

function getRouterEntries(entry: string) {
  return [entry];
}

function getRowNode(overrides: Partial<RewardsSummaryRowProps> = {}, path = "/rewards") {
  return (
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={getRouterEntries(path)}>
        <RewardsSummaryRow {...defaultProps} {...overrides} />
      </MemoryRouter>
    </I18nProvider>
  );
}

function renderRow(overrides: Partial<RewardsSummaryRowProps> = {}, path = "/rewards") {
  return render(getRowNode(overrides, path));
}

function getSummaryItem(
  qa: "rewards-summary-all-time" | "rewards-summary-vestable-esgmx" | "rewards-summary-gt-balance"
) {
  const item = document.querySelector(`[data-qa="${qa}"]`);
  expect(item).not.toBeNull();

  return item as HTMLElement;
}

function getVestingDataResult(
  overrides: { vestableEsGmx?: bigint; vestableEsGmxUsd?: bigint; vestedAmount?: bigint; ratio?: RatioVestingData } = {}
): ReturnType<typeof useRewardsVestingData> {
  const { vestableEsGmx = 5n * GMX_UNIT, vestedAmount = 0n, ratio } = overrides;
  // An explicit `vestableEsGmxUsd: undefined` means the GMX price is unknown.
  const vestableEsGmxUsd = "vestableEsGmxUsd" in overrides ? overrides.vestableEsGmxUsd : usd(100n);

  return {
    data: {
      walletGmxBalance: 0n,
      walletEsGmxBalance: vestableEsGmx,
      claimableEsGmxRewards: 0n,
      stakedGmxBalance: 0n,
      freePairAmount: 0n,
      vestingInfo: {
        pairAmount: 0n,
        vestedAmount,
        escrowedBalance: 0n,
        claimedAmounts: 0n,
        claimable: 0n,
        maxVestableAmount: vestableEsGmx + vestedAmount,
        averageStakedAmount: 0n,
      },
      vestingDuration: 365n * 24n * 60n * 60n,
      gmxPrice: usd(20n),
      ratioVesting: ratio,
    },
    vestableEsGmx,
    vestableEsGmxUsd,
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  };
}

function getGtPriceResult(
  overrides: { priceUsd?: bigint; loading?: boolean } = {}
): ReturnType<typeof useLatestGtPrice> {
  const { loading = false } = overrides;
  // An explicit `priceUsd: undefined` means the GT price is not available.
  const priceUsd = "priceUsd" in overrides ? overrides.priceUsd : PRECISION / 20n;

  return {
    data: priceUsd === undefined ? undefined : { priceUsd, timestamp: 1_000 },
    error: undefined,
    loading,
    isValidating: false,
    mutate: vi.fn(),
    endpoint: "https://example.test/graphql",
  } as ReturnType<typeof useLatestGtPrice>;
}

beforeEach(() => {
  mockUseIsWalletInitializing.mockReturnValue(false);
  mockUseRewardsVestingData.mockReturnValue(getVestingDataResult());
  mockUseLatestGtPrice.mockReturnValue(getGtPriceResult());
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("RewardsSummaryRow", () => {
  it("renders nothing without an account or while the wallet is restoring", () => {
    const view = renderRow({ account: undefined, summaryState: "disconnected" });

    expect(view.container.textContent).toBe("");

    mockUseIsWalletInitializing.mockReturnValue(true);
    view.rerender(getRowNode());

    expect(view.container.textContent).toBe("");
    expect(screen.queryByText("All-time rewards")).toBeNull();
  });

  it("shows all-time rewards, esGMX available to vest and the GT balance with USD values", () => {
    renderRow();

    const allTime = getSummaryItem("rewards-summary-all-time");
    const vestable = getSummaryItem("rewards-summary-vestable-esgmx");
    const gtBalance = getSummaryItem("rewards-summary-gt-balance");

    expect(within(allTime).getByRole("button", { name: "All-time rewards" })).toBeDefined();
    expect(normalizeText(allTime.textContent)).toContain("$500.00");

    expect(within(vestable).getByRole("button", { name: "Available to vest" })).toBeDefined();
    expect(within(vestable).getByText("5 esGMX")).toBeDefined();
    expect(normalizeText(vestable.textContent)).toContain("$100.00");

    expect(within(gtBalance).getByRole("button", { name: "GT balance" })).toBeDefined();
    expect(within(gtBalance).getByText("150 GT")).toBeDefined();
    expect(normalizeText(gtBalance.textContent)).toContain("$7.50");

    expect(mockUseRewardsVestingData).toHaveBeenLastCalledWith(CHECKSUMMED_ACCOUNT, ARBITRUM);
    expect(mockUseLatestGtPrice).toHaveBeenLastCalledWith(ARBITRUM, { enabled: true });
  });

  it("shows the all-time esGMX and GT breakdown in the tooltip", async () => {
    renderRow();

    const allTimeButton = screen.getByRole("button", { name: "All-time rewards" });
    expect((allTimeButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.mouseEnter(allTimeButton.closest(".Tooltip-handle")!);

    await expectTooltipText("All-time esGMX");
    await expectTooltipText("12 esGMX");
    await expectTooltipText("($240.00)");
    await expectTooltipText("All-time GT");
    await expectTooltipText("150 GT");
    await expectTooltipText("($7.50)");
  });

  it("shows integer-rounded zero all-time rewards without a threshold sign", () => {
    renderRow({ allTimeSummary: { ...allTimeSummary, rewardsUsd: 1n } });

    const allTimeText = normalizeText(getSummaryItem("rewards-summary-all-time").textContent);
    expect(allTimeText).toContain("All-timerewards$0");
    expect(allTimeText).not.toContain("<");
  });

  it("links esGMX available to vest to the highlighted Vesting tab and keeps the current query", () => {
    renderRow({}, "/rewards/leaderboard?page=2");

    const vestable = getSummaryItem("rewards-summary-vestable-esgmx");
    const vestingLink = within(vestable).getByRole("link", { name: "Start vesting" });

    expect(vestingLink.getAttribute("href")).toBe("/rewards/history?page=2&vesting=highlight");

    fireEvent.click(vestingLink);
    expect(mockSendRewardsNavigationEvent).toHaveBeenCalledWith({ source: "TiersSummary" });
  });

  it("says Vest more when esGMX is already vesting", () => {
    mockUseRewardsVestingData.mockReturnValue(getVestingDataResult({ vestedAmount: 2n * GMX_UNIT }));

    renderRow();

    const vestable = getSummaryItem("rewards-summary-vestable-esgmx");
    expect(within(vestable).queryByRole("link", { name: "Start vesting" })).toBeNull();
    expect(within(vestable).getByRole("link", { name: "Vest more" }).getAttribute("href")).toBe(
      "/rewards/history?vesting=highlight"
    );
  });

  it("hides the vesting link on the Vesting tab", () => {
    renderRow({}, "/rewards/history");

    const vestable = getSummaryItem("rewards-summary-vestable-esgmx");
    expect(within(vestable).getByText("5 esGMX")).toBeDefined();
    expect(within(vestable).queryByRole("link")).toBeNull();
  });

  it("hides the vesting link while ratio-vesting deposits are disabled", () => {
    mockUseRewardsVestingData.mockReturnValue(getVestingDataResult({ ratio: ratioVesting }));
    const view = renderRow();

    expect(
      within(getSummaryItem("rewards-summary-vestable-esgmx")).getByRole("link", { name: "Start vesting" })
    ).toBeDefined();

    mockUseRewardsVestingData.mockReturnValue(getVestingDataResult({ ratio: { ...ratioVesting, isFrozen: true } }));
    view.rerender(getRowNode());

    expect(within(getSummaryItem("rewards-summary-vestable-esgmx")).queryByRole("link")).toBeNull();

    mockUseRewardsVestingData.mockReturnValue(getVestingDataResult({ ratio: { ...ratioVesting, deactivatedAt: 1n } }));
    view.rerender(getRowNode());

    expect(within(getSummaryItem("rewards-summary-vestable-esgmx")).queryByRole("link")).toBeNull();
    expect(within(getSummaryItem("rewards-summary-vestable-esgmx")).getByText("5 esGMX")).toBeDefined();
  });

  it("shows < 0.01 and hides the vesting link for dust amounts", () => {
    mockUseRewardsVestingData.mockReturnValue(
      getVestingDataResult({ vestableEsGmx: GMX_UNIT / 100n - 1n, vestableEsGmxUsd: 1n })
    );

    const view = renderRow({ allTimeSummary: { ...allTimeSummary, gtRewards: GT_UNIT / 100n - 1n } });

    expect(within(getSummaryItem("rewards-summary-vestable-esgmx")).getByText("< 0.01 esGMX")).toBeDefined();
    expect(within(getSummaryItem("rewards-summary-gt-balance")).getByText("< 0.01 GT")).toBeDefined();
    expect(screen.queryAllByRole("link")).toHaveLength(0);

    mockUseRewardsVestingData.mockReturnValue(
      getVestingDataResult({ vestableEsGmx: GMX_UNIT / 100n, vestableEsGmxUsd: usd(1n) / 5n })
    );
    view.rerender(getRowNode({ allTimeSummary: { ...allTimeSummary, gtRewards: GT_UNIT / 100n } }));

    expect(within(getSummaryItem("rewards-summary-vestable-esgmx")).getByText("0.01 esGMX")).toBeDefined();
    expect(within(getSummaryItem("rewards-summary-gt-balance")).getByText("0.01 GT")).toBeDefined();
    expect(screen.getByRole("link", { name: "Start vesting" })).toBeDefined();
  });

  it("does not load the GT price without a GT balance", () => {
    renderRow({ allTimeSummary: { ...allTimeSummary, gtRewards: 0n } });

    const gtBalance = getSummaryItem("rewards-summary-gt-balance");
    expect(within(gtBalance).getByText("0 GT")).toBeDefined();
    expect(normalizeText(gtBalance.textContent)).toContain("$0.00");
    expect(mockUseLatestGtPrice).toHaveBeenLastCalledWith(ARBITRUM, { enabled: false });
  });

  it("shows a dash when vestable esGMX is known but its USD price is unavailable", () => {
    mockUseRewardsVestingData.mockReturnValue(getVestingDataResult({ vestableEsGmxUsd: undefined }));

    renderRow();

    const vestable = getSummaryItem("rewards-summary-vestable-esgmx");
    expect(within(vestable).getByText("5 esGMX")).toBeDefined();
    expect(within(vestable).getByText("-", { exact: true })).toBeDefined();
  });

  it("shows the GT value as loading, then a dash when the GT price is unavailable", () => {
    mockUseLatestGtPrice.mockReturnValue(getGtPriceResult({ priceUsd: undefined, loading: true }));
    const view = renderRow();

    let gtBalance = getSummaryItem("rewards-summary-gt-balance");
    expect(within(gtBalance).getByText("150 GT")).toBeDefined();
    expect(within(gtBalance).getByText("…", { exact: true })).toBeDefined();

    mockUseLatestGtPrice.mockReturnValue(getGtPriceResult({ priceUsd: undefined }));
    view.rerender(getRowNode());

    gtBalance = getSummaryItem("rewards-summary-gt-balance");
    expect(within(gtBalance).getByText("150 GT")).toBeDefined();
    expect(within(gtBalance).getByText("-", { exact: true })).toBeDefined();
  });

  it("shows loading placeholders and disables the all-time breakdown while account data loads", () => {
    mockUseRewardsVestingData.mockReturnValue({
      data: undefined,
      vestableEsGmx: undefined,
      vestableEsGmxUsd: undefined,
      isLoading: true,
      error: undefined,
      mutate: vi.fn(),
    });

    renderRow({ summaryState: "loading" });

    const allTime = getSummaryItem("rewards-summary-all-time");
    const vestable = getSummaryItem("rewards-summary-vestable-esgmx");
    const gtBalance = getSummaryItem("rewards-summary-gt-balance");

    expect(within(allTime).getByText("…", { exact: true })).toBeDefined();
    expect(within(vestable).getAllByText("…", { exact: true })).toHaveLength(2);
    expect(within(gtBalance).getAllByText("…", { exact: true })).toHaveLength(2);
    expect((within(allTime).getByRole("button", { name: "All-time rewards" }) as HTMLButtonElement).disabled).toBe(
      true
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("shows dashes and disables the all-time breakdown when account data is unavailable", () => {
    mockUseRewardsVestingData.mockReturnValue({
      data: undefined,
      vestableEsGmx: undefined,
      vestableEsGmxUsd: undefined,
      isLoading: false,
      error: new Error("RPC unavailable"),
      mutate: vi.fn(),
    });

    renderRow({ summaryState: "unavailable" });

    const allTime = getSummaryItem("rewards-summary-all-time");
    const vestable = getSummaryItem("rewards-summary-vestable-esgmx");
    const gtBalance = getSummaryItem("rewards-summary-gt-balance");

    expect(within(allTime).getByText("-", { exact: true })).toBeDefined();
    expect(within(vestable).getAllByText("-", { exact: true })).toHaveLength(2);
    expect(within(gtBalance).getAllByText("-", { exact: true })).toHaveLength(2);
    expect((within(allTime).getByRole("button", { name: "All-time rewards" }) as HTMLButtonElement).disabled).toBe(
      true
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
