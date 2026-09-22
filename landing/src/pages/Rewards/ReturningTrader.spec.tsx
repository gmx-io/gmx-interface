import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { PRECISION } from "lib/numbers";

import { ReturningTrader } from "./ReturningTrader";

const account = "0x1640e916e10610Ba39aAC5Cd8a08acF3cCae1A4c";
const otherAccount = "0x0000000000000000000000000000000000000001";
const mocks = vi.hoisted(() => ({
  remaining: 2000n * 10n ** 30n,
  cap: 2000n * 10n ** 30n,
  hasHistory: true,
  loading: false,
  validating: false,
  error: undefined as Error | undefined,
  resolve: vi.fn(),
  retry: vi.fn(),
  pushEvent: vi.fn(),
  referralReady: true,
  referralCode: true,
}));
vi.mock("lib/userAnalytics/UserAnalytics", () => ({ userAnalytics: { pushEvent: mocks.pushEvent } }));
vi.mock("lib/resolveEnsAddress", () => ({ resolveEnsAddress: mocks.resolve }));
vi.mock("landing/hooks/useSpoilerBlur", () => ({
  useSpoilerBlur: () => ({ sourceRef: { current: null }, canvasRef: { current: null }, ready: false }),
}));
vi.mock("domain/synthetics/incentives/v2/useReturnBonus", () => ({
  useReturnBonus: (_endpoint: string, address?: string) => ({
    data:
      address && !mocks.loading
        ? { manualRewardRemainingUsd: mocks.remaining, manualRewardCapUsd: mocks.cap }
        : undefined,
    error: address ? mocks.error : undefined,
    isLoading: Boolean(address && mocks.loading),
    isValidating: Boolean(address && (mocks.loading || mocks.validating)),
    mutate: mocks.retry,
  }),
  useReturnBonusHistory: (_endpoint: string, address?: string) => ({
    data: address
      ? { hasHistory: mocks.hasHistory, lifetimeVolume: mocks.hasHistory ? 21000000n * 10n ** 30n : null }
      : undefined,
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }),
}));
vi.mock("./RewardsReferralWallet", () => ({
  default: function MockRewardsReferralWallet({
    account,
    onResultRevealed,
  }: {
    account: string;
    onResultRevealed: (hasCode: boolean) => void;
  }) {
    useEffect(() => {
      if (mocks.referralReady) onResultRevealed(mocks.referralCode);
    }, [onResultRevealed]);
    return <div data-testid="referral-account">{account}</div>;
  },
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
  stakingTiers: [{ tier: "Tier1", threshold: 10n * 10n ** 18n, multiplier: 100n }],
  boosts: [{ boost: "ManualAllocation", multiplier: 200n }],
  featuredMarketTokens: [],
  downgradingFactors: [],
  balancingTradesThreshold: 1000000n * PRECISION,
  lifetimeVolumeThreshold: 200000000n * PRECISION,
  manualAllocationTiers: [],
};
function Page() {
  return (
    <I18nProvider i18n={i18n}>
      <ReturningTrader config={config} loading={false} endpoint="https://example.com/graphql" />
    </I18nProvider>
  );
}
beforeEach(() => {
  i18n.load("en", {});
  i18n.activate("en");
  mocks.remaining = mocks.cap = 2000n * PRECISION;
  mocks.hasHistory = true;
  mocks.loading = false;
  mocks.validating = false;
  mocks.error = undefined;
  mocks.resolve.mockReset();
  mocks.retry.mockReset();
  mocks.pushEvent.mockReset();
  mocks.referralReady = true;
  mocks.referralCode = true;
});
afterEach(cleanup);

function submit(view: ReturnType<typeof render>, value: string) {
  fireEvent.change(view.getByRole("textbox", { name: "Wallet address" }), { target: { value } });
  fireEvent.click(view.getByRole("button", { name: "Check wallet" }));
}

describe("returning trader checker", () => {
  it("tracks completed input once and check clicks without sending the entered address", async () => {
    const view = render(<Page />);
    const input = view.getByRole("textbox", { name: "Wallet address" });
    fireEvent.change(input, { target: { value: account } });
    expect(mocks.pushEvent).not.toHaveBeenCalled();
    fireEvent.blur(input);
    await act(async () => {
      fireEvent.click(view.getByRole("button", { name: "Check wallet" }));
      await vi.dynamicImportSettled();
    });
    expect(mocks.pushEvent.mock.calls.map(([event]) => event.data).slice(0, 2)).toEqual([
      { action: "ComebackBlockAction", type: "AddressEntered" },
      { action: "ComebackBlockAction", type: "CheckClicked" },
    ]);
    expect(mocks.pushEvent.mock.calls.filter(([event]) => event.data.type === "AddressEntered")).toHaveLength(1);
  });

  it.each([true, false])(
    "reports the revealed result once with referral status and rewards (bonus: %s)",
    async (hasBonus) => {
      mocks.remaining = hasBonus ? 2000n * PRECISION : 0n;
      mocks.referralCode = hasBonus;
      const view = render(<Page />);
      await act(async () => {
        submit(view, account);
        await vi.dynamicImportSettled();
      });
      view.rerender(<Page />);
      const resultEvents = mocks.pushEvent.mock.calls.filter(([event]) => event.data.type === "ResultRevealed");
      expect(resultEvents).toHaveLength(1);
      expect(resultEvents[0][0]).toEqual({
        event: "RewardsLandingPageAction",
        data: {
          action: "ComebackBlockAction",
          type: "ResultRevealed",
          rewards_exist: hasBonus,
          ref_code_exist: hasBonus,
          rewards: hasBonus ? 2000 : 0,
        },
      });
    }
  );

  it("does not report results while the bonus or referral status is unknown or the request failed", async () => {
    mocks.loading = true;
    const view = render(<Page />);
    submit(view, account);
    expect(mocks.pushEvent.mock.calls.some(([event]) => event.data.type === "ResultRevealed")).toBe(false);
    mocks.loading = false;
    mocks.referralReady = false;
    await act(async () => {
      view.rerender(<Page />);
      await vi.dynamicImportSettled();
    });
    expect(mocks.pushEvent.mock.calls.some(([event]) => event.data.type === "ResultRevealed")).toBe(false);
    mocks.error = new Error("Unavailable");
    view.rerender(<Page />);
    expect(mocks.pushEvent.mock.calls.some(([event]) => event.data.type === "ResultRevealed")).toBe(false);
  });

  it("focuses the address field without revealing either initial card", () => {
    const view = render(<Page />);
    fireEvent.click(view.getByRole("button", { name: "Enter any wallet to see Comeback Bonus" }));
    expect(document.activeElement).toBe(view.getByRole("textbox", { name: "Wallet address" }));
    expect(view.container.querySelectorAll(".rewards-spoiler")).toHaveLength(2);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });

  it("keeps both cards masked until a wallet without a bonus has finished loading", async () => {
    mocks.loading = true;
    mocks.cap = mocks.remaining = 0n;
    const view = render(<Page />);
    submit(view, account);

    expect(view.getByRole("button", { name: "Checking..." })).toBeTruthy();
    expect(view.queryByRole("heading", { name: "On every trade" })).toBeNull();
    expect(view.queryByRole("button", { name: "Enter any wallet to see Comeback Bonus" })).toBeNull();
    expect(view.container.querySelectorAll(".rewards-spoiler")).toHaveLength(2);
    expect(view.queryByTestId("referral-account")).toBeNull();

    mocks.loading = false;
    await act(async () => {
      view.rerender(<Page />);
      await vi.dynamicImportSettled();
    });

    expect(view.getByRole("heading", { name: "Keep building your rewards" })).toBeTruthy();
    expect(view.queryByRole("heading", { name: "On every trade" })).toBeNull();
    await waitFor(() => expect(view.getByTestId("referral-account").textContent).toBe(account));
    expect(view.container.querySelectorAll(".rewards-spoiler")).toHaveLength(0);
  });

  it("masks a cached bonus during a repeat check that returns no remaining bonus", async () => {
    const view = render(<Page />);
    await act(async () => {
      submit(view, account);
      await vi.dynamicImportSettled();
    });
    await waitFor(() => expect(view.getByTestId("referral-account")).toBeTruthy());
    expect(view.getByRole("heading", { name: "On every trade" })).toBeTruthy();

    fireEvent.click(view.getByRole("button", { name: "Check wallet" }));
    expect(mocks.retry).toHaveBeenCalledOnce();
    mocks.validating = true;
    view.rerender(<Page />);

    expect(view.queryByRole("heading", { name: "On every trade" })).toBeNull();
    expect(view.container.querySelectorAll(".rewards-spoiler")).toHaveLength(2);
    expect(view.queryByTestId("referral-account")).toBeNull();

    mocks.validating = false;
    mocks.remaining = 0n;
    view.rerender(<Page />);

    expect(view.getByRole("heading", { name: "Your comeback boost is fully used" })).toBeTruthy();
    expect(view.queryByRole("heading", { name: "On every trade" })).toBeNull();
    await waitFor(() => expect(view.getByTestId("referral-account")).toBeTruthy());
  });

  it("resolves ENS before revealing results and preserves the resolved address", async () => {
    mocks.resolve.mockResolvedValueOnce(account);
    const view = render(<Page />);
    await act(async () => {
      submit(view, "trader.eth");
      await vi.dynamicImportSettled();
    });
    await waitFor(() => expect(view.getByTestId("referral-account").textContent).toBe(account));
    expect(view.container.querySelector(".rewards-checked-address")?.textContent).toBe(account);
    expect(view.container.querySelectorAll(".rewards-spoiler")).toHaveLength(0);
  });

  it("ignores an old ENS response after a different wallet is entered and checked", async () => {
    let resolve!: (value: string) => void;
    mocks.resolve.mockImplementationOnce(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        })
    );
    const view = render(<Page />);
    submit(view, "old.eth");
    submit(view, otherAccount);
    await act(async () => resolve(account));
    await waitFor(() => expect(view.getByTestId("referral-account").textContent).toBe(otherAccount));
    expect(view.container.querySelector(".rewards-checked-address")?.textContent).toBe(otherAccount);
  });

  it("keeps the mask and gives a useful error for an ENS name without an address", async () => {
    mocks.resolve.mockResolvedValueOnce(null);
    const view = render(<Page />);
    submit(view, "missing.eth");
    await waitFor(() =>
      expect(view.getByRole("alert").textContent).toBe("No wallet address was found for this ENS name")
    );
    expect(view.container.querySelectorAll(".rewards-spoiler")).toHaveLength(2);
  });

  it("renders the fresh-wallet illustration and configured staking entry tier", async () => {
    mocks.cap = mocks.remaining = 0n;
    mocks.hasHistory = false;
    const view = render(<Page />);
    submit(view, account);
    expect(view.getByRole("heading", { name: "You're starting fresh" })).toBeTruthy();
    expect(view.getByText(/Stake just/).textContent).toContain("Stake just 10 GMX to start at +1x");
    await waitFor(() => expect(view.getByTestId("referral-account")).toBeTruthy());
  });

  it("distinguishes an exhausted allocation from a wallet with no trading history", async () => {
    mocks.remaining = 0n;
    const view = render(<Page />);
    submit(view, account);
    expect(view.getByRole("heading", { name: "Your comeback boost is fully used" })).toBeTruthy();
    expect(view.queryByText("No history here yet, so no comeback boost.")).toBeNull();
    await waitFor(() => expect(view.getByTestId("referral-account")).toBeTruthy());
  });

  it("retains an explicit retry state when the rewards service fails", () => {
    mocks.error = new Error("Unavailable");
    const view = render(<Page />);
    submit(view, account);
    expect(view.getByRole("alert").textContent).toContain("Unable to check this wallet");
    fireEvent.click(view.getByRole("button", { name: "Try again" }));
    expect(mocks.retry).toHaveBeenCalledOnce();
    expect(view.queryByText("You're starting fresh")).toBeNull();
  });
});
