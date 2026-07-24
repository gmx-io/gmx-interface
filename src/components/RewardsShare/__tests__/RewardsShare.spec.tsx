import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import type { LeaderboardEntry } from "domain/synthetics/incentives/v2/types";

import { useShareCardActions } from "components/ShareModal/useShareCardActions";
import { useShareReferralCodeState } from "components/ShareModal/useShareReferralCodeState";

import { RewardsShare } from "../RewardsShare";

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const entry = {
  rank: 47,
  address: ACCOUNT,
  tradingVolume: 0n,
  referralVolume: 0n,
  esGmxRewards: 125_000_000_000_000_000_000n,
  gtRewards: 420_000_000n,
  rewardsUsd: 0n,
  multiplier: 250n,
} satisfies LeaderboardEntry;

const handleCopy = vi.fn();
const handleCopyImage = vi.fn();
const handleShareTwitter = vi.fn();
const handlePromptToCreateReferralCode = vi.fn();

vi.mock("components/Modal/ModalWithPortal", () => ({
  default: ({
    isVisible,
    label,
    children,
  }: {
    isVisible: boolean;
    label: React.ReactNode;
    children: React.ReactNode;
  }) =>
    isVisible ? (
      <div role="dialog" aria-label={String(label)}>
        {children}
      </div>
    ) : null,
}));

vi.mock("components/ShareModal/CreateReferralCode", () => ({
  default: () => <div data-testid="create-referral-code" />,
}));

vi.mock("components/ShareModal/useShareCardActions", () => ({
  useShareCardActions: vi.fn(),
}));

vi.mock("components/ShareModal/useShareReferralCodeState", () => ({
  useShareReferralCodeState: vi.fn(),
}));

vi.mock("lib/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: false }),
}));

vi.mock("lib/useLoadImage", () => ({
  default: () => "rewards-background.png",
}));

const mockUseShareCardActions = vi.mocked(useShareCardActions);
const mockUseShareReferralCodeState = vi.mocked(useShareReferralCodeState);

i18n.load({ en: {} });
i18n.activate("en");

describe("RewardsShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseShareReferralCodeState.mockReturnValue({
      shareAffiliateCode: { success: true, code: "GMX-REWARDS" },
      hasReferralCode: true,
      referralCodeOwnerKind: "created",
      code: "GMX-REWARDS",
      shouldShowCreateReferralCard: false,
      shouldPromptToCreateReferralCode: false,
      shouldShowSkipReferralCodeBanner: false,
      closeCreateReferralCodeInfoMessage: vi.fn(),
      handleReferralCodeSuccess: vi.fn(),
      handlePromptToCreateReferralCode,
    });
    mockUseShareCardActions.mockReturnValue({
      isUploading: false,
      uploadError: null,
      handleCopy,
      handleCopyImage,
      handleShareTwitter,
    });
  });

  afterEach(cleanup);

  it("connects the leaderboard card to copy, image, and X sharing actions", () => {
    render(
      <I18nProvider i18n={i18n}>
        <RewardsShare isOpen setIsOpen={vi.fn()} account={ACCOUNT} chainId={ARBITRUM} entry={entry} />
      </I18nProvider>
    );

    expect(screen.getByRole("dialog", { name: "Share your rewards" })).toBeTruthy();
    expect(mockUseShareReferralCodeState).toHaveBeenCalledWith({
      chainId: ARBITRUM,
      account: ACCOUNT,
      isOpen: true,
      source: "rewards-leaderboard",
    });
    expect(mockUseShareCardActions).toHaveBeenCalledWith(
      expect.objectContaining({
        shareAffiliateCode: { success: true, code: "GMX-REWARDS" },
        source: "rewards-leaderboard",
        fileName: "GMX Rewards.png",
        tweetText: "I'm ranked #47 on the @GMX_IO rewards leaderboard",
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy image" }));
    fireEvent.click(screen.getByRole("button", { name: "Share on" }));

    expect(handleCopy).toHaveBeenCalledOnce();
    expect(handleCopyImage).toHaveBeenCalledOnce();
    expect(handleShareTwitter).toHaveBeenCalledOnce();
  });

  it("uses the existing referral prompt before sharing when no code is selected", () => {
    mockUseShareReferralCodeState.mockReturnValue({
      shareAffiliateCode: { success: true, code: null },
      hasReferralCode: false,
      referralCodeOwnerKind: undefined,
      code: undefined,
      shouldShowCreateReferralCard: true,
      shouldPromptToCreateReferralCode: true,
      shouldShowSkipReferralCodeBanner: false,
      closeCreateReferralCodeInfoMessage: vi.fn(),
      handleReferralCodeSuccess: vi.fn(),
      handlePromptToCreateReferralCode,
    });

    render(
      <I18nProvider i18n={i18n}>
        <RewardsShare isOpen setIsOpen={vi.fn()} account={ACCOUNT} chainId={ARBITRUM} entry={entry} />
      </I18nProvider>
    );

    expect(screen.getByTestId("create-referral-code")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(handlePromptToCreateReferralCode).toHaveBeenCalledOnce();
    expect(handleCopy).not.toHaveBeenCalled();
  });
});
