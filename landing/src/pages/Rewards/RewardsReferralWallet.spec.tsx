import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { PRECISION } from "lib/numbers";

import RewardsReferralWallet from "./RewardsReferralWallet";

const mocks = vi.hoisted(() => ({
  account: undefined as string | undefined,
  codes: { code: null, success: true } as { code: string | null; success: boolean; error?: boolean },
  connect: vi.fn(),
  create: vi.fn(),
  onCreated: undefined as ((code: string) => void) | undefined,
  pushEvent: vi.fn(),
  copyImage: vi.fn(),
  upload: vi.fn(),
  copyLink: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  replacePopup: vi.fn(),
  closePopup: vi.fn(),
}));

vi.mock("lib/userAnalytics/UserAnalytics", () => ({ userAnalytics: { pushEvent: mocks.pushEvent } }));
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
vi.mock("lib/copyElementAsImage", () => ({ shareOrCopyElementAsImage: mocks.copyImage }));
vi.mock("lib/helperToast", () => ({ helperToast: { success: mocks.success, error: mocks.error } }));
vi.mock("lib/shareImage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("lib/shareImage")>()),
  uploadElementAsShareImage: mocks.upload,
}));

const config: IncentivesConfig = {
  epochTimestamp: 1788912000,
  epochStartTimestamp: 1781654400,
  programStartTimestamp: 1781654400,
  epochDuration: 604800,
  volumeTierPersistenceEpochs: 4,
  multiplierDecimals: 100n,
  maxMultiplier: 1000n,
  feeShareFactor: PRECISION / 10n,
  esGmxShareFactor: PRECISION,
  gtShareFactor: PRECISION / 5n,
  referralRewardShareFactor: PRECISION / 2n,
  volumeTiers: [],
  stakingTiers: [],
  boosts: [{ boost: "ManualAllocation", multiplier: 200n }],
  featuredMarketTokens: [],
  downgradingFactors: [],
  balancingTradesThreshold: 1000000n * PRECISION,
  lifetimeVolumeThreshold: 200000000n * PRECISION,
  manualAllocationTiers: [],
};

