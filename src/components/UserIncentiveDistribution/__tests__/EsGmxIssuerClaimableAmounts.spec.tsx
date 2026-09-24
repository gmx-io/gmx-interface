import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ethers } from "ethers";
import { type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA } from "config/chains";
import { getRewardsVestingConfig } from "config/vesting";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import { EsGmxIssuerClaimableAmounts } from "../EsGmxIssuerClaimableAmounts";

vi.mock("lib/wallets/useWallet", () => ({ default: vi.fn() }));
vi.mock("lib/wallets", () => ({ switchNetwork: vi.fn() }));
vi.mock("lib/contracts", () => ({ callContract: vi.fn() }));
vi.mock("lib/helperToast", () => ({ helperToast: { error: vi.fn(), info: vi.fn() } }));
vi.mock("lib/useHasOutdatedUi", () => ({ useHasOutdatedUi: () => false }));
vi.mock("lib/chains/getMultipleWalletExtensionsChainError", () => ({ useMultipleWalletExtensionsChainError: vi.fn() }));
vi.mock("context/PendingTxnsContext/PendingTxnsContext", () => ({
  usePendingTxns: () => ({ setPendingTxns: vi.fn() }),
}));
vi.mock("ethers", () => ({
  ethers: {
    Contract: vi.fn(function () {
      return {};
    }),
  },
}));

i18n.load({ en: {} });
i18n.activate("en");
const config = getRewardsVestingConfig(ARBITRUM_SEPOLIA);
if (config.type !== "ratio") throw new Error("Expected ratio vesting config");
const issuerConfig = config;
const signer = {};
const mutate = vi.fn();
const wait = vi.fn();
const wallet = {
  account: "0x52908400098527886E0F7030069857D2E4169EE7",
  active: true,
  signer,
  chainId: ARBITRUM_SEPOLIA,
};

function getView(props: Partial<ComponentProps<typeof EsGmxIssuerClaimableAmounts>> = {}) {
  return (
    <I18nProvider i18n={i18n}>
      <EsGmxIssuerClaimableAmounts
        chainId={ARBITRUM_SEPOLIA}
        config={issuerConfig}
        amount={100n * 10n ** 18n}
        isLoading={false}
        mutate={mutate}
        {...props}
      />
    </I18nProvider>
  );
}

describe("esGMX incentive claims", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useWallet).mockReturnValue(wallet as ReturnType<typeof useWallet>);
    vi.mocked(useMultipleWalletExtensionsChainError).mockReturnValue({
      buttonErrorMessage: undefined,
      buttonTooltipMessage: undefined,
    });
    mutate.mockResolvedValue(100n * 10n ** 18n);
    wait.mockResolvedValue(undefined);
    vi.mocked(callContract).mockResolvedValue({ wait } as any);
  });
  afterEach(cleanup);

  it("claims from EsGmxIssuer and refreshes the balance after confirmation", async () => {
    render(getView());
    fireEvent.click(screen.getByRole("button", { name: "Claim esGMX" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
    expect(ethers.Contract).toHaveBeenCalledWith(issuerConfig.issuer, expect.any(Array), signer);
    expect(callContract).toHaveBeenCalledWith(
      ARBITRUM_SEPOLIA,
      expect.anything(),
      "claim",
      [],
      expect.objectContaining({ successMsg: "esGMX claimed" })
    );
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it.each([{ amount: 0n }, { amount: undefined, isLoading: true }, { error: new Error("RPC unavailable") }])(
    "disables claims without a reliable positive balance: %s",
    (props) => {
      render(getView(props));
      const button = screen.getByRole("button", { name: "Claim esGMX" });
      expect(button.hasAttribute("disabled")).toBe(true);
      fireEvent.click(button);
      expect(callContract).not.toHaveBeenCalled();
    }
  );

  it("offers a network switch instead of sending on the wrong chain", () => {
    vi.mocked(useWallet).mockReturnValue({ ...wallet, chainId: ARBITRUM } as ReturnType<typeof useWallet>);
    render(getView());
    fireEvent.click(screen.getByRole("button", { name: /Switch to/ }));
    expect(switchNetwork).toHaveBeenCalledWith(ARBITRUM_SEPOLIA, true);
    expect(callContract).not.toHaveBeenCalled();
  });

  it("does not claim a balance that was already claimed elsewhere", async () => {
    mutate.mockResolvedValue(0n);
    render(getView());
    fireEvent.click(screen.getByRole("button", { name: "Claim esGMX" }));
    await waitFor(() => expect(helperToast.info).toHaveBeenCalledWith("No rewards are currently available to claim."));
    expect(callContract).not.toHaveBeenCalled();
  });

  it("shows an error when the balance cannot be refreshed", async () => {
    mutate.mockRejectedValue(new Error("RPC unavailable"));
    render(getView());
    fireEvent.click(screen.getByRole("button", { name: "Claim esGMX" }));
    await waitFor(() =>
      expect(helperToast.error).toHaveBeenCalledWith("Unable to refresh claimable rewards. Please try again.")
    );
    expect(callContract).not.toHaveBeenCalled();
  });

  it("cancels a pending claim if the connected account changes", async () => {
    let resolve: (amount: bigint) => void = () => undefined;
    mutate.mockImplementation(
      () =>
        new Promise<bigint>((r) => {
          resolve = r;
        })
    );
    const view = render(getView());
    fireEvent.click(screen.getByRole("button", { name: "Claim esGMX" }));
    vi.mocked(useWallet).mockReturnValue({
      ...wallet,
      account: "0x2BE7f46c991dEFF90936fDbEdf987d6bb629BC51",
    } as ReturnType<typeof useWallet>);
    view.rerender(getView());
    await act(async () => {
      resolve(100n);
    });
    expect(callContract).not.toHaveBeenCalled();
  });

  it("blocks duplicate submissions while a claim is pending", async () => {
    let resolve: (amount: bigint) => void = () => undefined;
    mutate.mockImplementationOnce(
      () =>
        new Promise<bigint>((r) => {
          resolve = r;
        })
    );
    render(getView());
    const button = screen.getByRole("button", { name: "Claim esGMX" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mutate).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve(100n);
    });
    await waitFor(() => expect(callContract).toHaveBeenCalledTimes(1));
  });
});
