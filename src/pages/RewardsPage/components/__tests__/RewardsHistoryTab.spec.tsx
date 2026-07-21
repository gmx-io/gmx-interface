import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig, RewardsHistoryEntry } from "domain/synthetics/incentives/v2/types";
import { formatEpochLabel } from "domain/synthetics/incentives/v2/utils";
import { PRECISION } from "lib/numbers";

vi.mock("components/TableScrollFade/TableScrollFade", () => ({
  TableScrollFadeContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("img/ic_chevron_down.svg?react", () => ({
  default: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="chevron-down" {...props} />,
}));

const breakpointsMock = vi.hoisted(() => ({
  isMobile: false,
}));

vi.mock("lib/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: breakpointsMock.isMobile }),
}));

type HistoryParams = {
  account?: string;
  enabled?: boolean;
  limit: number;
  offset: number;
};

const historyMock = vi.hoisted(() => ({
  data: [] as RewardsHistoryEntry[] | undefined,
  totalCount: 0 as number | undefined,
  error: undefined as Error | undefined,
  loading: false,
  isValidating: false,
  params: [] as HistoryParams[],
  mutate: vi.fn(async () => undefined),
}));

vi.mock("domain/synthetics/incentives/v2/useAccountRewardsHistory", () => ({
  useAccountRewardsHistory: (_chainId: number, params: HistoryParams) => {
    historyMock.params.push(params);

    return {
      data: historyMock.data,
      totalCount: historyMock.totalCount,
      hasNextPage: false,
      error: historyMock.error,
      loading: historyMock.loading,
      isValidating: historyMock.isValidating,
      mutate: historyMock.mutate,
      endpoint: "https://example.test/graphql",
    };
  },
}));

import { RewardsHistoryTab } from "../RewardsHistoryTab";

const CHECKSUMMED_ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const ONE_HOUR = 3_600;
const EPOCH = Date.UTC(2026, 3, 7, 9, 0, 0) / 1000;
const ES_GMX_UNIT = 10n ** BigInt(ES_GMX_DECIMALS);
const GT_UNIT = 10n ** BigInt(GT_DECIMALS);

const config = {
  epochTimestamp: EPOCH,
  epochDuration: ONE_HOUR,
} as IncentivesConfig;

function makeHistoryEntry(epoch: number): RewardsHistoryEntry {
  return {
    epoch,
    tradingVolume: 1_000n * PRECISION,
    tierVolume: 1_000n * PRECISION,
    referralVolume: 100n * PRECISION,
    esGmxRewards: 10n * ES_GMX_UNIT,
    gtRewards: 5n * GT_UNIT,
    rewardsUsd: 15n * PRECISION,
    tradingEsGmxRewards: 10n * ES_GMX_UNIT,
    tradingGtRewards: 5n * GT_UNIT,
    tradingRewardsUsd: 15n * PRECISION,
    referralEsGmxRewards: 0n,
    referralGtRewards: 0n,
    referralRewardsUsd: 0n,
    manualRewardsUsd: 0n,
  };
}

function historyNode(activeConfig: IncentivesConfig) {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsHistoryTab chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} config={activeConfig} />
    </I18nProvider>
  );
}

function renderHistory(activeConfig = config) {
  return render(historyNode(activeConfig));
}

function getLastHistoryParams() {
  return historyMock.params[historyMock.params.length - 1];
}

i18n.load({ en: {}, "de-DE": {} });
i18n.activate("en");

describe("RewardsHistoryTab", () => {
  beforeEach(() => {
    historyMock.data = [makeHistoryEntry(EPOCH)];
    historyMock.totalCount = 32;
    historyMock.error = undefined;
    historyMock.loading = false;
    historyMock.isValidating = false;
    historyMock.params.length = 0;
    historyMock.mutate.mockClear();
    breakpointsMock.isMobile = false;
  });

  afterEach(() => {
    i18n.activate("en");
    vi.restoreAllMocks();
    cleanup();
  });

  it("formats one-hour epochs with the active application locale", () => {
    i18n.activate("de-DE");
    historyMock.totalCount = 1;

    renderHistory();

    expect(screen.getByText(formatEpochLabel(EPOCH, ONE_HOUR, "de-DE"))).toBeTruthy();
  });

  it("uses the compact volume label on desktop", () => {
    renderHistory();

    expect(screen.getByRole("columnheader", { name: "Volume" })).toBeTruthy();
    expect(screen.queryByText("Trading volume")).toBeNull();
  });

  it("shows the current epoch countdown and marks the previous epoch finished", () => {
    vi.spyOn(Date, "now").mockReturnValue((EPOCH + ONE_HOUR / 2) * 1000);
    historyMock.data = [makeHistoryEntry(EPOCH), makeHistoryEntry(EPOCH - ONE_HOUR)];
    historyMock.totalCount = 2;

    renderHistory();

    expect(screen.getByText("Epoch ends in")).toBeTruthy();
    expect(screen.getByText("Finished")).toBeTruthy();
  });

  it("uses expandable reward details on mobile", () => {
    breakpointsMock.isMobile = true;
    historyMock.totalCount = 1;

    renderHistory();

    expect(screen.queryByText("Volume")).toBeNull();
    const toggle = screen.getByRole("button", { name: "Toggle reward details" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Volume")).toBeTruthy();
    expect(screen.getByText("Referral volume")).toBeTruthy();
    expect(screen.getByText("esGMX accrued")).toBeTruthy();
    expect(screen.getByText("GT allocated")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
  });

  it("resets to the first page without revalidating the old page on config rollover", async () => {
    const { rerender } = renderHistory();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(getLastHistoryParams().offset).toBe(16));
    expect(historyMock.mutate).not.toHaveBeenCalled();

    const nextConfig = { ...config, epochTimestamp: config.epochTimestamp + config.epochDuration };
    rerender(historyNode(nextConfig));

    await waitFor(() => {
      expect(getLastHistoryParams()).toMatchObject({
        account: CHECKSUMMED_ACCOUNT,
        enabled: true,
        limit: 16,
        offset: 0,
      });
      expect(historyMock.mutate).not.toHaveBeenCalled();
    });
  });

  it("revalidates history on config rollover when already on the first page", async () => {
    const { rerender } = renderHistory();
    const nextConfig = { ...config, epochTimestamp: config.epochTimestamp + config.epochDuration };

    rerender(historyNode(nextConfig));

    await waitFor(() => expect(historyMock.mutate).toHaveBeenCalledTimes(1));
  });

  it("shows a refresh warning alongside a cached empty page", () => {
    historyMock.data = [];
    historyMock.totalCount = 0;
    historyMock.error = new Error("refresh failed");

    renderHistory();

    expect(screen.getByText("Rewards history could not be refreshed. Showing the latest loaded data.")).toBeTruthy();
    expect(screen.getByText("No rewards history yet. Start trading to earn rewards.")).toBeTruthy();
  });

  it("keeps pagination recovery available when a later page fails", async () => {
    const { rerender } = renderHistory();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(getLastHistoryParams().offset).toBe(16));

    historyMock.data = undefined;
    historyMock.totalCount = undefined;
    historyMock.error = new Error("page failed");
    rerender(historyNode(config));

    expect(screen.getByText("Rewards history is temporarily unavailable. Please try again later.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    await waitFor(() => expect(getLastHistoryParams().offset).toBe(0));
  });
});
