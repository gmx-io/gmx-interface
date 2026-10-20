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

  it("shows the device switch, the two live types and the limits", () => {
    renderTab();

    expect(screen.getByText("Notifications on this device")).toBeDefined();
    expect(screen.getByText(/^Receiving as /)).toBeDefined();
    expect(screen.getByText("Liquidation")).toBeDefined();
    expect(screen.getByText("Order executed")).toBeDefined();
    expect(screen.getByText("Limit, Take-Profit, Stop-Loss and Stop Market.")).toBeDefined();
    expect(screen.getByText("Alerts cover Arbitrum positions and orders only.")).toBeDefined();
    expect(screen.getByText("Notifications stop after 30 days without opening GMX on this device.")).toBeDefined();
    expect(screen.getByText("Disconnecting the wallet doesn’t stop notifications.")).toBeDefined();
    expect(screen.queryByText(/Notifi(?!cation)/)).toBeNull();
  });

  it("turns off this device with the switch and says other devices keep theirs", () => {
    const { container } = renderTab();

    fireEvent.click(container.querySelector(".w-36")!);

    expect(screen.getByText("Turn them on to get liquidation and order alerts on this device.")).toBeDefined();
    expect(screen.getByText("Turning off only affects this device.")).toBeDefined();
    expect(screen.queryByText(/^Receiving as /)).toBeNull();
  });
});
