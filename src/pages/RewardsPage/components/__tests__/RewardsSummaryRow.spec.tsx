import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { useLatestGtPrice } from "domain/synthetics/incentives/v2/useLatestGtPrice";
import type { RatioVestingData } from "domain/vesting/ratioVesting";
import { useRewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { PRECISION } from "lib/numbers";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";

import { RewardsSummaryRow } from "../RewardsSummaryRow";

vi.mock("domain/vesting/useRewardsVestingData", () => ({ useRewardsVestingData: vi.fn() }));
vi.mock("domain/synthetics/incentives/v2/useLatestGtPrice", () => ({ useLatestGtPrice: vi.fn() }));
vi.mock("lib/wallets/useIsWalletInitializing", () => ({ useIsWalletInitializing: vi.fn() }));
vi.mock("lib/userAnalytics/rewardsEvents", () => ({ sendRewardsNavigationEvent: vi.fn() }));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const GMX_UNIT = 10n ** BigInt(ES_GMX_DECIMALS);

const ratioVesting: RatioVestingData = {
  pairRatioFactor: 5n * 10n ** 30n,
  capUsedAmount: 0n,
  unpaidClaimAmount: 0n,
  deactivatedAt: 0n,
  isFrozen: false,
  isIssuerBindingConfirmed: true,
  esTokenAllowance: 0n,
  pairTokenAllowance: 0n,
  tranches: [],
};

function getVestingDataResult({
  vestableEsGmx = 5n * GMX_UNIT,
  vestedAmount = 0n,
  ratio,
}: {
  vestableEsGmx?: bigint;
  vestedAmount?: bigint;
  ratio?: RatioVestingData;
}): ReturnType<typeof useRewardsVestingData> {
  return {
    data: {
      walletGmxBalance: 0n,
      walletEsGmxBalance: vestableEsGmx,
      claimableEsGmxRewards: 0n,
      stakedGmxBalance: 0n,
      freePairAmount: 0n,
      vestingInfo: {
        pairAmount: 0n,
        vestedAmount,
        escrowedBalance: 0n,
        claimedAmounts: 0n,
        claimable: 0n,
        maxVestableAmount: vestableEsGmx + vestedAmount,
        averageStakedAmount: 0n,
      },
      vestingDuration: 365n * 24n * 60n * 60n,
      gmxPrice: 20n * PRECISION,
      ratioVesting: ratio,
    },
    vestableEsGmx,
    vestableEsGmxUsd: 100n * PRECISION,
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
  };
}

function getRouterEntries(path: string) {
  return [path];
}

i18n.load({ en: {} });
i18n.activate("en");

beforeEach(() => {
  vi.mocked(useIsWalletInitializing).mockReturnValue(false);
  vi.mocked(useLatestGtPrice).mockReturnValue({ data: undefined, loading: false } as ReturnType<
    typeof useLatestGtPrice
  >);
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("RewardsSummaryRow", () => {
  it.each<{
    name: string;
    path?: string;
    vesting?: Parameters<typeof getVestingDataResult>[0];
    link?: { name: string; href: string };
  }>([
    {
      name: "links to the highlighted Vesting tab and keeps the query",
      path: "/rewards/leaderboard?page=2",
      link: { name: "Start vesting", href: "/rewards/history?page=2&vesting=highlight" },
    },
    {
      name: "says Vest more with esGMX already vesting",
      vesting: { vestedAmount: 2n * GMX_UNIT },
      link: { name: "Vest more", href: "/rewards/history?vesting=highlight" },
    },
    {
      name: "shows the link from exactly 0.01 esGMX",
      vesting: { vestableEsGmx: GMX_UNIT / 100n },
      link: { name: "Start vesting", href: "/rewards/history?vesting=highlight" },
    },
    { name: "hides the link below 0.01 esGMX", vesting: { vestableEsGmx: GMX_UNIT / 100n - 1n } },
    { name: "hides the link on the Vesting tab", path: "/rewards/history" },
    { name: "hides the link while deposits are frozen", vesting: { ratio: { ...ratioVesting, isFrozen: true } } },
    { name: "hides the link once vesting is deactivated", vesting: { ratio: { ...ratioVesting, deactivatedAt: 1n } } },
  ])("$name", ({ path = "/rewards", vesting = {}, link }) => {
    vi.mocked(useRewardsVestingData).mockReturnValue(getVestingDataResult(vesting));

    const { container } = render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter initialEntries={getRouterEntries(path)}>
          <RewardsSummaryRow chainId={ARBITRUM} account={ACCOUNT} summaryState="ready" />
        </MemoryRouter>
      </I18nProvider>
    );

    const vestable = container.querySelector('[data-qa="rewards-summary-vestable-esgmx"]') as HTMLElement;
    const links = within(vestable).queryAllByRole("link");

    expect(links.map((element) => [element.textContent?.trim(), element.getAttribute("href")])).toEqual(
      link ? [[link.name, link.href]] : []
    );
  });
});
