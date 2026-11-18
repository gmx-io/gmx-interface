import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationsContextValue } from "context/NotificationsContext/NotificationsContextProvider";

import { NotificationsSettings } from "../NotificationsSettings";

const { mocks, ACCOUNT, NEW_ACCOUNT } = vi.hoisted(() => ({
  mocks: {
    value: {} as NotificationsContextValue,
    isBrave: false,
    blockedPlatform: "desktopChrome",
    openConnectModal: vi.fn(),
    copyToClipboard: vi.fn(),
    account: undefined as string | undefined,
  },
  ACCOUNT: "0x52908400098527886E0F7030069857D2E4169EE7",
  NEW_ACCOUNT: "0x8617E340B3D01FA5F11F306F4090FD50E238070D",
}));

vi.mock("context/NotificationsContext/NotificationsContextProvider", () => ({
  useNotificationsContext: () => mocks.value,
}));

vi.mock("context/ConnectModalContext/ConnectModalContext", () => ({
  useConnectModal: () => ({ openConnectModal: mocks.openConnectModal }),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: mocks.account }),
}));

vi.mock("domain/notifications/notificationsBrowser", () => ({
  getIsBrave: () => mocks.isBrave,
  getBlockedNotificationsPlatform: () => mocks.blockedPlatform,
}));

vi.mock("react-use", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useCopyToClipboard: () => [{}, mocks.copyToClipboard],
}));

vi.mock("lib/helperToast", () => ({
  helperToast: { success: vi.fn(), error: vi.fn() },
}));

function setValue(value: Partial<NotificationsContextValue>) {
  mocks.value = {
    status: "on",
    isTurnedOn: true,
    receivingAccount: ACCOUNT,
    pendingAccount: undefined,
    error: undefined,
    testState: undefined,
    turnOn: vi.fn(),
    turnOff: vi.fn(),
    retry: vi.fn(),
    sendTest: vi.fn(),
    ...value,
  };
}

function renderTab(isSettingsVisible = true) {
  const tree = (visible: boolean) => (
    <I18nProvider i18n={i18n}>
      <NotificationsSettings isSettingsVisible={visible} />
    </I18nProvider>
  );
  const result = render(tree(isSettingsVisible));

  return { ...result, rerenderTab: (visible = true) => result.rerender(tree(visible)) };
}

function getSwitch(container: HTMLElement) {
  return container.querySelector(".w-36");
}

const ARBITRUM_LINE = "Notifications cover positions and orders on Arbitrum only";

