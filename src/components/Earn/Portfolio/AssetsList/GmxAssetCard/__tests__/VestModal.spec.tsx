import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import useVestingData from "domain/vesting/useVestingData";
import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
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
    isDisabled,
    children,
  }: {
    topLeftLabel: React.ReactNode;
    topRightLabel?: React.ReactNode;
    topRightValue?: React.ReactNode;
    inputValue: string;
    isDisabled?: boolean;
    children: React.ReactNode;
  }) => (
    <div>
      <span>{topLeftLabel}</span>
      {topRightLabel ? (
        <span>
          {topRightLabel}: {topRightValue}
        </span>
      ) : null}
      <input aria-label={String(topLeftLabel)} value={inputValue} disabled={isDisabled} readOnly />
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
  affiliateVesterClaimable: units(12),
  affiliateVesterClaimSum: units(180),
  affiliateVesterVestedAmount: units(900),
};

function renderModal(vestingData = baseVestingData) {
  mockUseVestingData.mockReturnValue(vestingData as ReturnType<typeof useVestingData>);

  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <VestModal isVisible setIsVisible={vi.fn()} />
      </MemoryRouter>
    </I18nProvider>
  );
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
    mockUseChainId.mockReturnValue({ chainId: ARBITRUM, srcChainId: ARBITRUM } as ReturnType<typeof useChainId>);
    mockUseWallet.mockReturnValue({
      account: ACCOUNT,
      active: true,
      signer,
    } as unknown as ReturnType<typeof useWallet>);
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
      "Rewards vault",
      "Legacy vault",
      "GMX vault",
      "Affiliate vault",
    ]);
    expect(screen.getByRole("tab", { name: "Rewards vault" }).getAttribute("aria-selected")).toBe("true");
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

    selectVault("Legacy vault");

    expect(screen.getByRole("tab", { name: "Legacy vault" }).getAttribute("aria-selected")).toBe("true");
    expect(view.container.querySelector('[data-qa="vesting-legacy-vault"]')).not.toBeNull();
    expect(view.container.querySelector('[data-qa="vesting-rewards-vault"]')).toBeNull();
    expect((screen.getByRole("button", { name: "Coming soon" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("Deposits are closed.")).toBeNull();
  });

  it.each([
    {
      tab: "GMX vault",
      contractName: "GmxVester",
      contractAddress: GMX_VESTER,
      status: "95.0000 / 300.0000",
      claimable: "3.0000 GMX",
      returned: "205.0000 esGMX",
    },
    {
      tab: "Affiliate vault",
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
      expect(normalizedText(alert)).toContain("This vault is being retired");
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

  it("disables retirement withdrawal for a zero position", () => {
    renderModal({
      ...baseVestingData,
      gmxVesterClaimable: 0n,
      gmxVesterClaimSum: 0n,
      gmxVesterVestedAmount: 0n,
    });
    selectVault("GMX vault");

    const statusRow = screen.getByTestId("progress-row");
    expect(normalizedText(statusRow)).toContain("0.0000 / 0.0000");
    expect(screen.getByText("0.0000 GMX")).toBeDefined();
    expect(screen.getByText("0.0000 esGMX")).toBeDefined();
    expect((screen.getByRole("button", { name: "No funds to withdraw" }) as HTMLButtonElement).disabled).toBe(true);
    expect(mockCallContract).not.toHaveBeenCalled();
  });
});