function Page({
  account,
  hasBonus = false,
  loading = false,
}: { account?: string; hasBonus?: boolean; loading?: boolean } = {}) {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsReferralWallet
        config={config}
        loading={loading}
        hasBonus={hasBonus}
        account={account}
        rewardsUsd={2000n * 10n ** 30n}
      />
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
  mocks.pushEvent.mockReset();
  mocks.copyImage.mockReset();
  mocks.upload.mockReset().mockResolvedValue({ id: "PersonalCard" });
  mocks.copyLink.mockReset().mockResolvedValue(undefined);
  mocks.success.mockReset();
  mocks.error.mockReset();
  mocks.replacePopup.mockReset();
  mocks.closePopup.mockReset();
  vi.spyOn(window, "open").mockReturnValue({
    opener: window,
    closed: false,
    location: { replace: mocks.replacePopup },
    close: mocks.closePopup,
  } as unknown as Window);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(210);
  vi.spyOn(navigator.clipboard, "writeText").mockImplementation(mocks.copyLink);
  vi.stubGlobal("ClipboardItem", undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("rewards referral card", () => {
  it("copies a personal image link, shows a toast, and reuses the upload for the same card", async () => {
    mocks.codes = { code: "My_Code", success: true };
    const view = render(<Page account="0x0000000000000000000000000000000000000002" />);
    const copy = view.getByRole("button", { name: "Copy link" });
    await act(async () => fireEvent.click(copy));
    await act(async () => fireEvent.click(copy));
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(mocks.upload.mock.calls[0][0].textContent).toContain("My_Code");
    expect(mocks.upload.mock.calls[0][1]).toEqual({
      canvasWidth: 600,
      canvasHeight: 315,
      style: { transform: "none" },
    });
    expect(Object.fromEntries(new URL(mocks.copyLink.mock.calls[0][0]).searchParams)).toEqual({
      id: "PersonalCard",
      ref: "My_Code",
      page: "rewards",
    });
    expect(mocks.success).toHaveBeenCalledWith("Link copied to clipboard");
    expect(view.container.querySelector(".rewards-share-feedback")).toBeNull();
  });

  it("creates a new image when the card's bonus changes", async () => {
    mocks.codes = { code: "My_Code", success: true };
    const account = "0x0000000000000000000000000000000000000002";
    const view = render(<Page account={account} />);
    await act(async () => fireEvent.click(view.getByRole("button", { name: "Copy link" })));
    view.rerender(<Page account={account} hasBonus />);
    await act(async () => fireEvent.click(view.getByRole("button", { name: "Copy link" })));
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.upload.mock.calls[1][0].textContent).toContain("I'm getting +2x rewards");
  });

  it("does not upload a card while its reward values are loading", () => {
    mocks.codes = { code: "My_Code", success: true };
    const view = render(<Page account="0x0000000000000000000000000000000000000002" loading />);
    for (const name of ["Share on X", "Copy link", "Copy image"]) {
      const button = view.getByRole("button", { name }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      fireEvent.click(button);
    }
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.copyImage).not.toHaveBeenCalled();
  });

  it("keeps reward values in the export when a refresh begins during preparation", async () => {
    let completeUpload!: (image: { id: string }) => void;
    mocks.upload.mockReturnValue(
      new Promise((resolve) => {
        completeUpload = resolve;
      })
    );
    mocks.codes = { code: "My_Code", success: true };
    const account = "0x0000000000000000000000000000000000000002";
    const view = render(<Page account={account} />);
    fireEvent.click(view.getByRole("button", { name: "Copy link" }));
    const image = mocks.upload.mock.calls[0][0] as HTMLElement;
    view.rerender(<Page account={account} loading />);
    expect(image.querySelector(".rewards-skeleton")).toBeNull();
    expect(image.textContent).toContain("Up to 120%");
    await act(async () => completeUpload({ id: "ReadyImage" }));
    expect(mocks.success).toHaveBeenCalledWith("Link copied to clipboard");
  });

  it("opens the X window during the click and navigates it only after the upload", async () => {
    let completeUpload!: (image: { id: string }) => void;
    mocks.upload.mockReturnValue(
      new Promise((resolve) => {
        completeUpload = resolve;
      })
    );
    mocks.codes = { code: "My_Code", success: true };
    const view = render(<Page account="0x0000000000000000000000000000000000000002" />);
    fireEvent.click(view.getByRole("button", { name: "Share on X" }));
    expect(window.open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(mocks.replacePopup).not.toHaveBeenCalled();
    expect((view.getByRole("button", { name: "Copy link" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => completeUpload({ id: "ReadyImage" }));
    const url = new URL(new URL(mocks.replacePopup.mock.calls[0][0]).searchParams.get("url")!);
    expect(url.searchParams.get("id")).toBe("ReadyImage");
    expect(url.searchParams.get("page")).toBe("rewards");
  });

  it("uses a promised ClipboardItem so Safari retains the click's clipboard permission", async () => {
    let completeUpload!: (image: { id: string }) => void;
    mocks.upload.mockReturnValue(
      new Promise((resolve) => {
        completeUpload = resolve;
      })
    );
    mocks.codes = { code: "My_Code", success: true };
    let promisedText!: Promise<Blob>;
    vi.stubGlobal(
      "ClipboardItem",
      class {
        constructor(items: Record<string, Promise<Blob>>) {
          promisedText = items["text/plain"];
        }
      }
    );
    const write = vi.spyOn(navigator.clipboard, "write").mockImplementation(async () => {
      await promisedText;
    });
    const view = render(<Page account="0x0000000000000000000000000000000000000002" />);
    fireEvent.click(view.getByRole("button", { name: "Copy link" }));
    expect(write).toHaveBeenCalledOnce();
    expect(mocks.success).not.toHaveBeenCalled();
    await act(async () => completeUpload({ id: "ReadyImage" }));
    expect(new URL(await (await promisedText).text()).searchParams.get("id")).toBe("ReadyImage");
    expect(mocks.success).toHaveBeenCalledWith("Link copied to clipboard");
  });

  it("reports upload failure without copying a plain link, and allows retry", async () => {
    mocks.upload.mockRejectedValueOnce(new Error("Upload unavailable"));
    mocks.codes = { code: "My_Code", success: true };
    const view = render(<Page account="0x0000000000000000000000000000000000000002" />);
    await act(async () => fireEvent.click(view.getByRole("button", { name: "Copy link" })));
    expect(mocks.error).toHaveBeenCalledWith("Image generation failed. Refresh and try again.");
    expect(mocks.copyLink).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(view.getByRole("button", { name: "Copy link" })));
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.copyLink).toHaveBeenCalledOnce();
  });

  it("closes the empty X window if image preparation fails", async () => {
    mocks.upload.mockRejectedValueOnce(new Error("Upload unavailable"));
    mocks.codes = { code: "My_Code", success: true };
    const view = render(<Page account="0x0000000000000000000000000000000000000002" />);
    await act(async () => fireEvent.click(view.getByRole("button", { name: "Share on X" })));
    expect(mocks.closePopup).toHaveBeenCalledOnce();
    expect(mocks.replacePopup).not.toHaveBeenCalled();
  });

  it.each([
    ["X", "button", "Share on X"],
    ["CopyImage", "button", "Copy image"],
    ["CopyLink", "button", "Copy link"],
  ])("tracks %s sharing with the checked wallet's rewards and referral status", async (type, role, name) => {
    mocks.codes = { code: "CheckedWallet", success: true };
    const view = render(<Page account="0x0000000000000000000000000000000000000002" />);
    await act(async () => {
      fireEvent.click(view.getByRole(role, { name }));
    });
    expect(mocks.pushEvent).toHaveBeenCalledWith(
      {
        event: "RewardsPageAction",
        data: { action: "ComebackShareClick", type, rewards_exist: true, ref_code_exist: true, rewards: 2000 },
      },
      { instantSend: true }
    );
    if (type === "X") {
      const sharedUrl = new URL(mocks.replacePopup.mock.calls[0][0]).searchParams.get("url")!;
      expect(new URL(sharedUrl).searchParams.has("sessionId")).toBe(false);
    }
  });

  it("shares the checked address's public code and personal image without a wallet connection", async () => {
    mocks.codes = { code: "CheckedWallet", success: true };
    const view = render(<Page account="0x0000000000000000000000000000000000000002" />);
    await act(async () => fireEvent.click(view.getByRole("button", { name: "Share on X" })));
    const sharedUrl = new URL(new URL(mocks.replacePopup.mock.calls[0][0]).searchParams.get("url")!);
    expect(Object.fromEntries(sharedUrl.searchParams)).toEqual({
      id: "PersonalCard",
      ref: "CheckedWallet",
      page: "rewards",
    });
    expect(view.queryByRole("button", { name: "Create code and invite traders" })).toBeNull();
  });

  it("requires the checked wallet's owner before allowing code creation", () => {
    mocks.account = "0x0000000000000000000000000000000000000001";
    const view = render(<Page account="0x0000000000000000000000000000000000000002" />);
    fireEvent.click(view.getByRole("button", { name: "Connect this wallet to create a code" }));
    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(view.queryByRole("textbox", { name: "Your referral code" })).toBeNull();
  });

  it("requires a connection before offering sharing or code creation", () => {
    const view = render(<Page />);
    fireEvent.click(view.getByRole("button", { name: "Connect wallet" }));
    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(view.queryByRole("button", { name: "Share on X" })).toBeNull();
    expect(view.container.querySelector(".rewards-share-image svg")).toBeNull();
  });

  it("uses only the connected wallet's owned code in the share URL", async () => {
    mocks.account = "0x0000000000000000000000000000000000000001";
    mocks.codes = { code: "MyCode", success: true };
    const view = render(<Page />);
    await act(async () => fireEvent.click(view.getByRole("button", { name: "Share on X" })));
    const sharedUrl = new URL(new URL(mocks.replacePopup.mock.calls[0][0]).searchParams.get("url")!);
    expect(sharedUrl.searchParams.get("ref")).toBe("MyCode");
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
    expect(view.queryByRole("button", { name: "Share on X" })).toBeNull();
  });

  it("offers creation without an owned code, then sharing after confirmation, and clears it on wallet change", () => {
    mocks.account = "0x0000000000000000000000000000000000000001";
    const view = render(<Page />);
    fireEvent.click(view.getByRole("button", { name: "Create code and invite traders" }));
    expect(mocks.pushEvent).toHaveBeenCalledWith(
      {
        event: "RewardsPageAction",
        data: { action: "ComebackCreateCodeClick", rewards_exist: true, ref_code_exist: false, rewards: 2000 },
      },
      { instantSend: true }
    );
    fireEvent.change(view.getByRole("textbox", { name: "Your referral code" }), { target: { value: "NewCode" } });
    fireEvent.click(view.getByRole("button", { name: "Create code and invite traders" }));
    expect(mocks.create).toHaveBeenCalledWith("NewCode");
    expect(mocks.pushEvent.mock.calls.some(([event]) => event.data.action === "ComebackCreateCodeSuccesfull")).toBe(
      false
    );
    expect(view.queryByRole("button", { name: "Share on X" })).toBeNull();
    act(() => mocks.onCreated!("NewCode"));
    expect(mocks.pushEvent).toHaveBeenCalledWith(
      {
        event: "RewardsPageAction",
        data: { action: "ComebackCreateCodeSuccesfull", rewards_exist: true, ref_code_exist: true, rewards: 2000 },
      },
      { instantSend: true }
    );
    expect(view.getByRole("button", { name: "Share on X" })).toBeTruthy();
    expect(view.container.querySelector(".rewards-share-code")?.textContent).toBe("NewCode");
    mocks.account = "0x0000000000000000000000000000000000000002";
    view.rerender(<Page />);
    expect(view.queryByRole("button", { name: "Share on X" })).toBeNull();
    expect(view.getByRole("button", { name: "Create code and invite traders" })).toBeTruthy();
  });
});