describe("NotificationsSettings", () => {
  beforeAll(() => {
    i18n.load("en", {});
    i18n.activate("en");
  });

  beforeEach(() => {
    mocks.isBrave = false;
    mocks.blockedPlatform = "desktopChrome";
    mocks.openConnectModal.mockReset();
    mocks.copyToClipboard.mockReset();
    mocks.account = ACCOUNT;
    setValue({});
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the wallet, the Arbitrum line, the two live types and the delivery warning", () => {
    renderTab();

    expect(screen.getByText("Notifications on this device")).toBeDefined();
    expect(screen.getByText(/^Receiving as 0x5290\.\.\.9EE7\. Turning off won't affect/)).toBeDefined();
    expect(screen.getByText(ARBITRUM_LINE)).toBeDefined();
    expect(screen.getByText("Position liquidated").parentElement?.className).not.toContain("opacity");
    expect(screen.getByText("When your Limit, Take-Profit, Stop-Loss or Stop Market order executes")).toBeDefined();
    expect(
      screen.getByText("Delivery isn't guaranteed. Don't rely on notifications as your only risk control.")
    ).toBeDefined();
    expect(screen.queryByText(/Notifi(?!cation)/)).toBeNull();
  });

  it("opens Good to know with the limits and without the Arbitrum line", () => {
    renderTab();

    const toggle = screen.getByRole("button", { name: "Good to know" });
    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByText(ARBITRUM_LINE)).toHaveLength(1);
    expect(screen.getByText("Notifications stop after 30 days without opening GMX on this device")).toBeDefined();
    expect(screen.getByText("Disconnecting the wallet doesn't stop notifications")).toBeDefined();
    expect(screen.getByText("Notifications aren't saved, so there's no history")).toBeDefined();
  });

  it("turns on from the switch and dims the types while off", () => {
    setValue({ status: "notAsked", isTurnedOn: false });
    const { container } = renderTab();

    expect(screen.getByText(/Your browser will ask you to allow them\./)).toBeDefined();
    expect(screen.getByText("Position liquidated").parentElement?.className).toContain("opacity");
    expect(screen.getByText(ARBITRUM_LINE)).toBeDefined();

    fireEvent.click(getSwitch(container)!);

    expect(mocks.value.turnOn).toHaveBeenCalledOnce();
  });

  it("turns off from the switch", () => {
    const { container } = renderTab();

    fireEvent.click(getSwitch(container)!);

    expect(mocks.value.turnOff).toHaveBeenCalledOnce();
  });

  it.each([
    ["turningOn", "Turning on..."],
    ["turningOff", "Turning off..."],
  ] as const)("shows the progress of %s and the switch does not react", (status, text) => {
    setValue({ status });
    const { container } = renderTab();

    expect(screen.getByText(text)).toBeDefined();
    expect(getSwitch(container)?.parentElement?.parentElement?.className).toContain("cursor-not-allowed");
    fireEvent.click(getSwitch(container)!);

    expect(mocks.value.turnOn).not.toHaveBeenCalled();
    expect(mocks.value.turnOff).not.toHaveBeenCalled();
  });

  it("shows the confirmation line after turning on until the modal closes", () => {
    setValue({ status: "off", isTurnedOn: false });
    // The provider shows the progress in the same render as the click.
    mocks.value.turnOn = vi.fn(() => {
      mocks.value = { ...mocks.value, status: "turningOn" };
    });
    const { container, rerenderTab } = renderTab();
    const confirmation = /GMX sent a notification to this device\. If it doesn't arrive/;

    fireEvent.click(getSwitch(container)!);
    expect(screen.getByText("Turning on...")).toBeDefined();
    setValue({ status: "on" });
    rerenderTab();

    expect(screen.getByText(confirmation)).toBeDefined();

    rerenderTab(false);
    rerenderTab(true);

    expect(screen.queryByText(confirmation)).toBeNull();
  });

  it("asks to connect a wallet when there is none", () => {
    setValue({ status: "noWallet", isTurnedOn: false, receivingAccount: undefined });
    const { container } = renderTab();

    fireEvent.click(screen.getByText("Connect wallet"));

    expect(mocks.openConnectModal).toHaveBeenCalledOnce();
    expect(getSwitch(container)).toBeNull();
  });

  it("shows the Home Screen steps on iPhone without a switch", () => {
    setValue({ status: "iosNotInstalled", isTurnedOn: false });
    const { container } = renderTab();

    expect(
      screen.getByText("On iPhone and iPad, notifications only work when GMX is on the Home Screen.")
    ).toBeDefined();
    expect(screen.getByText("Tap Share → Add to Home Screen, then open GMX from the Home Screen")).toBeDefined();
    expect(getSwitch(container)).toBeNull();
  });

  it("copies the page in a browser that can't show notifications or share", () => {
    setValue({ status: "unsupported", isTurnedOn: false });
    renderTab();

    expect(
      screen.getByText("This browser can't show notifications. Open GMX in your phone's or computer's browser.")
    ).toBeDefined();
    fireEvent.click(screen.getByText("Copy link"));

    expect(mocks.copyToClipboard).toHaveBeenCalledExactlyOnceWith(window.location.href);
  });

  it("shares the page where the browser can", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });
    setValue({ status: "unsupported", isTurnedOn: false });
    renderTab();

    fireEvent.click(screen.getByText("Share link"));

    await waitFor(() => expect(share).toHaveBeenCalledExactlyOnceWith({ url: window.location.href }));
    expect(mocks.copyToClipboard).not.toHaveBeenCalled();
  });

  it("copies the page when sharing fails", async () => {
    vi.stubGlobal("navigator", { ...navigator, share: vi.fn().mockRejectedValue(new Error("Not allowed")) });
    setValue({ status: "unsupported", isTurnedOn: false });
    renderTab();

    fireEvent.click(screen.getByText("Share link"));

    await waitFor(() => expect(mocks.copyToClipboard).toHaveBeenCalledExactlyOnceWith(window.location.href));
  });

  it.each([
    ["iosApp", "Open Settings → Notifications → GMX → Allow Notifications"],
    ["androidChrome", "Tap the icon to the left of the address bar → Permissions → Notifications"],
    ["desktopChrome", "Click the icon to the left of the address bar → Notifications → Allow"],
    ["other", "Allow notifications for this site in your browser's settings"],
  ])("shows the unblock steps for %s instead of the switch", (platform, steps) => {
    mocks.blockedPlatform = platform;
    setValue({ status: "blocked", isTurnedOn: false });
    const { container } = renderTab();

    expect(screen.getByText(steps)).toBeDefined();
    expect(getSwitch(container)).toBeNull();
  });

  it("shows the Brave setting above Try again after a failed turn-on in Brave", () => {
    mocks.isBrave = true;
    setValue({ status: "turnOnFailed", isTurnedOn: false });
    renderTab();

    const brave = screen.getByText(/In Brave, turn on "Use Google services for push messaging"/);
    const tryAgain = screen.getByText("Try again");
    expect(brave.compareDocumentPosition(tryAgain) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(tryAgain);

    expect(mocks.value.retry).toHaveBeenCalledOnce();
  });

  it("asks to try again at the device limit, which signs with the connected wallet", () => {
    setValue({ status: "limitReached", isTurnedOn: false, pendingAccount: ACCOUNT });
    renderTab();

    expect(
      screen.getByText("This wallet already gets notifications on 10 devices. Adding this one needs its signature.")
    ).toBeDefined();
    fireEvent.click(screen.getByText("Try again"));

    expect(mocks.value.retry).toHaveBeenCalledOnce();
  });

  it("asks to connect the wallet at the device limit when none is connected", () => {
    mocks.account = undefined;
    setValue({ status: "limitReached", isTurnedOn: false, pendingAccount: ACCOUNT });
    renderTab();

    fireEvent.click(screen.getByText("Connect wallet"));

    expect(mocks.openConnectModal).toHaveBeenCalledOnce();
    expect(screen.queryByText("Try again")).toBeNull();
  });

  it("shows a wallet switch at the device limit as a failed switch", () => {
    mocks.account = NEW_ACCOUNT;
    setValue({ status: "limitReached", pendingAccount: NEW_ACCOUNT });
    renderTab();

    expect(screen.getByText(/^Notifications didn't move to your new wallet 0x8617\.\.\.070D/)).toBeDefined();
  });

  it("shows the wallet that still gets notifications after a failed wallet switch", () => {
    setValue({ status: "walletSwitchFailed", pendingAccount: NEW_ACCOUNT });
    const { container } = renderTab();

    expect(
      screen.getByText("Notifications didn't move to your new wallet 0x8617...070D. They still go to 0x5290...9EE7.")
    ).toBeDefined();
    expect(getSwitch(container)?.className).toContain("bg-blue-400");

    fireEvent.click(screen.getByText("Try again"));

    expect(mocks.value.retry).toHaveBeenCalledOnce();
  });
});
