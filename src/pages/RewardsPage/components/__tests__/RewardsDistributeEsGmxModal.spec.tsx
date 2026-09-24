import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA } from "config/chains";
import { getContract } from "config/contracts";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import {
  getEsGmxDistributionError,
  getEsGmxIssuerFunding,
  getUnusedEsGmxDistributionBatchIndex,
} from "domain/vesting/esGmxDistribution";
import { useChainId } from "lib/chains";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import useWallet from "lib/wallets/useWallet";

import { RewardsDistributeEsGmxModal } from "../RewardsDistributeEsGmxModal";

vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: vi.fn(function (address) {
        return { address };
      }),
    },
  };
});
vi.mock("domain/vesting/esGmxDistribution", () => ({
  getEsGmxDistributionError: vi.fn(),
  getEsGmxIssuerFunding: vi.fn(),
  getUnusedEsGmxDistributionBatchIndex: vi.fn(),
}));
vi.mock("context/IncentivesV2Context/IncentivesV2Context", () => ({ useIncentivesV2State: vi.fn() }));
vi.mock("lib/contracts", () => ({ callContract: vi.fn() }));
vi.mock("lib/wallets/useWallet", () => ({ default: vi.fn() }));
vi.mock("lib/chains", () => ({ useChainId: vi.fn() }));
vi.mock("lib/chains/getMultipleWalletExtensionsChainError", () => ({
  useMultipleWalletExtensionsChainError: vi.fn(),
}));
vi.mock("lib/useHasOutdatedUi", () => ({ useHasOutdatedUi: vi.fn(), getPageOutdatedError: () => "Outdated" }));
vi.mock("context/PendingTxnsContext/PendingTxnsContext", () => ({
  usePendingTxns: () => ({ setPendingTxns: vi.fn() }),
}));
vi.mock("context/ConnectModalContext/ConnectModalContext", () => ({
  useConnectModal: () => ({ openConnectModal: vi.fn() }),
}));
vi.mock("lib/helperToast", () => ({ helperToast: { info: vi.fn(), error: vi.fn() } }));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const wallet = { account: ACCOUNT, active: true, chainId: ARBITRUM_SEPOLIA, signer: {} };
const onDistributed = vi.fn();
const setIsVisible = vi.fn();
const mockCallContract = vi.mocked(callContract);
const config = {
  epochTimestamp: 1_789_736_400,
  epochDuration: 3_600,
  programStartTimestamp: 1_788_220_800,
} as IncentivesConfig;
const swrConfig = { provider: () => new Map() };

function mockConfig(next: IncentivesConfig | undefined = config) {
  vi.mocked(useIncentivesV2State).mockReturnValue({
    availability: next ? { status: "active", config: next, isStale: false } : { status: "loading" },
    isActive: Boolean(next),
    refreshConfig: vi.fn(),
  });
}

i18n.load({ en: {} });
i18n.activate("en");

function view(isVisible = true) {
  return (
    <I18nProvider i18n={i18n}>
      <SWRConfig value={swrConfig}>
        <RewardsDistributeEsGmxModal isVisible={isVisible} setIsVisible={setIsVisible} onDistributed={onDistributed} />
      </SWRConfig>
    </I18nProvider>
  );
}

