import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentiveAccountEpochAuditEntry, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { PRECISION } from "lib/numbers";

vi.mock("components/AddressView/AddressView", () => ({
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));

vi.mock("components/TableScrollFade/TableScrollFade", () => ({
  TableScrollFadeContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const GMX_UNIT = 10n ** BigInt(ES_GMX_DECIMALS);
const GT_UNIT = 10n ** BigInt(GT_DECIMALS);

const entry: IncentiveAccountEpochAuditEntry = {
  id: `${ACCOUNT}:1784073600`,
  account: ACCOUNT,
  epochTimestamp: 1_784_073_600,
  fees: 250n * PRECISION,
  tradingVolume: 50_000n * PRECISION,
  tierVolume: 40_000n * PRECISION,
  referralVolume: 5_000n * PRECISION,
  esGmxRewards: 12n * GMX_UNIT,
  gtRewards: 3n * GT_UNIT,
  rewardsUsd: 30n * PRECISION,
  manualRewardsUsd: 4n * PRECISION,
  avgMultiplier: 175,
  maxMultiplier: 250,
  volumeTier: "Tier2",
  stakingTier: "Tier1",
  boostIds: ["FeaturedMarkets", "LifetimeTrading"],
  effectiveRewardsRatio: 0.12,
};

const auditMock = vi.hoisted(() => ({
  params: [] as Array<Record<string, unknown>>,
  error: undefined as Error | undefined,
}));
const statusMock = vi.hoisted(() => ({ error: undefined as Error | undefined }));

vi.mock("domain/synthetics/incentives/v2/useIncentiveAccountEpochAudit", () => ({
  useIncentiveAccountEpochAudit: (_chainId: number, params: Record<string, unknown>) => {
    auditMock.params.push(params);
    return {
      data: [entry],
      totalCount: 1,
      hasNextPage: false,
      summary: {
        loadedCount: 1,
        totalFees: entry.fees,
        totalTradingVolume: entry.tradingVolume,
        totalTierVolume: entry.tierVolume,
        totalReferralVolume: entry.referralVolume,
        totalEsGmxRewards: entry.esGmxRewards,
        totalGtRewards: entry.gtRewards,
        totalRewardsUsd: entry.rewardsUsd,
        totalManualRewardsUsd: entry.manualRewardsUsd,
        avgEffectiveRewardsRatio: entry.effectiveRewardsRatio,
      },
      error: auditMock.error,
      loading: false,
      isValidating: false,
    };
  },
}));

vi.mock("domain/synthetics/incentives/v2/useAccountIncentiveStatus", () => ({
  useAccountIncentiveStatus: () => ({
    data: {
      account: ACCOUNT,
      multiplier: 200n,
      volumeTier: "Tier2",
      stakingTier: "Tier1",
      projectedVolumeTier: "Tier3",
      projectedStakingTier: "Tier2",
      epochTimestamp: 1_784_073_600,
      tradingVolume: 50_000n * PRECISION,
      tierVolume: 40_000n * PRECISION,
      referralVolume: 5_000n * PRECISION,
      currentStakedBalance: 25n * GMX_UNIT,
      boostIds: ["LifetimeTrading"],
      esGmxRewards: 12n * GMX_UNIT,
      gtRewards: 3n * GT_UNIT,
      rewardsUsd: 30n * PRECISION,
      manualRewardCapUsd: 100n * PRECISION,
      manualRewardConsumedUsd: 40n * PRECISION,
      manualRewardRemainingUsd: 60n * PRECISION,
    },
    error: statusMock.error,
    loading: false,
  }),
}));

import { IncentivesAuditDetail } from "../IncentivesAuditDetail";
import { IncentivesAuditList } from "../IncentivesAuditList";

const config = {
  epochTimestamp: 1_784_073_600,
  epochDuration: 604_800,
  multiplierDecimals: 100n,
} as IncentivesConfig;
const epochs = [{ timestamp: config.epochTimestamp, label: "Current epoch" }];

function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider i18n={i18n}>
      <MemoryRouter>{children}</MemoryRouter>
    </I18nProvider>
  );
}

i18n.load({ en: {} });
i18n.activate("en");

describe("Incentives V2 audit pages", () => {
  beforeEach(() => {
    auditMock.params.length = 0;
    auditMock.error = undefined;
    statusMock.error = undefined;
  });

  afterEach(cleanup);

  it("queries an epoch and displays V2 diagnostic fields without V1 points metrics", () => {
    const onEpochChange = vi.fn();
    const onAccountClick = vi.fn();

    render(
      <TestProviders>
        <IncentivesAuditList
          chainId={ARBITRUM}
          config={config}
          selectedEpoch={config.epochTimestamp}
          epochs={epochs}
          onEpochChange={onEpochChange}
          onAccountClick={onAccountClick}
        />
      </TestProviders>
    );

    expect(auditMock.params.at(-1)).toMatchObject({
      where: { epochTimestamp: config.epochTimestamp },
      orderBy: "rewardsUsd_DESC",
      limit: 20,
      offset: 0,
    });
    expect(screen.getByRole("columnheader", { name: "Eligible fees" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Manual reward subset USD" })).toBeTruthy();
    expect(screen.getAllByText("12.00%")).toHaveLength(2);
    expect(screen.queryByText("Points")).toBeNull();
    expect(screen.queryByText(/Points Ratio/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: ACCOUNT }));
    expect(onAccountClick).toHaveBeenCalledWith(ACCOUNT);

    fireEvent.change(screen.getByLabelText("Epoch"), { target: { value: "all" } });
    expect(onEpochChange).toHaveBeenCalledWith("all");

    fireEvent.change(screen.getByPlaceholderText("Account address"), { target: { value: ACCOUNT } });
    fireEvent.click(screen.getByRole("button", { name: "Inspect account" }));
    expect(onAccountClick).toHaveBeenLastCalledWith(ACCOUNT);
  });

  it("shows current V2 account state and per-epoch reward diagnostics", () => {
    render(
      <TestProviders>
        <IncentivesAuditDetail chainId={ARBITRUM} account={ACCOUNT} config={config} onBack={vi.fn()} />
      </TestProviders>
    );

    expect(auditMock.params.at(-1)).toMatchObject({
      where: { account: ACCOUNT },
      orderBy: "epochTimestamp_DESC",
      limit: 1000,
    });
    expect(screen.getByText("Current indexed account snapshot")).toBeTruthy();
    expect(screen.getByText("2x")).toBeTruthy();
    expect(screen.getAllByText("Tier2 · Certified")).toHaveLength(2);
    expect(screen.getByText("Per-epoch diagnostic audit")).toBeTruthy();
    expect(screen.getAllByText("FeaturedMarkets, LifetimeTrading").length).toBeGreaterThan(0);
    expect(screen.getByText("Current esGMX")).toBeTruthy();
    expect(screen.getByText("Current GT")).toBeTruthy();
    expect(screen.getByText("Indexed manual reward consumed")).toBeTruthy();
    expect(screen.queryByText(/4mo/i)).toBeNull();
    expect(screen.queryByText(/Points/)).toBeNull();
  });

  it("rejects an invalid account without enabling an audit request", () => {
    render(
      <TestProviders>
        <IncentivesAuditDetail chainId={ARBITRUM} account="not-an-address" config={config} onBack={vi.fn()} />
      </TestProviders>
    );

    expect(screen.getByText("This is not a valid Ethereum address.")).toBeTruthy();
    expect(auditMock.params.at(-1)).toMatchObject({
      where: { account: "not-an-address" },
      enabled: false,
    });
    expect(screen.queryByText("Current indexed account snapshot")).toBeNull();
  });

  it("warns when cached detail data cannot be refreshed", () => {
    auditMock.error = new Error("audit refresh failed");
    statusMock.error = new Error("status refresh failed");

    render(
      <TestProviders>
        <IncentivesAuditDetail chainId={ARBITRUM} account={ACCOUNT} config={config} onBack={vi.fn()} />
      </TestProviders>
    );

    expect(
      screen.getByText("The account snapshot could not be refreshed. Showing the latest loaded snapshot.")
    ).toBeTruthy();
    expect(screen.getByText("Audit history could not be refreshed. Showing the latest loaded history.")).toBeTruthy();
  });
});
