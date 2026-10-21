import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { PRECISION } from "lib/numbers";

import { ReturningTrader } from "./ReturningTrader";

const account = "0x1640e916e10610Ba39aAC5Cd8a08acF3cCae1A4c";
const otherAccount = "0x0000000000000000000000000000000000000001";
const mocks = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock("lib/userAnalytics/UserAnalytics", () => ({ userAnalytics: { pushEvent: vi.fn() } }));
vi.mock("lib/resolveEnsAddress", () => ({ resolveEnsAddress: mocks.resolve }));
vi.mock("domain/synthetics/incentives/v2/useReturnBonus", () => ({
  useReturnBonus: (_endpoint: string, address?: string) => ({
    data: address
      ? { manualRewardRemainingUsd: 2000n * 10n ** 30n, manualRewardCapUsd: 2000n * 10n ** 30n }
      : undefined,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  }),
  useReturnBonusHistory: (_endpoint: string, address?: string) => ({
    data: address ? { hasHistory: true, lifetimeVolume: 21000000n * 10n ** 30n } : undefined,
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  }),
}));
vi.mock("./RewardsReferralWallet", () => ({
  default: ({ account }: { account: string }) => <div data-testid="referral-account">{account}</div>,
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
  mocks.resolve.mockReset();
});
afterEach(cleanup);

function submit(view: ReturnType<typeof render>, value: string) {
  fireEvent.change(view.getByRole("textbox", { name: "Wallet address" }), { target: { value } });
  fireEvent.click(view.getByRole("button", { name: "Check wallet" }));
}

describe("returning trader checker", () => {
  it("reveals the resolved ENS address and ignores an older ENS response", async () => {
    let resolveOld!: (value: string) => void;
    mocks.resolve
      .mockImplementationOnce(
        () =>
          new Promise<string>((done) => {
            resolveOld = done;
          })
      )
      .mockResolvedValueOnce(account);
    const view = render(<Page />);
    submit(view, "old.eth");
    expect(view.queryByTestId("referral-account")).toBeNull();

    await act(async () => {
      submit(view, "trader.eth");
      await vi.dynamicImportSettled();
    });
    await waitFor(() => expect(view.getByTestId("referral-account").textContent).toBe(account));
    await act(async () => resolveOld(otherAccount));

    expect(view.getByTestId("referral-account").textContent).toBe(account);
    expect(view.container.querySelector('[data-qa="rewards-checked-address"]')?.textContent).toBe(account);
    expect(view.container.querySelectorAll('[data-qa="rewards-spoiler"]')).toHaveLength(0);
  });
});
