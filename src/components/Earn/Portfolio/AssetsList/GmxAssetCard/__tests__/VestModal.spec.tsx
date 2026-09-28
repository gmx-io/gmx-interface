import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE } from "config/chains";
import { getContract } from "config/contracts";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import useVestingData from "domain/vesting/useVestingData";
import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
import type { StakingProcessedData } from "lib/legacy";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";

import { VestModal } from "../VestModal";

const contractMocks = vi.hoisted(() => {
  const instance = { name: "vester-contract" };
  const Constructor = vi.fn(function Contract() {
    return instance;
  });

  return { Constructor, instance };
});

vi.mock("ethers", () => ({
  ethers: {
    Contract: contractMocks.Constructor,
  },
}));

vi.mock("config/contracts", () => ({
  getContract: vi.fn(),
}));

vi.mock("context/ConnectModalContext/ConnectModalContext", () => ({
  useConnectModal: vi.fn(),
}));

vi.mock("context/PendingTxnsContext/PendingTxnsContext", () => ({
  usePendingTxns: vi.fn(),
}));

vi.mock("domain/vesting/useVestingData", () => ({
  default: vi.fn(),
}));

vi.mock("lib/chains", () => ({
  useChainId: vi.fn(),
}));

vi.mock("lib/contracts", () => ({
  callContract: vi.fn(),
}));

vi.mock("lib/useHasOutdatedUi", () => ({
  getPageOutdatedError: vi.fn(() => "Page is outdated"),
  useHasOutdatedUi: vi.fn(),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: vi.fn(),
}));

vi.mock("sdk/abis", () => ({
  abis: {
    Vester: ["vester-abi"],
  },
}));

vi.mock("components/Modal/Modal", () => ({
  default: ({
    isVisible,
    label,
    children,
  }: {
    isVisible: boolean;
    label: React.ReactNode;
    children: React.ReactNode;
  }) =>
    isVisible ? (
      <section role="dialog" aria-label={String(label)}>
        {children}
      </section>
    ) : null,
}));

