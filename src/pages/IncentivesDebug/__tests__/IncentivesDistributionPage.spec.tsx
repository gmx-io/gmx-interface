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
  previousEpochLoaded: false,
  stakingMissing: false,
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
              entries: auditState.stakingMissing
                ? entries.map((entry, index) => (index === 1 ? { ...entry, avgStakedGmx: null } : entry))
                : entries,
              totalFees: 21n * 10n ** 30n,
            }
          : auditState.previousEpochLoaded
            ? { entries: [], totalFees: 0n }
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
    auditState.previousEpochLoaded = false;
    auditState.stakingMissing = false;
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

  it("switches the table and CSV together to the detailed columns", () => {
    render(<TestPage />);
    fireEvent.click(screen.getByRole("button", { name: "Show detailed data" }));

    expect(screen.getAllByRole("columnheader")).toHaveLength(10);
    expect(screen.getByRole("columnheader", { name: "Eligible fees (USD)" })).toBeTruthy();
    expect(screen.getAllByRole("cell", { name: "1.75×" })).toHaveLength(20);
    expect(screen.getByRole("columnheader", { name: "Staking (GMX, average)" })).toBeTruthy();
    expect(screen.queryByText(/Average GMX staking is not available/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(vi.mocked(downloadFile).mock.calls[0][0]).toBe(`incentives-42161-${EPOCH}-detailed.csv`);
    expect(vi.mocked(downloadFile).mock.calls[0][1]).toContain("eligible_fees_usd\r\n");
  });

  it("marks unsynced average staking as missing while keeping known zero balances", () => {
    auditState.stakingMissing = true;
    render(<TestPage />);
    fireEvent.click(screen.getByRole("button", { name: "Show detailed data" }));

    expect(screen.getByText(/Average GMX staking is not available for every wallet yet/)).toBeTruthy();
    const rows = screen.getAllByRole("row");
    expect(rows[1].children[5].textContent).toBe("0.0000");
    expect(rows[2].children[5].textContent).toBe("—");
    expect(rows[3].children[5].textContent).toBe("1.2346");

    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    const csv = String(vi.mocked(downloadFile).mock.calls[0][1]).split("\r\n");
    expect(csv[1].split(",")[5]).toBe("0");
    expect(csv[2].split(",")[5]).toBe("");
    expect(csv[3].split(",")[5]).toBe("1.234567890123456789");
  });

  it("disables exporting the old epoch while the newly selected epoch is loading", () => {
    const { rerender } = render(<TestPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: String(PREVIOUS_EPOCH) } });

    expect(auditState.lastEpoch).toBe(PREVIOUS_EPOCH);
    expect(screen.queryByText(entries[0].account)).toBeNull();
    expect((screen.getByRole("button", { name: "Download CSV" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(downloadFile).not.toHaveBeenCalled();

    auditState.previousEpochLoaded = true;
    rerender(<TestPage />);
    expect(screen.getByText("No audit entries found for this epoch.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(vi.mocked(downloadFile).mock.calls[0][1]).toBe("wallet,esGMX\r\n");
  });

  it.each(["error", "refresh"])("disables exports when cached data has an %s", (state) => {
    if (state === "error") auditState.error = new Error("Incomplete epoch");
    else auditState.isValidating = true;

    render(<TestPage />);

    expect((screen.getByRole("button", { name: "Download CSV" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(downloadFile).not.toHaveBeenCalled();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
