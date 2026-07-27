import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig, LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { formatAmount, formatUsd, PRECISION } from "lib/numbers";
import { convertToUsd } from "sdk/utils/tokens";

vi.mock("components/AddressView/AddressView", () => ({
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));

vi.mock("components/TableScrollFade/TableScrollFade", () => ({
  TableScrollFadeContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const rewardsShareMock = vi.hoisted(() => ({
  props: [] as {
    isOpen: boolean;
    account: string;
    chainId: number;
    entry: LeaderboardEntry;
  }[],
}));

const rewardsAnalyticsMock = vi.hoisted(() => ({
  sendRewardsLeaderboardShareClickEvent: vi.fn(),
}));

const rewardsPricesMock = vi.hoisted(() => ({
  gmxPrice: undefined as bigint | undefined,
  gtPrice: undefined as bigint | undefined,
}));

vi.mock("domain/legacy", () => ({
  useGmxPrice: () => ({ gmxPrice: rewardsPricesMock.gmxPrice }),
}));

vi.mock("domain/synthetics/incentives/v2/useLatestGtPrice", () => ({
  useLatestGtPrice: () => ({
    data:
      rewardsPricesMock.gtPrice === undefined
        ? undefined
        : { priceUsd: rewardsPricesMock.gtPrice, timestamp: 1_784_073_600 },
  }),
}));

vi.mock("components/RewardsShare/RewardsShare", () => ({
  RewardsShare: (props: { isOpen: boolean; account: string; chainId: number; entry: LeaderboardEntry }) => {
    rewardsShareMock.props.push(props);

    return props.isOpen ? (
      <div data-testid="rewards-share-modal" data-account={props.account} data-chain-id={props.chainId}>
        {props.entry.rank}
      </div>
    ) : null;
  },
}));

vi.mock("lib/userAnalytics/rewardsEvents", () => rewardsAnalyticsMock);

vi.mock("img/ic_share_arrow_filled.svg?react", () => ({
  default: ({ className }: { className?: string }) => <svg className={className} />,
}));

type LeaderboardParams = {
  epoch?: number;
  where?: { account?: string };
  orderBy?: string;
  enabled?: boolean;
  isMutable?: boolean;
  limit: number;
  offset: number;
};

const leaderboardMock = vi.hoisted(() => ({
  data: [] as LeaderboardEntry[] | undefined,
  pinnedData: [] as LeaderboardEntry[] | undefined,
  totalCount: 0 as number | undefined,
  error: undefined as Error | undefined,
  pageLoading: false,
  pageValidating: false,
  pinnedError: undefined as Error | undefined,
  pinnedLoading: false,
  pinnedValidating: false,
  pageMutate: vi.fn(),
  pinnedMutate: vi.fn(),
  pageParams: [] as LeaderboardParams[],
  pinnedParams: [] as LeaderboardParams[],
}));

vi.mock("domain/synthetics/incentives/v2/useIncentivesLeaderboard", () => ({
  useIncentivesLeaderboard: (_chainId: number, params: LeaderboardParams) => {
    if (params.limit === 1) {
      leaderboardMock.pinnedParams.push(params);

      return {
        data: leaderboardMock.pinnedData,
        totalCount: leaderboardMock.pinnedData?.length,
        hasNextPage: false,
        error: leaderboardMock.pinnedError,
        loading: leaderboardMock.pinnedLoading,
        isValidating: leaderboardMock.pinnedValidating,
        mutate: leaderboardMock.pinnedMutate,
      };
    }

    leaderboardMock.pageParams.push(params);

    return {
      data: leaderboardMock.data,
      totalCount: leaderboardMock.totalCount,
      hasNextPage: false,
      error: leaderboardMock.error,
      loading: leaderboardMock.pageLoading,
      isValidating: leaderboardMock.pageValidating,
      mutate: leaderboardMock.pageMutate,
    };
  },
}));

import { RewardsLeaderboardTab } from "../RewardsLeaderboardTab";

const USD_UNIT = PRECISION;
const GMX_UNIT = 10n ** BigInt(ES_GMX_DECIMALS);
const GT_UNIT = 10n ** BigInt(GT_DECIMALS);
const PAGE_SIZE = 20;
const CHECKSUMMED_ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const SEARCH_ACCOUNT = "0x8617E340B3D01FA5F11F306F4090FD50E238070D";

const config = {
  epochTimestamp: 1_784_073_600,
  epochDuration: 604_800,
  multiplierDecimals: 100n,
} as IncentivesConfig;

function makeEntry(address: string, rank: number): LeaderboardEntry {
  return {
    rank,
    address,
    tradingVolume: 123_456n * USD_UNIT,
    referralVolume: 7_890n * USD_UNIT,
    esGmxRewards: 125n * GMX_UNIT,
    gtRewards: 42n * GT_UNIT,
    rewardsUsd: (1_234_500n * PRECISION) / 1_000n,
    multiplier: 250n,
  };
}

const pageEntry = makeEntry("0xde709f2102306220921060314715629080e2fb77", 1);
const pinnedEntry = makeEntry(CHECKSUMMED_ACCOUNT, 47);

function renderLeaderboard(activeConfig = config, account: string | undefined = CHECKSUMMED_ACCOUNT) {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsLeaderboardTab chainId={ARBITRUM} account={account} config={activeConfig} />
      </MemoryRouter>
    </I18nProvider>
  );
}

function renderAllTimeOnlyLeaderboard(account: string | undefined = CHECKSUMMED_ACCOUNT) {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsLeaderboardTab chainId={ARBITRUM} account={account} />
      </MemoryRouter>
    </I18nProvider>
  );
}

function leaderboardNode(activeConfig: IncentivesConfig) {
  return (
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <RewardsLeaderboardTab chainId={ARBITRUM} account={CHECKSUMMED_ACCOUNT} config={activeConfig} />
      </MemoryRouter>
    </I18nProvider>
  );
}

function getLastPageParams() {
  return leaderboardMock.pageParams[leaderboardMock.pageParams.length - 1];
}

function getSortButton(label: string) {
  const button = screen.getByText(label).closest("button");
  if (!button) throw new Error(`No sortable button found for column "${label}"`);

  return button;
}

i18n.load({ en: {} });
i18n.activate("en");

describe("RewardsLeaderboardTab", () => {
  beforeEach(() => {
    leaderboardMock.data = [pageEntry];
    leaderboardMock.pinnedData = [pinnedEntry];
    leaderboardMock.totalCount = 60;
    leaderboardMock.error = undefined;
    leaderboardMock.pageLoading = false;
    leaderboardMock.pageValidating = false;
    leaderboardMock.pinnedError = undefined;
    leaderboardMock.pinnedLoading = false;
    leaderboardMock.pinnedValidating = false;
    leaderboardMock.pageMutate.mockReset();
    leaderboardMock.pinnedMutate.mockReset();
    leaderboardMock.pageParams.length = 0;
    leaderboardMock.pinnedParams.length = 0;
    rewardsShareMock.props.length = 0;
    rewardsAnalyticsMock.sendRewardsLeaderboardShareClickEvent.mockReset();
    rewardsPricesMock.gmxPrice = 2n * PRECISION;
    rewardsPricesMock.gtPrice = 3n * PRECISION;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("does not show the multiplier column for any period", async () => {
    renderLeaderboard();

    expect(screen.queryByRole("columnheader", { name: "Multiplier" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "All-time" }));

    await waitFor(() => {
      expect(getLastPageParams()).toMatchObject({
        epoch: undefined,
        orderBy: "rewardsUsd_DESC",
      });
    });
    expect(screen.queryByRole("columnheader", { name: "Multiplier" })).toBeNull();
    expect(within(screen.getByTestId("leaderboard-pinned-row")).getByRole("button", { name: "Share" })).toBeTruthy();
  });

  it("loads only config-independent all-time data when config is unavailable", () => {
    renderAllTimeOnlyLeaderboard();

    expect(screen.getByRole("button", { name: "All-time" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Volume this epoch" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Last epoch" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Multiplier" })).toBeNull();
    expect(getLastPageParams()).toMatchObject({
      epoch: undefined,
      isMutable: true,
      orderBy: "rewardsUsd_DESC",
    });
  });

  it("selects the current epoch when configuration arrives after an all-time fallback", async () => {
    const view = renderAllTimeOnlyLeaderboard();

    view.rerender(leaderboardNode(config));

    await waitFor(() => {
      expect(getLastPageParams()).toMatchObject({
        epoch: config.epochTimestamp,
        isMutable: true,
      });
    });
    expect(screen.queryByRole("columnheader", { name: "Multiplier" })).toBeNull();
  });

  it("renders the exact-cased connected account with its indexed values and global volume rank", () => {
    renderLeaderboard();

    const row = screen.getByTestId("leaderboard-pinned-row");
    const cells = within(row).getAllByRole("cell");
    expect(within(row).getByText("47")).toBeTruthy();
    expect(within(row).getByTitle(CHECKSUMMED_ACCOUNT).textContent).toBe(CHECKSUMMED_ACCOUNT);
    expect(cells).toHaveLength(8);
    expect(cells[2].textContent).toBe(
      formatUsd(pinnedEntry.tradingVolume, { fallbackToZero: true, displayDecimals: 0 })
    );
    expect(cells[3].textContent).toBe(
      formatUsd(pinnedEntry.referralVolume, { fallbackToZero: true, displayDecimals: 0 })
    );
    expect(
      within(cells[4] as HTMLElement).getByText(
        formatAmount(pinnedEntry.esGmxRewards, ES_GMX_DECIMALS, 4, true, { trimTrailingZeros: true })
      )
    ).toBeTruthy();
    const esGmxRewardsUsd = convertToUsd(pinnedEntry.esGmxRewards, ES_GMX_DECIMALS, rewardsPricesMock.gmxPrice);
    const esGmxUsdLabel = (cells[4] as HTMLElement).querySelector(".text-typography-secondary");
    expect(esGmxUsdLabel?.textContent).toBe(
      `(${formatUsd(esGmxRewardsUsd, { fallbackToZero: true, displayDecimals: 2 })})`
    );
    expect(
      within(cells[5] as HTMLElement).getByText(
        formatAmount(pinnedEntry.gtRewards, GT_DECIMALS, 4, true, { trimTrailingZeros: true })
      )
    ).toBeTruthy();
    const gtRewardsUsd = convertToUsd(pinnedEntry.gtRewards, GT_DECIMALS, rewardsPricesMock.gtPrice);
    const gtUsdLabel = (cells[5] as HTMLElement).querySelector(".text-typography-secondary");
    expect(gtUsdLabel?.textContent).toBe(`(${formatUsd(gtRewardsUsd, { fallbackToZero: true, displayDecimals: 2 })})`);
    expect(cells[6].textContent).toBe(formatUsd(pinnedEntry.rewardsUsd, { fallbackToZero: true, displayDecimals: 2 }));
    expect(within(cells[7] as HTMLElement).getByRole("button", { name: "Share" })).toBeTruthy();

    const pinnedParams = leaderboardMock.pinnedParams[leaderboardMock.pinnedParams.length - 1];
    expect(pinnedParams.where).toEqual({ account: CHECKSUMMED_ACCOUNT });
  });

  it("opens the rewards share modal from the connected account's pinned row", () => {
    renderLeaderboard();

    const pinnedRow = screen.getByTestId("leaderboard-pinned-row");
    const shareButton = within(pinnedRow).getByRole("button", { name: "Share" });

    fireEvent.click(shareButton);

    expect(screen.getByTestId("rewards-share-modal").textContent).toBe(String(pinnedEntry.rank));
    expect(rewardsAnalyticsMock.sendRewardsLeaderboardShareClickEvent).toHaveBeenCalledWith("current");
    expect(rewardsShareMock.props.at(-1)).toMatchObject({
      isOpen: true,
      account: CHECKSUMMED_ACCOUNT,
      chainId: ARBITRUM,
      entry: pinnedEntry,
    });
  });

  it("tracks all-time sharing without requiring current config", () => {
    renderAllTimeOnlyLeaderboard();

    fireEvent.click(within(screen.getByTestId("leaderboard-pinned-row")).getByRole("button", { name: "Share" }));

    expect(rewardsAnalyticsMock.sendRewardsLeaderboardShareClickEvent).toHaveBeenCalledWith("all");
  });

  it("opens sharing from the connected account's inline row without duplicating the action", () => {
    leaderboardMock.data = [pageEntry, pinnedEntry];
    renderLeaderboard();

    expect(screen.queryByTestId("leaderboard-pinned-row")).toBeNull();
    const accountRow = screen.getByTitle(CHECKSUMMED_ACCOUNT).closest("tr");
    if (!accountRow) throw new Error("Connected account row not found");

    fireEvent.click(within(accountRow).getByRole("button", { name: "Share" }));

    expect(screen.getAllByRole("button", { name: "Share" })).toHaveLength(1);
    expect(rewardsShareMock.props.at(-1)?.entry).toBe(pinnedEntry);
    expect(screen.getByTestId("rewards-share-modal")).toBeTruthy();
  });

  it("does not offer sharing for other accounts or an unranked connected account", () => {
    leaderboardMock.pinnedData = [];
    renderLeaderboard();

    expect(within(screen.getByTestId("leaderboard-pinned-row")).getByText("N/A")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    expect(screen.queryByTestId("rewards-share-modal")).toBeNull();
  });

  it("does not offer sharing without a connected account", () => {
    leaderboardMock.pinnedData = undefined;
    renderLeaderboard(config, undefined);

    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    expect(screen.queryByTestId("rewards-share-modal")).toBeNull();
  });

  it("closes a cached share card when the leaderboard period changes", async () => {
    renderLeaderboard();
    fireEvent.click(within(screen.getByTestId("leaderboard-pinned-row")).getByRole("button", { name: "Share" }));
    expect(screen.getByTestId("rewards-share-modal")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Last epoch" }));

    await waitFor(() => expect(screen.queryByTestId("rewards-share-modal")).toBeNull());
  });

  it("keeps the connected account pinned across pages unless it is already in the visible page data", async () => {
    const { rerender } = renderLeaderboard();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(getLastPageParams().offset).toBe(PAGE_SIZE));
    expect(screen.getByTestId("leaderboard-pinned-row")).toBeTruthy();

    leaderboardMock.data = [pinnedEntry];
    rerender(leaderboardNode(config));

    expect(screen.queryByTestId("leaderboard-pinned-row")).toBeNull();
    expect(screen.getAllByText(CHECKSUMMED_ACCOUNT)).toHaveLength(1);
  });

  it("keeps the resolved N/A account row pinned on later pages", async () => {
    leaderboardMock.pinnedData = [];
    renderLeaderboard();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(getLastPageParams().offset).toBe(PAGE_SIZE));

    expect(within(screen.getByTestId("leaderboard-pinned-row")).getByText("N/A")).toBeTruthy();
  });

  it("supports column sorting and resets pagination when the field changes", async () => {
    renderLeaderboard();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(getLastPageParams().offset).toBe(PAGE_SIZE));
    fireEvent.click(getSortButton("Volume"));

    await waitFor(() => {
      expect(getLastPageParams()).toMatchObject({
        orderBy: "tradingVolume_DESC",
        offset: 0,
      });
    });
  });

  it("filters by an exact address, resets pagination, and restores the unfiltered query when cleared", async () => {
    renderLeaderboard();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(getLastPageParams().offset).toBe(PAGE_SIZE));

    const searchInput = screen.getByPlaceholderText(/search address/i);
    fireEvent.change(searchInput, { target: { value: SEARCH_ACCOUNT } });

    await waitFor(() => {
      expect(getLastPageParams()).toMatchObject({
        where: { account: SEARCH_ACCOUNT },
        limit: PAGE_SIZE,
        offset: 0,
      });
    });

    fireEvent.change(searchInput, { target: { value: "" } });

    await waitFor(() => {
      expect(getLastPageParams().where).toBeUndefined();
      expect(getLastPageParams().offset).toBe(0);
    });
  });

  it("keeps partial and invalid address searches unfiltered", async () => {
    renderLeaderboard();

    const searchInput = screen.getByPlaceholderText(/search address/i);
    let paramsStart = leaderboardMock.pageParams.length;

    fireEvent.change(searchInput, { target: { value: "0x1234" } });

    await waitFor(() => expect((searchInput as HTMLInputElement).value).toBe("0x1234"));
    expect(leaderboardMock.pageParams.slice(paramsStart).length).toBeGreaterThan(0);
    expect(leaderboardMock.pageParams.slice(paramsStart).every((params) => params.where === undefined)).toBe(true);

    paramsStart = leaderboardMock.pageParams.length;
    fireEvent.change(searchInput, { target: { value: "not-an-address" } });

    await waitFor(() => expect((searchInput as HTMLInputElement).value).toBe("not-an-address"));
    expect(leaderboardMock.pageParams.slice(paramsStart).length).toBeGreaterThan(0);
    expect(leaderboardMock.pageParams.slice(paramsStart).every((params) => params.where === undefined)).toBe(true);
    expect(screen.getByTitle(pageEntry.address)).toBeTruthy();
  });

  it("keeps the connected account pinned when an exact-address search has no results", async () => {
    const { container } = renderLeaderboard();
    leaderboardMock.data = [];
    leaderboardMock.totalCount = 0;

    fireEvent.change(screen.getByPlaceholderText(/search address/i), { target: { value: SEARCH_ACCOUNT } });

    await waitFor(() => {
      expect(getLastPageParams()).toMatchObject({
        where: { account: SEARCH_ACCOUNT },
        limit: PAGE_SIZE,
        offset: 0,
      });
    });

    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(PAGE_SIZE + 1);
    expect(rows[0]).toBe(screen.getByTestId("leaderboard-pinned-row"));
    expect(within(rows[1] as HTMLElement).getByText("No results found")).toBeTruthy();
  });

  it("renders a checksummed You row only after an empty pinned query resolves", () => {
    leaderboardMock.pinnedData = [];

    const { rerender } = renderLeaderboard();

    const emptyPinnedRow = screen.getByTestId("leaderboard-pinned-row");
    expect(within(emptyPinnedRow).getByText("N/A")).toBeTruthy();
    expect(within(emptyPinnedRow).getByTitle(CHECKSUMMED_ACCOUNT)).toBeTruthy();

    leaderboardMock.pinnedData = undefined;
    leaderboardMock.pinnedLoading = true;
    rerender(leaderboardNode(config));

    expect(screen.queryByTestId("leaderboard-pinned-row")).toBeNull();

    leaderboardMock.pinnedLoading = false;
    leaderboardMock.pinnedError = new Error("rank failed");
    rerender(leaderboardNode(config));

    expect(screen.queryByTestId("leaderboard-pinned-row")).toBeNull();
    expect(screen.getByText("Your rank is temporarily unavailable.")).toBeTruthy();
  });

  it("resets current-epoch pagination when config rolls over", async () => {
    const { rerender } = renderLeaderboard();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(getLastPageParams().offset).toBe(PAGE_SIZE));

    const nextConfig = { ...config, epochTimestamp: config.epochTimestamp + config.epochDuration };
    rerender(leaderboardNode(nextConfig));

    await waitFor(() => {
      expect(getLastPageParams()).toMatchObject({
        epoch: nextConfig.epochTimestamp,
        offset: 0,
        isMutable: true,
      });
    });
  });

  it("resets previous-epoch pagination when config rolls over", async () => {
    const { rerender } = renderLeaderboard();

    fireEvent.click(screen.getByRole("button", { name: "Last epoch" }));
    await waitFor(() => expect(getLastPageParams().epoch).toBe(config.epochTimestamp - config.epochDuration));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(getLastPageParams().offset).toBe(PAGE_SIZE));

    const nextConfig = { ...config, epochTimestamp: config.epochTimestamp + config.epochDuration };
    rerender(leaderboardNode(nextConfig));

    await waitFor(() => {
      expect(getLastPageParams()).toMatchObject({
        epoch: nextConfig.epochTimestamp - nextConfig.epochDuration,
        offset: 0,
        isMutable: false,
      });
    });
  });

  it("preserves all-time pagination when config rolls over", async () => {
    const { rerender } = renderLeaderboard();

    fireEvent.click(screen.getByRole("button", { name: "All-time" }));
    await waitFor(() => expect(getLastPageParams().epoch).toBeUndefined());
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(getLastPageParams().offset).toBe(PAGE_SIZE));

    const nextConfig = { ...config, epochTimestamp: config.epochTimestamp + config.epochDuration };
    rerender(leaderboardNode(nextConfig));

    await waitFor(() => {
      expect(getLastPageParams()).toMatchObject({
        epoch: undefined,
        offset: PAGE_SIZE,
        isMutable: true,
      });
    });
  });

  it("revalidates the selected all-time leaderboard after rollover", async () => {
    vi.useFakeTimers();
    const { rerender } = renderLeaderboard();

    fireEvent.click(screen.getByRole("button", { name: "All-time" }));
    const nextConfig = { ...config, epochTimestamp: config.epochTimestamp + config.epochDuration };
    rerender(leaderboardNode(nextConfig));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(leaderboardMock.pageMutate).toHaveBeenCalledTimes(1);
    expect(leaderboardMock.pinnedMutate).toHaveBeenCalledTimes(1);
  });

  it("shows a refresh warning alongside a cached empty page", () => {
    leaderboardMock.data = [];
    leaderboardMock.pinnedData = [];
    leaderboardMock.totalCount = 0;
    leaderboardMock.error = new Error("refresh failed");

    renderLeaderboard();

    expect(screen.getByText("Leaderboard data could not be refreshed. Showing the latest loaded data.")).toBeTruthy();
    expect(within(screen.getByTestId("leaderboard-pinned-row")).getByText("N/A")).toBeTruthy();
  });

  it("renders a full page of table skeleton rows during the initial load", () => {
    leaderboardMock.data = undefined;
    leaderboardMock.totalCount = undefined;
    leaderboardMock.pageLoading = true;

    const { container } = renderLeaderboard();
    const rows = container.querySelectorAll("tbody tr");

    expect(getLastPageParams().limit).toBe(PAGE_SIZE);
    expect(rows).toHaveLength(PAGE_SIZE + 1);
    expect(screen.queryByText("No leaderboard entries yet.")).toBeNull();
  });

  it("keeps a resolved account row visible while the main page initially loads", () => {
    leaderboardMock.data = undefined;
    leaderboardMock.totalCount = undefined;
    leaderboardMock.pageLoading = true;

    const { container } = renderLeaderboard();
    const rows = container.querySelectorAll("tbody tr");
    const pinnedRow = screen.getByTestId("leaderboard-pinned-row");

    expect(rows).toHaveLength(PAGE_SIZE + 1);
    expect(rows[0]).toBe(pinnedRow);
    expect(within(pinnedRow).getByText("47")).toBeTruthy();
    expect(within(pinnedRow).getByTitle(CHECKSUMMED_ACCOUNT)).toBeTruthy();
  });

  it("keeps pagination recovery available when a later page fails", async () => {
    const { rerender } = renderLeaderboard();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(getLastPageParams().offset).toBe(PAGE_SIZE));

    leaderboardMock.data = undefined;
    leaderboardMock.totalCount = undefined;
    leaderboardMock.error = new Error("page failed");
    rerender(leaderboardNode(config));

    expect(screen.getByText("Leaderboard data is temporarily unavailable.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    await waitFor(() => expect(getLastPageParams().offset).toBe(0));
  });

  it("keeps pagination recovery available when a later page is empty", async () => {
    const { rerender } = renderLeaderboard();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(getLastPageParams().offset).toBe(PAGE_SIZE));

    leaderboardMock.data = [];
    leaderboardMock.totalCount = 0;
    rerender(leaderboardNode(config));

    expect(screen.getByTestId("leaderboard-pinned-row")).toBeTruthy();
    expect(screen.queryByText("No leaderboard entries yet.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    await waitFor(() => expect(getLastPageParams().offset).toBe(0));
  });
});
