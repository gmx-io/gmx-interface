import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA } from "config/chains";
import { getContract } from "config/contracts";
import { useChainId } from "lib/chains";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";

import { RewardsMintEsGmxModal } from "../RewardsMintEsGmxModal";

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
vi.mock("lib/helperToast", () => ({ helperToast: { info: vi.fn() } }));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const wallet = { account: ACCOUNT, active: true, chainId: ARBITRUM_SEPOLIA, signer: {} };
const onMinted = vi.fn();
const setIsVisible = vi.fn();
const mockCallContract = vi.mocked(callContract);

i18n.load({ en: {} });
i18n.activate("en");

function view(isVisible = true, walletSbfGmxBalance = 25n * 10n ** 18n) {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsMintEsGmxModal
        isVisible={isVisible}
        setIsVisible={setIsVisible}
        onMinted={onMinted}
        walletEsGmxBalance={0n}
        walletSbfGmxBalance={walletSbfGmxBalance}
      />
    </I18nProvider>
  );
}

describe("Sepolia test token minting", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useChainId).mockReturnValue({ chainId: ARBITRUM_SEPOLIA } as ReturnType<typeof useChainId>);
    vi.mocked(useWallet).mockReturnValue(wallet as ReturnType<typeof useWallet>);
    vi.mocked(useMultipleWalletExtensionsChainError).mockReturnValue({});
    mockCallContract.mockResolvedValue({ wait: vi.fn().mockResolvedValue(undefined) } as any);
    onMinted.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it.each([
    { symbol: "esGMX", contract: "IncentiveEsGmx" },
    { symbol: "sbfGMX", contract: "IncentivePairToken" },
  ] as const)(
    "mints $symbol to the connected wallet, then refreshes after confirmation",
    async ({ symbol, contract }) => {
      let confirm!: () => void;
      const wait = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            confirm = resolve;
          })
      );
      mockCallContract.mockResolvedValue({ wait } as any);
      render(view());
      fireEvent.click(screen.getByRole("button", { name: symbol }));
      fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), { target: { value: "1.25" } });
      fireEvent.click(screen.getByRole("button", { name: `Mint ${symbol}` }));

      await waitFor(() => expect(wait).toHaveBeenCalledTimes(1));
      expect(mockCallContract).toHaveBeenCalledWith(
        ARBITRUM_SEPOLIA,
        { address: getContract(ARBITRUM_SEPOLIA, contract) },
        "mint",
        [ACCOUNT, 1_250_000_000_000_000_000n],
        expect.objectContaining({
          sentMsg: `${symbol} mint submitted`,
          failMsg: `${symbol} mint failed`,
          successMsg: `${symbol} minted`,
        })
      );
      expect(onMinted).not.toHaveBeenCalled();
      const otherToken = screen.getByRole("button", {
        name: symbol === "esGMX" ? "sbfGMX" : "esGMX",
      }) as HTMLButtonElement;
      expect(otherToken.disabled).toBe(true);
      fireEvent.click(otherToken);
      expect(screen.getByRole("dialog", { name: `Mint ${symbol}` })).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Confirming..." }));
      expect(mockCallContract).toHaveBeenCalledTimes(1);
      await act(async () => confirm());
      expect(onMinted).toHaveBeenCalledTimes(1);
      expect(setIsVisible).toHaveBeenCalledWith(false);
    }
  );

  it.each([
    ["esGMX", ""],
    ["esGMX", "0"],
    ["sbfGMX", ""],
    ["sbfGMX", "0"],
  ])("blocks minting %s with an empty or zero amount (%s)", (symbol, value) => {
    render(view());
    fireEvent.click(screen.getByRole("button", { name: symbol }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value } });
    const button = screen.getByRole("button", { name: "Enter an amount" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("requires the wallet to switch to Arbitrum Sepolia", () => {
    vi.mocked(useWallet).mockReturnValue({ ...wallet, chainId: ARBITRUM } as ReturnType<typeof useWallet>);
    render(view());
    expect(screen.getByRole("button", { name: "Switch to Arbitrum Sepolia" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Mint esGMX" })).toBeNull();
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it.each(["esGMX", "sbfGMX"])("cannot mint %s when the application is on mainnet", (symbol) => {
    vi.mocked(useChainId).mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
    render(view());
    fireEvent.click(screen.getByRole("button", { name: symbol }));
    fireEvent.click(screen.getByRole("button", { name: `Mint ${symbol}` }));
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it.each(["outdated", "wallet extensions"])("blocks minting with a %s error", (reason) => {
    if (reason === "outdated") {
      vi.mocked(useHasOutdatedUi).mockReturnValue(true);
    } else {
      vi.mocked(useMultipleWalletExtensionsChainError).mockReturnValue({ buttonErrorMessage: "Network mismatch" });
    }
    render(view());
    fireEvent.click(screen.getByRole("button", { name: reason === "outdated" ? "Outdated" : "Network mismatch" }));
    expect(mockCallContract).not.toHaveBeenCalled();
  });

  it("offers wallet connection when disconnected", () => {
    vi.mocked(useWallet).mockReturnValue({ active: false } as ReturnType<typeof useWallet>);
    render(view());
    expect(screen.getByRole("button", { name: "Connect wallet" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Mint esGMX" })).toBeNull();
  });

  it.each(["esGMX", "sbfGMX"])("allows retrying a rejected %s mint without closing the modal", async (symbol) => {
    mockCallContract.mockRejectedValueOnce(new Error("User rejected"));
    render(view());
    fireEvent.click(screen.getByRole("button", { name: symbol }));
    fireEvent.click(screen.getByRole("button", { name: `Mint ${symbol}` }));
    await waitFor(() =>
      expect((screen.getByRole("button", { name: `Mint ${symbol}` }) as HTMLButtonElement).disabled).toBe(false)
    );
    expect(onMinted).not.toHaveBeenCalled();
    expect(setIsVisible).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: `Mint ${symbol}` }));
    await waitFor(() => expect(onMinted).toHaveBeenCalledTimes(1));
  });

  it.each(["esGMX", "sbfGMX"])("ignores %s mint completion after the account changes", async (symbol) => {
    let confirm!: () => void;
    const wait = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          confirm = resolve;
        })
    );
    mockCallContract.mockResolvedValue({ wait } as any);
    const component = render(view());
    fireEvent.click(screen.getByRole("button", { name: symbol }));
    fireEvent.click(screen.getByRole("button", { name: `Mint ${symbol}` }));
    await waitFor(() => expect(wait).toHaveBeenCalled());
    vi.mocked(useWallet).mockReturnValue({
      ...wallet,
      account: "0x0000000000000000000000000000000000000001",
    } as ReturnType<typeof useWallet>);
    component.rerender(view());
    await act(async () => confirm());
    expect(onMinted).not.toHaveBeenCalled();
    expect(setIsVisible).not.toHaveBeenCalled();
  });

  it("shows the selected token balance and preserves the entered amount when switching", () => {
    const component = render(view());
    expect(screen.getByText("0 esGMX")).toBeDefined();
    fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), { target: { value: "2.5" } });
    fireEvent.click(screen.getByRole("button", { name: "sbfGMX" }));
    expect(screen.getByRole("dialog", { name: "Mint sbfGMX" })).toBeDefined();
    expect(screen.getByText("25 sbfGMX")).toBeDefined();
    expect(screen.queryByText("0 esGMX")).toBeNull();
    expect((screen.getByRole("textbox", { name: "Amount" }) as HTMLInputElement).value).toBe("2.5");
    component.rerender(view(true, 30n * 10n ** 18n));
    expect(screen.getByText("30 sbfGMX")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "esGMX" }));
    expect(screen.getByText("0 esGMX")).toBeDefined();
  });

  it("resets to esGMX when the modal is reopened", () => {
    const component = render(view());
    fireEvent.click(screen.getByRole("button", { name: "sbfGMX" }));
    component.rerender(view(false));
    component.rerender(view());
    expect(screen.getByRole("dialog", { name: "Mint esGMX" })).toBeDefined();
    expect((screen.getByRole("textbox", { name: "Amount" }) as HTMLInputElement).value).toBe("100");
  });

  it("reports a delayed balance refresh without treating the mint as failed", async () => {
    onMinted.mockRejectedValue(new Error("RPC unavailable"));
    render(view());
    fireEvent.click(screen.getByRole("button", { name: "Mint esGMX" }));
    await waitFor(() => expect(setIsVisible).toHaveBeenCalledWith(false));
    expect(helperToast.info).toHaveBeenCalledWith("Balances will refresh shortly.");
    expect(mockCallContract).toHaveBeenCalledTimes(1);
  });
});