function enterValidFields() {
  fireEvent.change(screen.getByRole("textbox", { name: "Epoch ID" }), { target: { value: "0" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Batch index" }), { target: { value: "0" } });
}

describe("Sepolia reward distribution modal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockConfig();
    vi.mocked(getEsGmxIssuerFunding).mockResolvedValue({ shortfall: 0n, walletBalance: 100n * 10n ** 18n });
    vi.mocked(getUnusedEsGmxDistributionBatchIndex).mockResolvedValue(0n);
    vi.mocked(useChainId).mockReturnValue({ chainId: ARBITRUM_SEPOLIA } as ReturnType<typeof useChainId>);
    vi.mocked(useWallet).mockReturnValue(wallet as ReturnType<typeof useWallet>);
    vi.mocked(useMultipleWalletExtensionsChainError).mockReturnValue({});
    vi.mocked(getEsGmxDistributionError).mockResolvedValue(undefined);
    mockCallContract.mockResolvedValue({ wait: vi.fn().mockResolvedValue(undefined) } as any);
    onDistributed.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it("defaults to the previous configured epoch and an unused batch without manual input", async () => {
    vi.mocked(getUnusedEsGmxDistributionBatchIndex).mockResolvedValue(4n);
    render(view());
    const previousEpoch = config.epochTimestamp - config.epochDuration;
    expect((screen.getByRole("textbox", { name: "Epoch ID" }) as HTMLInputElement).value).toBe(String(previousEpoch));
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: "Batch index" }) as HTMLInputElement).value).toBe("4")
    );
    fireEvent.click(screen.getByRole("button", { name: "Distribute esGMX" }));
    await waitFor(() =>
      expect(mockCallContract).toHaveBeenCalledWith(
        ARBITRUM_SEPOLIA,
        expect.anything(),
        "distributeEpoch",
        [BigInt(previousEpoch), 4n, [ACCOUNT], [100n * 10n ** 18n]],
        expect.anything()
      )
    );
  });

  it("fills the previous epoch when the configuration arrives", async () => {
    vi.mocked(useIncentivesV2State).mockReturnValue({
      availability: { status: "loading" },
      isActive: false,
      refreshConfig: vi.fn(),
    });
    const component = render(view());
    expect((screen.getByRole("textbox", { name: "Epoch ID" }) as HTMLInputElement).value).toBe("");
    expect(getUnusedEsGmxDistributionBatchIndex).not.toHaveBeenCalled();
    mockConfig();
    component.rerender(view());
    await waitFor(() =>
      expect(getUnusedEsGmxDistributionBatchIndex).toHaveBeenCalledWith(
        BigInt(config.epochTimestamp - config.epochDuration)
      )
    );
  });

  it("does not select an epoch before the program started", () => {
    mockConfig({ ...config, epochTimestamp: config.programStartTimestamp });
    render(view());
    expect((screen.getByRole("textbox", { name: "Epoch ID" }) as HTMLInputElement).value).toBe("");
    expect(getUnusedEsGmxDistributionBatchIndex).not.toHaveBeenCalled();
  });

  it("preserves edited values across config refreshes and resets defaults when reopened", async () => {
    const component = render(view());
    enterValidFields();
    fireEvent.change(screen.getByRole("textbox", { name: "Batch index" }), { target: { value: "9" } });
    const nextConfig = { ...config, epochTimestamp: config.epochTimestamp + config.epochDuration };
    mockConfig(nextConfig);
    component.rerender(view());
    expect((screen.getByRole("textbox", { name: "Epoch ID" }) as HTMLInputElement).value).toBe("0");
    expect((screen.getByRole("textbox", { name: "Batch index" }) as HTMLInputElement).value).toBe("9");
    component.rerender(view(false));
    vi.mocked(getUnusedEsGmxDistributionBatchIndex).mockResolvedValue(5n);
    component.rerender(view());
    expect((screen.getByRole("textbox", { name: "Epoch ID" }) as HTMLInputElement).value).toBe(
      String(config.epochTimestamp)
    );
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: "Batch index" }) as HTMLInputElement).value).toBe("5")
    );
  });

  it("refreshes the batch default when reopening the same epoch", async () => {
    const component = render(view());
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: "Batch index" }) as HTMLInputElement).value).toBe("0")
    );
    component.rerender(view(false));
    vi.mocked(getUnusedEsGmxDistributionBatchIndex).mockResolvedValue(1n);
    component.rerender(view());
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: "Batch index" }) as HTMLInputElement).value).toBe("1")
    );
    expect((screen.getByRole("textbox", { name: "Epoch ID" }) as HTMLInputElement).value).toBe(
      String(config.epochTimestamp - config.epochDuration)
    );
  });

  it("ignores stale batch suggestions after changing epoch or manually entering a batch", async () => {
    let resolve!: (value: bigint) => void;
    vi.mocked(getUnusedEsGmxDistributionBatchIndex)
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done;
          })
      )
      .mockResolvedValueOnce(3n);
    render(view());
    expect((screen.getByRole("button", { name: "Loading..." }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Epoch ID" }), { target: { value: "123" } });
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: "Batch index" }) as HTMLInputElement).value).toBe("3")
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Batch index" }), { target: { value: "8" } });
    await act(async () => resolve(1n));
    expect((screen.getByRole("textbox", { name: "Batch index" }) as HTMLInputElement).value).toBe("8");
    expect((screen.getByRole("textbox", { name: "Epoch ID" }) as HTMLInputElement).value).toBe("123");
  });

  it("does not assume batch zero is available when the lookup fails", async () => {
    vi.mocked(getUnusedEsGmxDistributionBatchIndex).mockRejectedValue(new Error("RPC unavailable"));
    render(view());
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Unable to check distribution details. Please try again.",
          }) as HTMLButtonElement
        ).disabled
      ).toBe(true)
    );
    expect((screen.getByRole("textbox", { name: "Batch index" }) as HTMLInputElement).value).toBe("");
    expect(mockCallContract).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "Batch index" }), { target: { value: "2" } });
    expect((screen.getByRole("button", { name: "Distribute esGMX" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("distributes the exact recipient and amount and refreshes only after confirmation", async () => {
    let confirm!: () => void;
    const wait = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          confirm = resolve;
        })
    );
    mockCallContract.mockResolvedValue({ wait } as any);
    render(view());
    const recipient = "0x0000000000000000000000000000000000000001";
    expect((screen.getByRole("textbox", { name: "Recipient address" }) as HTMLInputElement).value).toBe(ACCOUNT);
    enterValidFields();
    fireEvent.change(screen.getByRole("textbox", { name: "Batch index" }), { target: { value: "3" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Recipient address" }), { target: { value: recipient } });
    fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), { target: { value: "1.25" } });
    fireEvent.click(screen.getByRole("button", { name: "Distribute esGMX" }));
    await waitFor(() => expect(wait).toHaveBeenCalledTimes(1));
    expect(getEsGmxDistributionError).toHaveBeenCalledWith({
      sender: ACCOUNT,
      recipient,
      epochId: 0n,
      batchIndex: 3n,
      amount: 1_250_000_000_000_000_000n,
    });
    expect(mockCallContract).toHaveBeenCalledWith(
      ARBITRUM_SEPOLIA,
      { address: getContract(ARBITRUM_SEPOLIA, "EsGmxIssuer") },
      "distributeEpoch",
      [0n, 3n, [recipient], [1_250_000_000_000_000_000n]],
      expect.anything()
    );
    expect(onDistributed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirming..." }));
    expect(mockCallContract).toHaveBeenCalledTimes(1);
    await act(async () => confirm());
    expect(onDistributed).toHaveBeenCalledTimes(1);
    expect(setIsVisible).toHaveBeenCalledWith(false);
  });

  it.each([
    ["Recipient address", "0x0000000000000000000000000000000000000000", "Invalid recipient address"],
    ["Recipient address", "invalid", "Invalid recipient address"],
    ["Epoch ID", "", "Enter valid epoch and batch IDs"],
    ["Batch index", (2n ** 256n).toString(), "Enter valid epoch and batch IDs"],
    ["Amount", "0", "Enter an amount"],
  ])("rejects an invalid %s", (name, value, error) => {
    render(view());
    enterValidFields();
    fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
    const button = screen.getByRole("button", { name: error }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(getEsGmxDistributionError).not.toHaveBeenCalled();
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it.each([
    ["unauthorized", "This wallet cannot distribute rewards."],
    ["finalized", "This epoch is finalized."],
    ["usedIndex", "This batch index has already been used."],
    ["usedContent", "These rewards have already been distributed in this epoch."],
  ] as const)("shows the %s preflight error without requesting a signature", async (reason, message) => {
    vi.mocked(getEsGmxDistributionError).mockResolvedValue({ reason });
    render(view());
    enterValidFields();
    fireEvent.click(screen.getByRole("button", { name: "Distribute esGMX" }));
    await waitFor(() => expect(helperToast.error).toHaveBeenCalledWith(message));
    expect(mockCallContract).not.toHaveBeenCalled();
    expect(setIsVisible).not.toHaveBeenCalled();
  });

  it("sends only the displayed shortfall to the issuer and refreshes after confirmation", async () => {
    const shortfall = 1_250_000_000_000_000_000n;
    vi.mocked(getEsGmxIssuerFunding).mockResolvedValue({ shortfall, walletBalance: 100n * 10n ** 18n });
    let confirm!: () => void;
    const wait = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          confirm = resolve;
        })
    );
    mockCallContract.mockResolvedValue({ wait } as any);
    render(view());
    enterValidFields();
    const button = await screen.findByRole("button", { name: "Send 1.25 esGMX to issuer" });
    fireEvent.click(button);
    await waitFor(() => expect(wait).toHaveBeenCalledTimes(1));
    expect(mockCallContract).toHaveBeenCalledWith(
      ARBITRUM_SEPOLIA,
      { address: getContract(ARBITRUM_SEPOLIA, "IncentiveEsGmx") },
      "transfer",
      [getContract(ARBITRUM_SEPOLIA, "EsGmxIssuer"), shortfall],
      expect.anything()
    );
    expect((screen.getByRole("textbox", { name: "Amount" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Distribute esGMX" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Sending..." }));
    expect(mockCallContract).toHaveBeenCalledTimes(1);
    vi.mocked(getEsGmxIssuerFunding).mockResolvedValue({ shortfall: 0n, walletBalance: 100n * 10n ** 18n - shortfall });
    await act(async () => confirm());
    expect(screen.queryByRole("button", { name: /esGMX to issuer/ })).toBeNull();
    expect(setIsVisible).not.toHaveBeenCalled();
    expect(onDistributed).not.toHaveBeenCalled();
    expect(getEsGmxDistributionError).not.toHaveBeenCalled();
    expect((screen.getByRole("textbox", { name: "Amount" }) as HTMLInputElement).value).toBe("100");
    fireEvent.click(screen.getByRole("button", { name: "Distribute esGMX" }));
    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(2));
    expect(mockCallContract.mock.calls[1][2]).toBe("distributeEpoch");
  });

  it("disables sending when the wallet cannot cover the shortfall", async () => {
    vi.mocked(getEsGmxIssuerFunding).mockResolvedValue({ shortfall: 50n, walletBalance: 49n });
    render(view());
    const button = await screen.findByRole("button", { name: /esGMX to issuer/ });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("requires review if the shortfall changes before sending", async () => {
    vi.mocked(getEsGmxIssuerFunding)
      .mockResolvedValueOnce({ shortfall: 50n * 10n ** 18n, walletBalance: 100n * 10n ** 18n })
      .mockResolvedValue({ shortfall: 20n * 10n ** 18n, walletBalance: 100n * 10n ** 18n });
    render(view());
    fireEvent.click(await screen.findByRole("button", { name: "Send 50 esGMX to issuer" }));
    await waitFor(() =>
      expect(helperToast.info).toHaveBeenCalledWith("Issuer funding changed. Review the amount and try again.")
    );
    expect(mockCallContract).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Send 20 esGMX to issuer" })).toBeDefined();
  });

  it("rechecks the wallet balance before sending", async () => {
    vi.mocked(getEsGmxIssuerFunding)
      .mockResolvedValueOnce({ shortfall: 50n * 10n ** 18n, walletBalance: 100n * 10n ** 18n })
      .mockResolvedValue({ shortfall: 50n * 10n ** 18n, walletBalance: 0n });
    render(view());
    fireEvent.click(await screen.findByRole("button", { name: "Send 50 esGMX to issuer" }));
    await waitFor(() => expect(helperToast.error).toHaveBeenCalledWith("Insufficient balance"));
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("does not transfer when the fresh funding check fails", async () => {
    vi.mocked(getEsGmxIssuerFunding)
      .mockResolvedValueOnce({ shortfall: 50n * 10n ** 18n, walletBalance: 100n * 10n ** 18n })
      .mockRejectedValue(new Error("RPC unavailable"));
    render(view());
    fireEvent.click(await screen.findByRole("button", { name: "Send 50 esGMX to issuer" }));
    await waitFor(() =>
      expect(helperToast.error).toHaveBeenCalledWith("Unable to check distribution details. Please try again.")
    );
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it.each(["account", "chain"])("cancels funding after the wallet %s changes", async (field) => {
    let resolve!: (value: { shortfall: bigint; walletBalance: bigint }) => void;
    const funding = { shortfall: 50n * 10n ** 18n, walletBalance: 100n * 10n ** 18n };
    vi.mocked(getEsGmxIssuerFunding)
      .mockResolvedValueOnce(funding)
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done;
          })
      )
      .mockResolvedValue(funding);
    const component = render(view());
    fireEvent.click(await screen.findByRole("button", { name: "Send 50 esGMX to issuer" }));
    vi.mocked(useWallet).mockReturnValue({
      ...wallet,
      ...(field === "account" ? { account: "0x0000000000000000000000000000000000000001" } : { chainId: ARBITRUM }),
    } as ReturnType<typeof useWallet>);
    component.rerender(view());
    await act(async () => resolve(funding));
    expect(mockCallContract).not.toHaveBeenCalled();
    expect(onDistributed).not.toHaveBeenCalled();
  });

  it("keeps the modal open and permits retry after a rejected funding transfer", async () => {
    vi.mocked(getEsGmxIssuerFunding).mockResolvedValue({
      shortfall: 50n * 10n ** 18n,
      walletBalance: 100n * 10n ** 18n,
    });
    mockCallContract.mockRejectedValueOnce(new Error("Rejected"));
    render(view());
    fireEvent.click(await screen.findByRole("button", { name: "Send 50 esGMX to issuer" }));
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Send 50 esGMX to issuer" }) as HTMLButtonElement).disabled).toBe(
        false
      )
    );
    expect(setIsVisible).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Send 50 esGMX to issuer" }));
    await waitFor(() => expect(mockCallContract).toHaveBeenCalledTimes(2));
  });

  it("reports the issuer funding shortfall", async () => {
    vi.mocked(getEsGmxDistributionError).mockResolvedValue({ reason: "funding", shortfall: 50n * 10n ** 18n });
    render(view());
    enterValidFields();
    fireEvent.click(screen.getByRole("button", { name: "Distribute esGMX" }));
    await waitFor(() =>
      expect(helperToast.error).toHaveBeenCalledWith("Fund the issuer with 50 more esGMX before distributing.")
    );
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("requires a Sepolia wallet and never submits on mainnet", () => {
    vi.mocked(useWallet).mockReturnValue({ ...wallet, chainId: ARBITRUM } as ReturnType<typeof useWallet>);
    const component = render(view());
    enterValidFields();
    expect(screen.getByRole("button", { name: "Switch to Arbitrum Sepolia" })).toBeDefined();
    vi.mocked(useWallet).mockReturnValue(wallet as ReturnType<typeof useWallet>);
    vi.mocked(useChainId).mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
    component.rerender(view());
    fireEvent.click(screen.getByRole("button", { name: "Distribute esGMX" }));
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("cancels preflight after the connected account changes", async () => {
    let resolve!: () => void;
    vi.mocked(getEsGmxDistributionError).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = () => done(undefined);
        })
    );
    const component = render(view());
    enterValidFields();
    fireEvent.click(screen.getByRole("button", { name: "Distribute esGMX" }));
    expect(getEsGmxDistributionError).toHaveBeenCalledTimes(1);
    vi.mocked(useWallet).mockReturnValue({
      ...wallet,
      account: "0x0000000000000000000000000000000000000001",
    } as ReturnType<typeof useWallet>);
    component.rerender(view());
    await act(async () => resolve());
    expect(mockCallContract).not.toHaveBeenCalled();
    expect(onDistributed).not.toHaveBeenCalled();
  });

  it("does not submit if the preflight cannot be read", async () => {
    vi.mocked(getEsGmxDistributionError).mockRejectedValue(new Error("RPC unavailable"));
    render(view());
    enterValidFields();
    fireEvent.click(screen.getByRole("button", { name: "Distribute esGMX" }));
    await waitFor(() =>
      expect(helperToast.error).toHaveBeenCalledWith("Unable to check distribution details. Please try again.")
    );
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("keeps the modal open and permits retry after a rejected transaction", async () => {
    mockCallContract.mockRejectedValueOnce(new Error("Rejected"));
    render(view());
    enterValidFields();
    fireEvent.click(screen.getByRole("button", { name: "Distribute esGMX" }));
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Distribute esGMX" }) as HTMLButtonElement).disabled).toBe(false)
    );
    expect(onDistributed).not.toHaveBeenCalled();
    expect(setIsVisible).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Distribute esGMX" }));
    await waitFor(() => expect(onDistributed).toHaveBeenCalledTimes(1));
  });
});