vi.mock("components/Tabs/Tabs", () => ({
  default: ({
    options,
    selectedValue,
    onChange,
  }: {
    options: { value: string; label: React.ReactNode }[];
    selectedValue: string;
    onChange: (value: string) => void;
  }) => (
    <div role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={selectedValue === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("components/BuyInputSection/BuyInputSection", () => ({
  default: ({
    topLeftLabel,
    topRightLabel,
    topRightValue,
    inputValue,
    onInputValueChange,
    onClickMax,
    isDisabled,
    children,
  }: {
    topLeftLabel: React.ReactNode;
    topRightLabel?: React.ReactNode;
    topRightValue?: React.ReactNode;
    inputValue: string;
    onInputValueChange?: React.ChangeEventHandler<HTMLInputElement>;
    onClickMax?: () => void;
    isDisabled?: boolean;
    children: React.ReactNode;
  }) => (
    <div>
      <span>{topLeftLabel}</span>
      {topRightLabel ? (
        <button type="button" aria-label={String(topRightLabel)} onClick={onClickMax} disabled={!onClickMax}>
          <span>
            {topRightLabel}: {topRightValue}
          </span>
        </button>
      ) : null}
      <input
        aria-label={String(topLeftLabel)}
        value={inputValue}
        onChange={onInputValueChange}
        disabled={isDisabled}
        readOnly={!onInputValueChange}
      />
      {children}
    </div>
  ),
}));

vi.mock("components/AlertInfo/AlertInfoCard", () => ({
  AlertInfoCard: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
}));

vi.mock("components/ProgressRow/ProgressRow", () => ({
  ProgressRow: ({ label, value }: { label: React.ReactNode; value: React.ReactNode }) => (
    <div data-testid="progress-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock("components/SyntheticsInfoRow", () => ({
  SyntheticsInfoRow: ({ label, value }: { label: React.ReactNode; value: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock("components/SwitchToSettlementChain/SwitchToSettlementChainButtons", () => ({
  SwitchToSettlementChainButtons: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("components/SwitchToSettlementChain/SwitchToSettlementChainWarning", () => ({
  SwitchToSettlementChainWarning: () => <div data-testid="settlement-chain-warning" />,
}));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const GMX_VESTER = "0x1111111111111111111111111111111111111111";
const AFFILIATE_VESTER = "0x2222222222222222222222222222222222222222";
const signer = { name: "signer" };
const setPendingTxns = vi.fn();

const mockGetContract = vi.mocked(getContract);
const mockUseConnectModal = vi.mocked(useConnectModal);
const mockUsePendingTxns = vi.mocked(usePendingTxns);
const mockUseVestingData = vi.mocked(useVestingData);
const mockUseChainId = vi.mocked(useChainId);
const mockCallContract = vi.mocked(callContract);
const mockUseHasOutdatedUi = vi.mocked(useHasOutdatedUi);
const mockUseWallet = vi.mocked(useWallet);

const units = (value: number) => BigInt(value) * 10n ** 18n;

const baseVestingData = {
  gmxVesterClaimable: units(3),
  gmxVesterClaimSum: units(95),
  gmxVesterVestedAmount: units(300),
  gmxVesterMaxVestableAmount: units(1000),
  gmxVesterAverageStakedAmount: units(2000),
  affiliateVesterClaimable: units(12),
  affiliateVesterClaimSum: units(180),
  affiliateVesterVestedAmount: units(900),
  affiliateVesterMaxVestableAmount: units(1000),
};

const baseProcessedData = {
  esGmxBalance: units(500),
  bonusGmxInFeeGmx: units(4000),
} as StakingProcessedData;

function getModal(processedData = baseProcessedData) {
  return (
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <VestModal isVisible setIsVisible={vi.fn()} processedData={processedData} reservedAmount={units(600)} />
      </MemoryRouter>
    </I18nProvider>
  );
}

function renderModal(vestingData = baseVestingData, processedData = baseProcessedData) {
  mockUseVestingData.mockReturnValue(vestingData as ReturnType<typeof useVestingData>);

  return render(getModal(processedData));
}

function selectChain(chainId: number) {
  mockUseChainId.mockReturnValue({ chainId, srcChainId: chainId } as ReturnType<typeof useChainId>);
  mockUseWallet.mockReturnValue({
    account: ACCOUNT,
    active: true,
    chainId,
    signer,
  } as unknown as ReturnType<typeof useWallet>);
}

function selectVault(name: string) {
  fireEvent.click(screen.getByRole("tab", { name }));
}

function normalizedText(element: HTMLElement) {
  return element.textContent?.replace(/\s+/g, " ").trim();
}

i18n.load({ en: {} });
i18n.activate("en");

describe("VestModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPendingTxns.mockReset();
    selectChain(ARBITRUM);
    mockUsePendingTxns.mockReturnValue({ pendingTxns: [], setPendingTxns });
    mockUseConnectModal.mockReturnValue({ openConnectModal: vi.fn(), connectModalOpen: false });
    mockUseHasOutdatedUi.mockReturnValue(false);
    mockUseVestingData.mockReturnValue(baseVestingData as ReturnType<typeof useVestingData>);
    mockGetContract.mockImplementation((_chainId, contractName) => {
      if (contractName === "GmxVester") return GMX_VESTER;
      if (contractName === "AffiliateVester") return AFFILIATE_VESTER;
      throw new Error(`Unexpected contract: ${contractName}`);
    });
    mockCallContract.mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it("shows the four ordered vaults and defaults to disabled Rewards Vault controls", () => {
    const view = renderModal();
    const tabs = screen.getAllByRole("tab");

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Rewards Vault",
      "Legacy Vault",
      "GMX Vault",
      "Affiliate Vault",
    ]);
    expect(screen.getByRole("tab", { name: "Rewards Vault" }).getAttribute("aria-selected")).toBe("true");
    expect(view.container.querySelector('[data-qa="vesting-rewards-vault"]')).not.toBeNull();
    expect(
      screen.getByText((_content, element) => element?.tagName === "SPAN" && element.textContent === "Max: —")
    ).toBeDefined();
    expect((screen.getByRole("textbox", { name: "Deposit" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Coming soon" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Claim GMX" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Stop vesting" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("Deposits are closed.")).toBeNull();
  });

  it("switches to the disabled Legacy Vault panel", () => {
    const view = renderModal();

    selectVault("Legacy Vault");

    expect(screen.getByRole("tab", { name: "Legacy Vault" }).getAttribute("aria-selected")).toBe("true");
    expect(view.container.querySelector('[data-qa="vesting-legacy-vault"]')).not.toBeNull();
    expect(view.container.querySelector('[data-qa="vesting-rewards-vault"]')).toBeNull();
    expect((screen.getByRole("button", { name: "Coming soon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("Deposits are closed.")).toBeNull();
  });

  it.each([
    {
      tab: "GMX Vault",
      contractName: "GmxVester",
      contractAddress: GMX_VESTER,
      status: "95.0000 / 300.0000",
      claimable: "3.0000 GMX",
      returned: "205.0000 esGMX",
    },
    {
      tab: "Affiliate Vault",
      contractName: "AffiliateVester",
      contractAddress: AFFILIATE_VESTER,
      status: "180.0000 / 900.0000",
      claimable: "12.0000 GMX",
      returned: "720.0000 esGMX",
    },
  ])(
    "shows formatted retirement details and withdraws through $contractName for $tab",
    async ({ tab, contractName, contractAddress, status, claimable, returned }) => {
      renderModal();
      selectVault(tab);

      const alert = screen.getByRole("alert");
      expect(normalizedText(alert)).toContain("Deposits are closed.");
      expect(normalizedText(alert)).toContain("Existing vests will remain active");
      expect(normalizedText(alert)).toContain("you can claim vested GMX at any time");
      expect(normalizedText(alert)).toContain("cannot be returned for vesting");
      expect(screen.queryByRole("textbox", { name: "Deposit" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Coming soon" })).toBeNull();

      const statusRow = screen.getByTestId("progress-row");
      expect(within(statusRow).getByText("Vesting status")).toBeDefined();
      expect(normalizedText(statusRow)).toContain(status);
      expect(screen.getByText(claimable)).toBeDefined();
      expect(screen.getByText(returned)).toBeDefined();

      const withdrawButton = screen.getByRole("button", { name: "Stop vesting & withdraw" });
      expect((withdrawButton as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(withdrawButton);

      await waitFor(() => {
        expect(mockGetContract).toHaveBeenCalledWith(ARBITRUM, contractName);
        expect(contractMocks.Constructor).toHaveBeenCalledWith(contractAddress, abis.Vester, signer);
        expect(mockCallContract).toHaveBeenCalledWith(
          ARBITRUM,
          contractMocks.instance,
          "withdraw",
          [],
          expect.objectContaining({
            sentMsg: "Withdraw submitted",
            failMsg: "Withdraw failed",
            successMsg: "Withdrawn",
            setPendingTxns,
          })
        );
      });
    }
  );

  it.each([
    { tab: "GMX Vault", contractAddress: GMX_VESTER },
    { tab: "Affiliate Vault", contractAddress: AFFILIATE_VESTER },
  ])("claims vested GMX from $tab without withdrawing the position", async ({ tab, contractAddress }) => {
    renderModal();
    selectVault(tab);
    fireEvent.click(screen.getByRole("button", { name: "Claim GMX" }));

    await waitFor(() => {
      expect(contractMocks.Constructor).toHaveBeenCalledWith(contractAddress, abis.Vester, signer);
      expect(mockCallContract).toHaveBeenCalledWith(
        ARBITRUM,
        contractMocks.instance,
        "claim",
        [],
        expect.objectContaining({ sentMsg: "Claim submitted", successMsg: "Claimed", setPendingTxns })
      );
    });
    expect(mockCallContract).toHaveBeenCalledTimes(1);
  });

  it("disables retirement withdrawal for a zero position", () => {
    renderModal({
      ...baseVestingData,
      gmxVesterClaimable: 0n,
      gmxVesterClaimSum: 0n,
      gmxVesterVestedAmount: 0n,
    });
    selectVault("GMX Vault");

    const statusRow = screen.getByTestId("progress-row");
    expect(normalizedText(statusRow)).toContain("0.0000 / 0.0000");
    expect(screen.getByText("0.0000 GMX")).toBeDefined();
    expect(screen.getByText("0.0000 esGMX")).toBeDefined();
    expect((screen.getByRole("button", { name: "No funds to withdraw" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Claim GMX" }) as HTMLButtonElement).disabled).toBe(true);
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  describe("Avalanche vesting", () => {
    beforeEach(() => selectChain(AVALANCHE));

    it("keeps the release vaults and deposit actions available", () => {
      renderModal();

      expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
        "GMX vault",
        "Affiliate vault",
        "Deposit",
        "Withdraw",
      ]);
      expect(screen.getByRole("tab", { name: "GMX vault" }).getAttribute("aria-selected")).toBe("true");
      expect((screen.getByRole("textbox", { name: "Deposit" }) as HTMLInputElement).disabled).toBe(false);
      expect(screen.queryByText("Deposits are closed.")).toBeNull();
      expect(screen.queryByText("Coming soon")).toBeNull();
    });

    it.each([
      { tab: "GMX vault", contractName: "GmxVester", contractAddress: GMX_VESTER, max: "500" },
      { tab: "Affiliate vault", contractName: "AffiliateVester", contractAddress: AFFILIATE_VESTER, max: "100" },
    ])("preserves the deposit limit and contract for $tab", async ({ tab, contractName, contractAddress, max }) => {
      renderModal();
      selectVault(tab);
      fireEvent.click(screen.getByRole("button", { name: "Max" }));
      const input = screen.getByRole("textbox", { name: "Deposit" }) as HTMLInputElement;
      expect(input.value).toBe(max);

      fireEvent.change(input, { target: { value: "25" } });
      if (tab === "GMX vault") {
        const reserveRow = screen
          .getAllByTestId("progress-row")
          .find((row) => row.textContent?.includes("Staked tokens reserved for vesting"))!;
        expect(normalizedText(reserveRow)).toContain("650.0000 / 4,000.0000");
      }
      fireEvent.click(screen.getByRole("button", { name: "Deposit" }));

      await waitFor(() => {
        expect(mockGetContract).toHaveBeenCalledWith(AVALANCHE, contractName);
        expect(contractMocks.Constructor).toHaveBeenCalledWith(contractAddress, abis.Vester, signer);
        expect(mockCallContract).toHaveBeenCalledWith(
          AVALANCHE,
          contractMocks.instance,
          "deposit",
          [units(25)],
          expect.objectContaining({ sentMsg: "Deposit submitted", successMsg: "Deposited", setPendingTxns })
        );
      });
    });

    it.each([
      { tab: "GMX vault", amount: "501" },
      { tab: "Affiliate vault", amount: "101" },
    ])("prevents deposits above the available balance or capacity in $tab", ({ tab, amount }) => {
      renderModal();
      selectVault(tab);
      fireEvent.change(screen.getByRole("textbox", { name: "Deposit" }), { target: { value: amount } });

      expect((screen.getByRole("button", { name: "Max amount exceeded" }) as HTMLButtonElement).disabled).toBe(true);
      expect(mockCallContract).not.toHaveBeenCalled();
    });

    it("keeps the historical collateral requirement for GMX deposits", () => {
      renderModal(baseVestingData, { ...baseProcessedData, bonusGmxInFeeGmx: units(700) });
      fireEvent.change(screen.getByRole("textbox", { name: "Deposit" }), { target: { value: "60" } });

      expect((screen.getByRole("button", { name: "Insufficient staked tokens" }) as HTMLButtonElement).disabled).toBe(
        true
      );
      expect(mockCallContract).not.toHaveBeenCalled();
    });

    it.each([
      { tab: "GMX vault", contractAddress: GMX_VESTER, amount: "205.0000", action: "Withdraw and unreserve GMX" },
      { tab: "Affiliate vault", contractAddress: AFFILIATE_VESTER, amount: "720.0000", action: "Confirm withdraw" },
    ])("preserves withdrawals from $tab", async ({ tab, contractAddress, amount, action }) => {
      renderModal();
      selectVault(tab);
      fireEvent.click(screen.getByRole("tab", { name: "Withdraw" }));
      expect((screen.getByRole("textbox", { name: "Withdraw" }) as HTMLInputElement).value).toBe(amount);
      fireEvent.click(screen.getByRole("button", { name: action }));

      await waitFor(() => {
        expect(contractMocks.Constructor).toHaveBeenCalledWith(contractAddress, abis.Vester, signer);
        expect(mockCallContract).toHaveBeenCalledWith(
          AVALANCHE,
          contractMocks.instance,
          "withdraw",
          [],
          expect.objectContaining({ setPendingTxns })
        );
      });
    });

    it("preserves the affiliate claim action", async () => {
      renderModal();
      selectVault("Affiliate vault");
      fireEvent.click(screen.getByRole("tab", { name: "Claim" }));
      expect((screen.getByRole("textbox", { name: "Claim" }) as HTMLInputElement).value).toBe("12.0000");
      fireEvent.click(screen.getByRole("button", { name: "Claim" }));

      await waitFor(() => {
        expect(contractMocks.Constructor).toHaveBeenCalledWith(AFFILIATE_VESTER, abis.Vester, signer);
        expect(mockCallContract).toHaveBeenCalledWith(
          AVALANCHE,
          contractMocks.instance,
          "claim",
          [],
          expect.objectContaining({ setPendingTxns })
        );
      });
    });

    it.each([ARBITRUM, ARBITRUM_SEPOLIA])("switches vault workflows when changing to chain %s and back", (chainId) => {
      const view = renderModal();
      selectVault("Affiliate vault");
      fireEvent.change(screen.getByRole("textbox", { name: "Deposit" }), { target: { value: "25" } });

      selectChain(chainId);
      view.rerender(getModal());
      expect(screen.getByRole("tab", { name: "Rewards Vault" }).getAttribute("aria-selected")).toBe("true");
      expect(screen.queryByRole("tab", { name: "Deposit" })).toBeNull();

      selectChain(AVALANCHE);
      view.rerender(getModal());
      expect(screen.getByRole("tab", { name: "GMX vault" }).getAttribute("aria-selected")).toBe("true");
      expect((screen.getByRole("textbox", { name: "Deposit" }) as HTMLInputElement).value).toBe("");
      expect(screen.queryByRole("tab", { name: "Rewards Vault" })).toBeNull();
    });
  });
});
