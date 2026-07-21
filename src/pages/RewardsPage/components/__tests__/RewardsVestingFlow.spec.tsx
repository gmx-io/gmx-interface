import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RewardsVestingFlow } from "../RewardsVestingFlow";

i18n.load({ en: {} });
i18n.activate("en");

afterEach(cleanup);

describe("RewardsVestingFlow", () => {
  it("keeps the designed three-step flow visible without enabling unresolved legacy transactions", () => {
    render(
      <I18nProvider i18n={i18n}>
        <RewardsVestingFlow />
      </I18nProvider>
    );

    expect(screen.getByText("Available esGMX")).toBeDefined();
    expect(screen.getByText("Vesting esGMX")).toBeDefined();
    expect(screen.getByText("Rewards")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);

    const unavailableActions = screen.getAllByRole("button", { name: "Coming soon" });
    expect(unavailableActions).toHaveLength(3);
    unavailableActions.forEach((button) => expect(button.hasAttribute("disabled")).toBe(true));
  });
});
