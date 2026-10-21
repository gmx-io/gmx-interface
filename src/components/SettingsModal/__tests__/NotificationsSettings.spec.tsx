import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { NotificationsSettings } from "../NotificationsSettings";

function renderTab() {
  return render(
    <I18nProvider i18n={i18n}>
      <NotificationsSettings />
    </I18nProvider>
  );
}

describe("NotificationsSettings", () => {
  beforeAll(() => {
    i18n.load("en", {});
    i18n.activate("en");
  });

  afterEach(cleanup);

  it("shows the device switch with the two live types and the delivery warning", () => {
    renderTab();

    expect(screen.getByText("Notifications on this device")).toBeDefined();
    expect(screen.getByText(/^Receiving as /)).toBeDefined();
    expect(screen.getByText("Position liquidated")).toBeDefined();
    expect(screen.getByText("Order executed")).toBeDefined();
    expect(screen.getByText("When your Limit, Take-Profit, Stop-Loss or Stop Market order executes")).toBeDefined();
    expect(
      screen.getByText("Delivery isn't guaranteed. Don't rely on notifications as your only risk control.")
    ).toBeDefined();
    expect(screen.getByText("Position liquidated").parentElement?.className).not.toContain("opacity");
    expect(screen.queryByText(/Notifi(?!cation)/)).toBeNull();
  });

  it("opens Good to know with the limits", () => {
    renderTab();

    const toggle = screen.getByRole("button", { name: "Good to know" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Notifications cover positions and orders on Arbitrum only")).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Notifications cover positions and orders on Arbitrum only")).toBeDefined();
    expect(screen.getByText("Notifications stop after 30 days without opening GMX on this device")).toBeDefined();
    expect(
      screen.getByText("On a computer, the browser must be running, but no GMX tab needs to be open")
    ).toBeDefined();
    expect(screen.getByText("Disconnecting the wallet doesn't stop notifications")).toBeDefined();
    expect(screen.getByText("Do Not Disturb can silence or delay notifications")).toBeDefined();
    expect(screen.getByText("Notifications aren't saved, so there's no history")).toBeDefined();
  });

  it("turns off this device with the switch and dims the types", () => {
    const { container } = renderTab();

    fireEvent.click(container.querySelector(".w-36")!);

    expect(screen.getByText("Turn them on to get liquidation and order notifications on this device.")).toBeDefined();
    expect(screen.queryByText(/^Receiving as /)).toBeNull();
    expect(screen.getByText("Position liquidated").parentElement?.className).toContain("opacity");
  });
});
