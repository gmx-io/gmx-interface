import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IncentiveAccountEpochAuditEntry, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { downloadFile } from "lib/csv";

const EPOCH = 1_788_307_200;
const PREVIOUS_EPOCH = EPOCH - 604_800;
const config: IncentivesConfig = {
  epochTimestamp: EPOCH,
  epochStartTimestamp: PREVIOUS_EPOCH,
  programStartTimestamp: PREVIOUS_EPOCH,
  epochDuration: 604_800,
  maxMultiplier: 1000n,
  multiplierDecimals: 100n,
  volumeTierPersistenceEpochs: 4,
  feeShareFactor: 0n,
  esGmxShareFactor: 0n,
  gtShareFactor: 0n,
  referralRewardShareFactor: 0n,
  volumeTiers: [{ tier: "Tier1", threshold: 0n, multiplier: 100n }],
  stakingTiers: [],
  boosts: [],
  featuredMarketTokens: [],
  downgradingFactors: [],
  balancingTradesThreshold: 0n,
  lifetimeVolumeThreshold: 0n,
  manualAllocationTiers: [],
};
const entries = Array.from({ length: 21 }, (_, index) => ({
  id: String(index),
  account: `0x${index.toString(16).padStart(40, "0")}`,
  epochTimestamp: EPOCH,
  avgStakedGmx: index === 0 ? 0n : 1234567890123456789n,
  esGmxRewards: 1_000_000_000_000_000_001n,
  gtRewards: 10_000_001n,
  fees: 10n ** 30n,
  tierVolume: 2n * 10n ** 30n,
  referralVolume: 0n,
  volumeTier: "Tier1",
  stakingTier: null,
  avgMultiplier: 175,
})) as IncentiveAccountEpochAuditEntry[];
const auditState = vi.hoisted(() => ({
  error: undefined as Error | undefined,
  isValidating: false,
  lastEpoch: undefined as number | undefined,
}));

vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: 42161 }) }));
vi.mock("lib/csv", async (importOriginal) => ({
  ...(await importOriginal<typeof import("lib/csv")>()),
  downloadFile: vi.fn(),
}));
vi.mock("components/AppPageLayout/AppPageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("components/PageTitle/PageTitle", () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("components/TableScrollFade/TableScrollFade", () => ({
  TableScrollFadeContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("components/AddressView/AddressView", () => ({
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));
vi.mock("domain/synthetics/incentives/v2/useIncentivesConfig", () => ({
  useIncentivesConfig: () => ({ data: config }),
}));
vi.mock("domain/synthetics/incentives/v2/useIncentiveEpochAudit", () => ({
  useIncentiveEpochAudit: (_chainId: number, epoch: number) => {
    auditState.lastEpoch = epoch;
    return {
      data:
        epoch === EPOCH
          ? {
              entries,
              totalFees: 21n * 10n ** 30n,
            }
          : undefined,
      error: auditState.error,
      isValidating: auditState.isValidating,
      mutate: vi.fn().mockResolvedValue(undefined),
    };
  },
}));

import { IncentivesDistributionPage } from "../IncentivesDistributionPage";

function TestPage() {
  return (
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <IncentivesDistributionPage />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("IncentivesDistributionPage", () => {
  beforeEach(() => {
    i18n.load("en", {});
    i18n.activate("en");
    auditState.error = undefined;
    auditState.isValidating = false;
    vi.mocked(downloadFile).mockClear();
  });
  afterEach(cleanup);

  it("shows two basic columns and total fees for all accounts, and exports beyond the visible page", () => {
    render(<TestPage />);

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Wallet", "esGMX"]);
    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(screen.getByText("Total eligible fees (USD)").parentElement?.textContent).toContain("21.00");
    expect(screen.queryByText(entries[20].account)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    const [filename, csv] = vi.mocked(downloadFile).mock.calls[0];
    expect(filename).toBe(`incentives-42161-${EPOCH}.csv`);
    expect(String(csv).trim().split("\r\n")).toHaveLength(22);
    expect(csv).toContain(`${entries[20].account},1.000000000000000001\r\n`);
  });

  it.each([
    { name: "the newly selected epoch is loading", selectPreviousEpoch: true },
    { name: "cached data has an error", error: new Error("Incomplete epoch") },
    { name: "cached data is refreshing", isValidating: true },
  ])("disables exports while $name", ({ selectPreviousEpoch, error, isValidating }) => {
    auditState.error = error;
    auditState.isValidating = Boolean(isValidating);
    render(<TestPage />);
    if (selectPreviousEpoch) {
      fireEvent.change(screen.getByRole("combobox"), { target: { value: String(PREVIOUS_EPOCH) } });
      expect(auditState.lastEpoch).toBe(PREVIOUS_EPOCH);
    }

    const button = screen.getByRole("button", { name: "Download CSV" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(downloadFile).not.toHaveBeenCalled();
    expect(screen.queryByText(entries[0].account)).toBeNull();
  });
});
