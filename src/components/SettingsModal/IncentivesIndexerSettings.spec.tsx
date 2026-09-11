import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import { IncentivesIndexerSettings } from "./IncentivesIndexerSettings";

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: vi.fn(),
}));

const mockUseSettings = vi.mocked(useSettings);

i18n.load({ en: {} });
i18n.activate("en");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("IncentivesIndexerSettings", () => {
  it("selects between ivprod and ivtest", () => {
    const setIncentivesTestSquid = vi.fn();
    mockUseSettings.mockReturnValue({
      incentivesTestSquid: "ivprod",
      setIncentivesTestSquid,
    } as unknown as ReturnType<typeof useSettings>);

    render(
      <I18nProvider i18n={i18n}>
        <IncentivesIndexerSettings />
      </I18nProvider>
    );

    const select = screen.getByRole("combobox", { name: "Incentives test squid" });
    expect(screen.getByRole("option", { name: "ivprod" })).toBeDefined();
    expect(screen.getByRole("option", { name: "ivtest" })).toBeDefined();

    fireEvent.change(select, { target: { value: "ivtest" } });

    expect(setIncentivesTestSquid).toHaveBeenCalledWith("ivtest");
  });
});
