import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { PRECISION } from "lib/numbers";

import RewardsReferralWallet from "./RewardsReferralWallet";

type CodesResult = { code: string | null; success: boolean; error?: boolean };

const mocks = vi.hoisted(() => ({
  account: undefined as string | undefined,
  codes: { code: null, success: true } as CodesResult,
  codesByAccount: {} as Record<string, CodesResult>,
  lookupCodes: vi.fn(),
  lookupBonus: vi.fn(),
  connectedBonus: undefined as { manualRewardRemainingUsd: bigint } | null | undefined,
  creationParams: vi.fn(),
  connect: vi.fn(),
  retryCodes: vi.fn(),
  create: vi.fn(),
  onCreated: undefined as ((code: string) => void) | undefined,
  pushEvent: vi.fn(),
  copyImage: vi.fn(),
  upload: vi.fn(),
  copyLink: vi.fn(),
  replacePopup: vi.fn(),
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
vi.mock("domain/referrals/hooks", () => ({
  useAffiliateCodes: (chainId: number, account: string) => {
    mocks.lookupCodes(chainId, account);
    return { ...(mocks.codesByAccount[account] ?? mocks.codes), mutate: mocks.retryCodes };
  },
}));
vi.mock("domain/synthetics/incentives/v2/useReturnBonus", () => ({
  useReturnBonus: (endpoint: string, account?: string) => {
    mocks.lookupBonus(endpoint, account);
    return { data: mocks.connectedBonus, isLoading: false };
  },
}));
vi.mock("domain/referrals/hooks/useCreateReferralCode", () => ({
  useCreateReferralCode: (params: { account: string; onSuccess: (code: string) => void }) => {
    mocks.creationParams(params);
    mocks.onCreated = params.onSuccess;
    return { createCode: mocks.create, isSubmitting: false };
  },
}));
vi.mock("lib/copyElementAsImage", () => ({ shareOrCopyElementAsImage: mocks.copyImage }));
vi.mock("lib/helperToast", () => ({ helperToast: { success: vi.fn(), error: vi.fn() } }));
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

function Page({ account, hasBonus = false }: { account?: string; hasBonus?: boolean } = {}) {
  return (
    <I18nProvider i18n={i18n}>
      <RewardsReferralWallet
        key={account}
        config={config}
        loading={false}
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
  mocks.codesByAccount = {};
  mocks.lookupCodes.mockReset();
  mocks.lookupBonus.mockReset();
  mocks.connectedBonus = undefined;
  mocks.creationParams.mockReset();
  mocks.connect.mockReset();
  mocks.create.mockReset();
  mocks.pushEvent.mockReset();
  mocks.copyImage.mockReset();
  mocks.upload.mockReset().mockResolvedValue({ id: "PersonalCard" });
  mocks.copyLink.mockReset().mockResolvedValue(undefined);
  mocks.replacePopup.mockReset();
  vi.spyOn(window, "open").mockReturnValue({
    opener: window,
    closed: false,
    location: { replace: mocks.replacePopup },
    close: vi.fn(),
  } as unknown as Window);
  vi.spyOn(navigator.clipboard, "writeText").mockImplementation(mocks.copyLink);
  vi.stubGlobal("ClipboardItem", undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("rewards referral card", () => {
  it.each([
    ["X", "Share on X"],
    ["CopyImage", "Copy image"],
    ["CopyLink", "Copy link"],
  ])("tracks %s sharing with the checked wallet's rewards and referral status", async (type, name) => {
    mocks.codes = { code: "CheckedWallet", success: true };
    const view = render(<Page account="0x0000000000000000000000000000000000000002" />);
    await act(async () => {
      fireEvent.click(view.getByRole("button", { name }));
    });
    expect(mocks.pushEvent).toHaveBeenCalledWith(
      {
        event: "RewardsLandingPageAction",
        data: { action: "ComebackShareClick", type, rewards_exist: true, ref_code_exist: true, rewards: 2000 },
      },
      { instantSend: true }
    );
    if (type === "X") {
      const sharedUrl = new URL(mocks.replacePopup.mock.calls[0][0]).searchParams.get("url")!;
      expect(new URL(sharedUrl).searchParams.has("sessionId")).toBe(false);
    }
  });

  it.each([false, true])(
    "keeps the checked wallet's card without a connect click (already connected: %s)",
    async (alreadyConnected) => {
      const checkedAccount = "0x0000000000000000000000000000000000000002";
      const connectedAccount = "0x0000000000000000000000000000000000000001";
      mocks.account = alreadyConnected ? connectedAccount : undefined;
      mocks.codesByAccount = {
        [checkedAccount]: { code: "CheckedCode", success: true },
        [connectedAccount]: { code: "ConnectedCode", success: true },
      };
      mocks.connectedBonus = { manualRewardRemainingUsd: 0n };
      const view = render(<Page account={checkedAccount} hasBonus />);
      expect(view.container.querySelector('[data-qa="rewards-share-code"]')?.textContent).toBe("CheckedCode");

      mocks.account = connectedAccount;
      view.rerender(<Page account={checkedAccount} hasBonus />);
      expect(mocks.lookupCodes).toHaveBeenLastCalledWith(ARBITRUM, checkedAccount);
      expect(mocks.lookupBonus).not.toHaveBeenCalledWith(expect.any(String), connectedAccount);
      expect(view.container.querySelector('[data-qa="rewards-share-code"]')?.textContent).toBe("CheckedCode");
      expect(view.queryAllByText("I'm getting +2x rewards")).not.toHaveLength(0);
      expect(view.queryByRole("button", { name: "Connect wallet to create a code" })).toBeNull();
      expect(view.queryByRole("button", { name: "Create code and invite traders" })).toBeNull();
      await act(async () => fireEvent.click(view.getByRole("button", { name: "Copy link" })));
      expect(Object.fromEntries(new URL(mocks.copyLink.mock.calls[0][0]).searchParams)).toEqual({
        id: "PersonalCard",
        ref: "CheckedCode",
        page: "rewards",
      });
      expect(mocks.upload.mock.calls[0][0].textContent).toContain("CheckedCode");

      mocks.account = undefined;
      view.rerender(<Page account={checkedAccount} hasBonus />);
      expect(view.container.querySelector('[data-qa="rewards-share-code"]')?.textContent).toBe("CheckedCode");
    }
  );

  it("shares the connected wallet after an explicit connect click and resets on a new address check", async () => {
    const checkedAccount = "0x0000000000000000000000000000000000000002";
    const nextCheckedAccount = "0x0000000000000000000000000000000000000003";
    const connectedAccount = "0x0000000000000000000000000000000000000001";
    mocks.codesByAccount = {
      [checkedAccount]: { code: null, success: true },
      [nextCheckedAccount]: { code: "NextCheckedCode", success: true },
      [connectedAccount]: { code: "ConnectedCode", success: true },
    };
    const view = render(<Page account={checkedAccount} />);
    fireEvent.click(view.getByRole("button", { name: "Connect wallet to create a code" }));
    expect(mocks.connect).toHaveBeenCalledOnce();

    mocks.account = connectedAccount;
    view.rerender(<Page account={checkedAccount} />);
    expect(mocks.lookupCodes).toHaveBeenLastCalledWith(ARBITRUM, connectedAccount);
    expect(view.container.querySelector('[data-qa="rewards-share-code"]')?.textContent).toBe("ConnectedCode");
    await act(async () => fireEvent.click(view.getByRole("button", { name: "Copy link" })));
    expect(new URL(mocks.copyLink.mock.calls[0][0]).searchParams.get("ref")).toBe("ConnectedCode");

    mocks.account = undefined;
    view.rerender(<Page account={checkedAccount} />);
    expect(mocks.lookupCodes).toHaveBeenLastCalledWith(ARBITRUM, checkedAccount);
    expect(view.getByRole("button", { name: "Connect wallet to create a code" })).toBeTruthy();

    mocks.account = connectedAccount;
    view.rerender(<Page account={nextCheckedAccount} />);
    expect(mocks.lookupCodes).toHaveBeenLastCalledWith(ARBITRUM, nextCheckedAccount);
    expect(mocks.lookupBonus).toHaveBeenLastCalledWith(expect.any(String), undefined);
    expect(view.container.querySelector('[data-qa="rewards-share-code"]')?.textContent).toBe("NextCheckedCode");
    await act(async () => fireEvent.click(view.getByRole("button", { name: "Copy link" })));
    expect(new URL(mocks.copyLink.mock.calls[1][0]).searchParams.get("ref")).toBe("NextCheckedCode");
  });

  it("creates a code for a different connected wallet and immediately shows its share card", async () => {
    const checkedAccount = "0x0000000000000000000000000000000000000002";
    const connectedAccount = "0x0000000000000000000000000000000000000001";
    const view = render(<Page account={checkedAccount} hasBonus />);
    fireEvent.click(view.getByRole("button", { name: "Connect wallet to create a code" }));
    expect(mocks.connect).toHaveBeenCalledOnce();

    mocks.account = connectedAccount;
    mocks.connectedBonus = { manualRewardRemainingUsd: 0n };
    view.rerender(<Page account={checkedAccount} hasBonus />);
    fireEvent.click(view.getByRole("button", { name: "Create code and invite traders" }));
    fireEvent.change(view.getByRole("textbox", { name: "Your referral code" }), { target: { value: "NewCode" } });
    fireEvent.click(view.getByRole("button", { name: "Create code and invite traders" }));
    expect(mocks.creationParams).toHaveBeenLastCalledWith(expect.objectContaining({ account: connectedAccount }));
    expect(mocks.create).toHaveBeenCalledWith("NewCode");
    expect(view.queryByRole("button", { name: "Share on X" })).toBeNull();

    act(() => mocks.onCreated!("NewCode"));
    expect(view.getByRole("button", { name: "Share on X" })).toBeTruthy();
    expect(view.container.querySelector('[data-qa="rewards-share-code"]')?.textContent).toBe("NewCode");
    expect(view.queryByRole("button", { name: "Connect wallet to create a code" })).toBeNull();
    expect(view.queryByRole("button", { name: "Create code and invite traders" })).toBeNull();
    expect(view.queryAllByText("I'm getting +2x rewards")).toHaveLength(0);
    await act(async () => fireEvent.click(view.getByRole("button", { name: "Copy link" })));
    expect(new URL(mocks.copyLink.mock.calls[0][0]).searchParams.get("ref")).toBe("NewCode");

    mocks.account = "0x0000000000000000000000000000000000000003";
    view.rerender(<Page account={checkedAccount} hasBonus />);
    expect(view.queryByRole("button", { name: "Share on X" })).toBeNull();
    expect(view.getByRole("button", { name: "Create code and invite traders" })).toBeTruthy();
    expect(view.container.querySelector('[data-qa="rewards-share-code"]')?.textContent).toBe("GMX");
  });

  it("offers retry instead of code creation when ownership cannot be checked", () => {
    mocks.account = "0x0000000000000000000000000000000000000001";
    mocks.codes = { code: null, success: false, error: true };
    const view = render(<Page />);

    expect(view.getByRole("alert").textContent).toBe("Unable to load your referral codes.");
    expect(view.getByRole("button", { name: "Try again" })).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Try again" }));
    expect(mocks.retryCodes).toHaveBeenCalledOnce();
    expect(view.queryByRole("button", { name: "Create code and invite traders" })).toBeNull();
    expect(view.queryByRole("button", { name: "Share on X" })).toBeNull();
  });
});
