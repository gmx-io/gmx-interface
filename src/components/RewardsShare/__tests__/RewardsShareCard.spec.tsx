import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RewardsShareCard } from "../RewardsShareCard";

vi.mock("lib/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: false }),
}));

i18n.load({ en: {} });
i18n.activate("en");

describe("RewardsShareCard", () => {
  afterEach(cleanup);

  it("renders the V2 rank and token rewards with referral details", () => {
    render(
      <I18nProvider i18n={i18n}>
        <RewardsShareCard
          rank={47}
          esGmxRewards={125_123_400_000_000_000_000n}
          gtRewards={42_567_800_000n}
          referralCodeOwnerKind="created"
          code="GMX-REWARDS"
          loading={false}
          shareBgImg={null}
        />
      </I18nProvider>
    );

    expect(screen.getByText("I'm ranked #47 on GMX.")).toBeTruthy();
    expect(screen.getByText("Start trading with me.")).toBeTruthy();
    expect(screen.getByText("esGMX accrued")).toBeTruthy();
    expect(screen.getByText("125.1234 esGMX")).toBeTruthy();
    expect(screen.getByText("GT allocated")).toBeTruthy();
    expect(screen.getByText("4,256.78 GT")).toBeTruthy();
    expect(screen.getByText("Referral code")).toBeTruthy();
    expect(screen.getByText("GMX-REWARDS")).toBeTruthy();
  });
});
