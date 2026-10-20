import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
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

vi.mock("components/SwitchToSettlementChain/SwitchToSettlementChainButtons", () => ({
  SwitchToSettlementChainButtons: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("components/SwitchToSettlementChain/SwitchToSettlementChainWarning", () => ({
  SwitchToSettlementChainWarning: () => <div data-testid="settlement-chain-warning" />,
}));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const GMX_VESTER = "0x1111111111111111111111111111111111111111";
const AFFILIATE_VESTER = "0x2222222222222222222222222222222222222222";
const VESTERS: Record<string, string> = { GmxVester: GMX_VESTER, AffiliateVester: AFFILIATE_VESTER };
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

function renderModal() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <VestModal isVisible setIsVisible={vi.fn()} processedData={baseProcessedData} reservedAmount={units(600)} />
      </MemoryRouter>
    </I18nProvider>
  );
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

  it.each([
    { vault: "GMX Vault", action: "Stop vesting & withdraw", method: "withdraw", contractName: "GmxVester" },
    {
      vault: "Affiliate Vault",
      action: "Stop vesting & withdraw",
      method: "withdraw",
      contractName: "AffiliateVester",
    },
    { vault: "GMX Vault", action: "Claim GMX", method: "claim", contractName: "GmxVester" },
    { vault: "Affiliate Vault", action: "Claim GMX", method: "claim", contractName: "AffiliateVester" },
  ])("$action in $vault calls $contractName.$method", async ({ vault, action, method, contractName }) => {
    renderModal();
    selectVault(vault);
    fireEvent.click(screen.getByRole("button", { name: action }));

    await waitFor(() => {
      expect(contractMocks.Constructor).toHaveBeenCalledWith(VESTERS[contractName], abis.Vester, signer);
      expect(mockCallContract).toHaveBeenCalledWith(
        ARBITRUM,
        contractMocks.instance,
        method,
        [],
        expect.objectContaining({ setPendingTxns })
      );
    });
    expect(mockGetContract).toHaveBeenCalledWith(ARBITRUM, contractName);
    expect(mockCallContract).toHaveBeenCalledTimes(1);
  });
});
