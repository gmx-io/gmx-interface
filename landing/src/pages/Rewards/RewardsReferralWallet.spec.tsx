import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";

import RewardsReferralWallet from "./RewardsReferralWallet";

const mocks = vi.hoisted(() => ({
  account: undefined as string | undefined,
  codes: { code: null, success: true } as { code: string | null; success: boolean; error?: boolean },
  connect: vi.fn(),
  create: vi.fn(),
  onCreated: undefined as ((code: string) => void) | undefined,
}));

vi.mock("lib/wallets/WalletProvider", () => ({ default: ({ children }: { children: ReactNode }) => children }));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ ready: true }),
  useModalStatus: () => ({ isOpen: false }),
  useConnectWallet: () => ({ connectWallet: mocks.connect }),
  useConnectOrCreateWallet: () => ({ connectOrCreateWallet: mocks.connect }),
}));
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mocks.account, isConnected: Boolean(mocks.account) }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn(), isPending: false }),
}));
vi.mock("lib/wallets/useWallet", () => ({ default: () => ({ chainId: ARBITRUM, signer: {} }) }));
vi.mock("domain/referrals/hooks", () => ({ useAffiliateCodes: () => mocks.codes }));
vi.mock("domain/referrals/hooks/useCreateReferralCode", () => ({
  useCreateReferralCode: ({ onSuccess }: { onSuccess: (code: string) => void }) => {
    mocks.onCreated = onSuccess;
    return { createCode: mocks.create, isSubmitting: false };
  },
}));
vi.mock("lib/copyElementAsImage", () => ({ shareOrCopyElementAsImage: vi.fn() }));

function Page() {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsReferralWallet config={undefined} />
    </I18nProvider>
  );
}

beforeEach(() => {
  i18n.load("en", {});
  i18n.activate("en");
  mocks.account = undefined;
  mocks.codes = { code: null, success: true };
  mocks.connect.mockReset();
  mocks.create.mockReset();
});
afterEach(cleanup);

describe("rewards referral card", () => {
  it("requires a connection before offering sharing or code creation", () => {
    const view = render(<Page />);
    fireEvent.click(view.getByRole("button", { name: "Connect wallet" }));
    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(view.queryByRole("link", { name: "Share on X" })).toBeNull();
    expect(view.container.querySelector(".rewards-share-image svg")).toBeNull();
  });

  it("uses only the connected wallet's owned code in the share URL", () => {
    mocks.account = "0x0000000000000000000000000000000000000001";
    mocks.codes = { code: "MyCode", success: true };
    const view = render(<Page />);
    const url = view.getByRole("link", { name: "Share on X" }).getAttribute("href")!;
    expect(new URL(url).searchParams.get("url")).toBe(`${window.location.origin}/rewards?ref=MyCode`);
    expect(view.container.querySelector(".rewards-share-image svg")).not.toBeNull();
    expect(view.queryByRole("button", { name: "Create code and invite traders" })).toBeNull();
  });

  it("offers retry instead of code creation when ownership cannot be checked", () => {
    mocks.account = "0x0000000000000000000000000000000000000001";
    mocks.codes = { code: null, success: false, error: true };
    const view = render(<Page />);

    expect(view.getByRole("alert").textContent).toBe("Unable to load your referral codes.");
    expect(view.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Create code and invite traders" })).toBeNull();
    expect(view.queryByRole("link", { name: "Share on X" })).toBeNull();
  });

  it("offers creation without an owned code, then sharing after confirmation, and clears it on wallet change", () => {
    mocks.account = "0x0000000000000000000000000000000000000001";
    const view = render(<Page />);
    fireEvent.click(view.getByRole("button", { name: "Create code and invite traders" }));
    fireEvent.change(view.getByRole("textbox", { name: "Your referral code" }), { target: { value: "NewCode" } });
    fireEvent.click(view.getByRole("button", { name: "Create code and invite traders" }));
    expect(mocks.create).toHaveBeenCalledWith("NewCode");
    expect(view.queryByRole("link", { name: "Share on X" })).toBeNull();
    act(() => mocks.onCreated!("NewCode"));
    expect(view.getByRole("link", { name: "Share on X" }).getAttribute("href")).toContain("NewCode");
    mocks.account = "0x0000000000000000000000000000000000000002";
    view.rerender(<Page />);
    expect(view.queryByRole("link", { name: "Share on X" })).toBeNull();
    expect(view.getByRole("button", { name: "Create code and invite traders" })).toBeTruthy();
  });
});
