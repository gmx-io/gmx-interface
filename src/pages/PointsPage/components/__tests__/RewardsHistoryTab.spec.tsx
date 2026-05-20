import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("img/ic_chevron_down.svg?react", () => ({
  default: (props: any) => <svg data-testid="chevron-down" {...props} />,
}));

const incentivesConfigMock = vi.hoisted(() => ({
  data: {
    epochTimestamp: 1700000000,
    epochDuration: 604800,
  } as { epochTimestamp: number; epochDuration: number } | undefined,
  loading: false,
  error: undefined as Error | undefined,
}));

vi.mock("domain/synthetics/incentives/useIncentivesConfig", () => ({
  useIncentivesConfig: () => ({
    data: incentivesConfigMock.data,
    loading: incentivesConfigMock.loading,
    error: incentivesConfigMock.error,
  }),
}));

const rewardsHistoryMock = vi.hoisted(() => ({
  data: undefined as any[] | undefined,
  totalCount: undefined as number | undefined,
  loading: false,
  error: undefined as Error | undefined,
}));

vi.mock("domain/synthetics/incentives/useAccountRewardsHistory", () => ({
  useAccountRewardsHistory: () => ({
    data: rewardsHistoryMock.data,
    totalCount: rewardsHistoryMock.totalCount,
    hasNextPage: false,
    error: rewardsHistoryMock.error,
    loading: rewardsHistoryMock.loading,
  }),
}));

vi.mock("domain/legacy", () => ({
  useGmxPrice: () => ({ gmxPrice: 0n }),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ active: false, signer: undefined }),
}));

vi.mock("lib/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: false }),
}));

import { RewardsHistoryTab } from "../RewardsHistoryTab";

i18n.load({ en: {} });
i18n.activate("en");

const ARBITRUM_CHAIN_ID = 42161;
const ACCOUNT = "0x1111111111111111111111111111111111111111";

afterEach(() => {
  incentivesConfigMock.data = {
    epochTimestamp: 1700000000,
    epochDuration: 604800,
  };
  incentivesConfigMock.loading = false;
  incentivesConfigMock.error = undefined;
  rewardsHistoryMock.data = undefined;
  rewardsHistoryMock.totalCount = undefined;
  rewardsHistoryMock.loading = false;
  rewardsHistoryMock.error = undefined;
  cleanup();
});

describe("RewardsHistoryTab", () => {
  it("renders a failed state when rewards history cannot be loaded", () => {
    rewardsHistoryMock.error = new Error("blocked");

    render(
      <I18nProvider i18n={i18n}>
        <RewardsHistoryTab chainId={ARBITRUM_CHAIN_ID} account={ACCOUNT} />
      </I18nProvider>
    );

    expect(screen.getByText("Rewards history is temporarily unavailable. Please try again later.")).toBeTruthy();
  });

  it("renders a failed state when incentives config cannot be loaded", () => {
    incentivesConfigMock.data = undefined;
    incentivesConfigMock.error = new Error("blocked");

    render(
      <I18nProvider i18n={i18n}>
        <RewardsHistoryTab chainId={ARBITRUM_CHAIN_ID} account={ACCOUNT} />
      </I18nProvider>
    );

    expect(screen.getByText("Rewards history is temporarily unavailable. Please try again later.")).toBeTruthy();
  });
});
