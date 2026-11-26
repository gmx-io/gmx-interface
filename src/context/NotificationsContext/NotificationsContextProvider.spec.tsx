import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NOTIFICATIONS_DEVICE_KEY } from "config/localStorage";
import type { StoredNotificationsDevice } from "domain/notifications/deviceRegistration";
import { NotificationsApiError, REGISTRATION_LIMIT_REACHED } from "domain/notifications/notificationsApi";

import { NotificationsContextProvider, useNotificationsContext } from "./NotificationsContextProvider";
import type { NotificationsContextValue } from "./NotificationsContextProvider";

const { mocks, ACCOUNT, OTHER_ACCOUNT, ENDPOINT } = vi.hoisted(() => ({
  mocks: {
    account: undefined as string | undefined,
    permission: "default" as NotificationPermission,
    subscriptionEndpoint: undefined as string | undefined,
    registerThisDevice: vi.fn(),
    sendTestNotification: vi.fn(),
    unregisterNotificationsDevice: vi.fn(),
    unsubscribe: vi.fn(),
    signMessage: vi.fn(),
    toastError: vi.fn(),
    pushEvent: vi.fn(),
  },
  ACCOUNT: "0x52908400098527886E0F7030069857D2E4169EE7",
  OTHER_ACCOUNT: "0x8617E340B3D01FA5F11F306F4090FD50E238070D",
  ENDPOINT: "https://fcm.googleapis.com/fcm/send/device",
}));

vi.mock("lib/helperToast", () => ({
  helperToast: { error: mocks.toastError },
}));

vi.mock("lib/userAnalytics", () => ({
  userAnalytics: { pushEvent: mocks.pushEvent, getIsCommonParamsInited: () => true },
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: mocks.account, signer: {} }),
}));

vi.mock("lib/wallets/useIsWalletInitializing", () => ({
  useIsWalletInitializing: () => false,
}));

vi.mock("lib/wallets/signing", () => ({
  signMessage: mocks.signMessage,
}));

vi.mock("domain/notifications/pushSubscription", () => ({
  getNotificationsSupport: () => "supported",
  getNotificationPermission: () => mocks.permission,
  getExistingPushSubscription: async () => ({ endpoint: mocks.subscriptionEndpoint, unsubscribe: mocks.unsubscribe }),
}));

vi.mock("domain/notifications/deviceRegistration", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  registerThisDevice: mocks.registerThisDevice,
}));

vi.mock("domain/notifications/notificationsApi", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendTestNotification: mocks.sendTestNotification,
  unregisterNotificationsDevice: mocks.unregisterNotificationsDevice,
}));

function storeDevice(device: StoredNotificationsDevice) {
  localStorage.setItem(JSON.stringify(NOTIFICATIONS_DEVICE_KEY), JSON.stringify(device));
}

function readDevice(): StoredNotificationsDevice {
  return JSON.parse(localStorage.getItem(JSON.stringify(NOTIFICATIONS_DEVICE_KEY)) ?? "null");
}

function renderNotifications() {
  const result = { current: undefined as unknown as NotificationsContextValue };

  function Consumer() {
    result.current = useNotificationsContext();
    return null;
  }

  // A new element each time, or React skips the render with the changed wallet.
  const tree = () => (
    <NotificationsContextProvider>
      <Consumer />
    </NotificationsContextProvider>
  );
  const { rerender } = render(tree());

  return { result, rerender: () => rerender(tree()) };
}

// The API answers 409 without a signature and registers the device with one.
async function registerAtLimit({ sign }: { sign?: (message: string) => Promise<string> }) {
  if (!sign) {
    throw new NotificationsApiError("limit", 409, REGISTRATION_LIMIT_REACHED);
  }
  await sign("message");
  return { endpoint: ENDPOINT };
}

function turnOnResults() {
  return mocks.pushEvent.mock.calls
    .map(([{ data }]) => data)
    .filter(({ action }) => action === "TurnOnResult")
    .map(({ result, isRetry }) => [result, isRetry]);
}

const requestPermission = vi.fn(async (): Promise<NotificationPermission> => {
  mocks.permission = "granted";
  return mocks.permission;
});

describe("NotificationsContextProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.toastError.mockReset();
    mocks.pushEvent.mockReset();
    mocks.account = ACCOUNT;
    mocks.permission = "default";
    mocks.subscriptionEndpoint = ENDPOINT;
    mocks.registerThisDevice.mockReset().mockResolvedValue({ endpoint: ENDPOINT });
    mocks.sendTestNotification.mockReset().mockResolvedValue(undefined);
    mocks.unregisterNotificationsDevice.mockReset().mockResolvedValue(undefined);
    mocks.unsubscribe.mockReset().mockResolvedValue(true);
    mocks.signMessage.mockReset().mockResolvedValue("0xsigned");
    requestPermission.mockClear();
    vi.stubGlobal("Notification", { requestPermission });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sends no request on a device that never turned on, also when the browser allows notifications", async () => {
    mocks.permission = "granted";
    const { result } = renderNotifications();

    await act(async () => undefined);

    expect(result.current.status).toBe("off");
    expect(mocks.registerThisDevice).not.toHaveBeenCalled();
    expect(mocks.unregisterNotificationsDevice).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("asks to connect a wallet when there is no wallet and no earlier one", () => {
    mocks.account = undefined;

    expect(renderNotifications().result.current.status).toBe("noWallet");
  });

  it("asks for permission on turn-on, registers the wallet and sends one confirmation", async () => {
    const { result } = renderNotifications();

    act(() => result.current.turnOn());

    expect(requestPermission).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("turningOn");
    await waitFor(() => expect(result.current.status).toBe("on"));
    expect(mocks.registerThisDevice).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ account: ACCOUNT }));
    expect(mocks.sendTestNotification).toHaveBeenCalledExactlyOnceWith(ENDPOINT);
    expect(result.current.receivingAccount).toBe(ACCOUNT);
    expect(readDevice()).toMatchObject({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
  });

  it("starts nothing else while turning on, also for clicks before the next render", async () => {
    const { result } = renderNotifications();
    const { turnOn, turnOff } = result.current;

    act(() => {
      turnOn();
      turnOn();
      turnOff();
    });
    act(() => result.current.turnOff());

    await waitFor(() => expect(result.current.status).toBe("on"));
    expect(requestPermission).toHaveBeenCalledOnce();
    expect(mocks.registerThisDevice).toHaveBeenCalledOnce();
    expect(mocks.unregisterNotificationsDevice).not.toHaveBeenCalled();
  });

  it("stays off when the user refuses the permission", async () => {
    requestPermission.mockImplementationOnce(async () => {
      mocks.permission = "denied";
      return mocks.permission;
    });
    const { result } = renderNotifications();

    act(() => result.current.turnOn());

    await waitFor(() => expect(result.current.status).toBe("blocked"));
    expect(mocks.registerThisDevice).not.toHaveBeenCalled();
  });

  it("shows a failed turn-on, and a retry asks for no permission", async () => {
    mocks.registerThisDevice.mockRejectedValueOnce(new NotificationsApiError("unavailable", 503));
    const { result } = renderNotifications();

    act(() => result.current.turnOn());
    await waitFor(() => expect(result.current.status).toBe("turnOnFailed"));
    expect(result.current.error).toBe("unavailable");

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("on"));
    expect(requestPermission).toHaveBeenCalledOnce();
    expect(turnOnResults()).toEqual([
      ["failed", false],
      ["on", true],
    ]);
  });

  it("re-registers an enabled device at app open without a confirmation", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    const { result } = renderNotifications();

    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledOnce());
    expect(mocks.registerThisDevice).toHaveBeenCalledWith(expect.objectContaining({ account: ACCOUNT }));
    expect(mocks.sendTestNotification).not.toHaveBeenCalled();
    expect(result.current.status).toBe("on");
    expect(turnOnResults()).toEqual([]);
  });

  it("keeps the last wallet with no wallet connected", async () => {
    mocks.account = undefined;
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    const { result } = renderNotifications();

    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledOnce());
    expect(mocks.registerThisDevice).toHaveBeenCalledWith(expect.objectContaining({ account: ACCOUNT }));
    expect(result.current.receivingAccount).toBe(ACCOUNT);
  });

  it("moves notifications to a new wallet", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    const { result, rerender } = renderNotifications();
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledOnce());

    mocks.account = OTHER_ACCOUNT;
    rerender();

    await waitFor(() => expect(result.current.receivingAccount).toBe(OTHER_ACCOUNT));
    expect(mocks.registerThisDevice).toHaveBeenLastCalledWith(expect.objectContaining({ account: OTHER_ACCOUNT }));
    expect(mocks.sendTestNotification).not.toHaveBeenCalled();
  });

  it("shows a failed wallet switch with the wallet that still gets notifications, and retries it", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    const { result, rerender } = renderNotifications();
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledOnce());

    mocks.registerThisDevice.mockRejectedValueOnce(new NotificationsApiError("unavailable", 503));
    mocks.account = OTHER_ACCOUNT;
    rerender();

    await waitFor(() => expect(result.current.status).toBe("walletSwitchFailed"));
    expect(result.current.receivingAccount).toBe(ACCOUNT);
    expect(result.current.pendingAccount).toBe(OTHER_ACCOUNT);
    expect(mocks.toastError).toHaveBeenCalledExactlyOnceWith("Notifications didn't move to your new wallet");

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe("on"));
    expect(result.current.receivingAccount).toBe(OTHER_ACCOUNT);
    expect(mocks.toastError).toHaveBeenCalledOnce();
  });

  it("subscribes again when notifications are allowed again after being blocked", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    const { result } = renderNotifications();
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledOnce());

    mocks.permission = "denied";
    fireEvent(document, new Event("visibilitychange"));
    expect(result.current.status).toBe("blocked");
    mocks.permission = "granted";
    fireEvent(document, new Event("visibilitychange"));

    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledTimes(2));
    expect(result.current.status).toBe("on");
    expect(mocks.sendTestNotification).not.toHaveBeenCalled();
  });

  it("shows a failed turn-on when subscribing again fails, also after a wallet switch while blocked", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    const { result, rerender } = renderNotifications();
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledOnce());

    mocks.permission = "denied";
    fireEvent(document, new Event("visibilitychange"));
    mocks.account = OTHER_ACCOUNT;
    rerender();
    await act(async () => undefined);
    mocks.registerThisDevice.mockRejectedValueOnce(new NotificationsApiError("unavailable", 503));
    mocks.permission = "granted";
    fireEvent(document, new Event("visibilitychange"));

    await waitFor(() => expect(result.current.status).toBe("turnOnFailed"));
    expect(result.current.error).toBe("unavailable");
    expect(mocks.toastError).not.toHaveBeenCalled();

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe("on"));
    expect(result.current.receivingAccount).toBe(OTHER_ACCOUNT);
    expect(mocks.registerThisDevice).toHaveBeenCalledTimes(3);
  });

  it("shows a failed turn-on when the app-open sync fails after the browser replaced the subscription", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: "https://fcm.googleapis.com/fcm/send/dropped" });
    mocks.registerThisDevice.mockRejectedValueOnce(new NotificationsApiError("unavailable", 503));
    const { result } = renderNotifications();

    await waitFor(() => expect(result.current.status).toBe("turnOnFailed"));

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe("on"));
    expect(mocks.sendTestNotification).toHaveBeenCalledExactlyOnceWith(ENDPOINT);
  });

  it("drops a failed wallet switch once the receiving wallet is connected again", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    const { result, rerender } = renderNotifications();
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledOnce());

    mocks.registerThisDevice.mockRejectedValueOnce(new NotificationsApiError("unavailable", 503));
    mocks.account = OTHER_ACCOUNT;
    rerender();
    await waitFor(() => expect(result.current.status).toBe("walletSwitchFailed"));

    mocks.account = ACCOUNT;
    rerender();

    await waitFor(() => expect(result.current.status).toBe("on"));
    expect(mocks.registerThisDevice).toHaveBeenCalledTimes(2);
  });

  it("settles on the latest wallet after quick switches", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    let resolveFirst: () => void = () => undefined;
    mocks.registerThisDevice.mockImplementationOnce(
      () => new Promise((resolve) => (resolveFirst = () => resolve({ endpoint: ENDPOINT })))
    );
    const { result, rerender } = renderNotifications();
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledOnce());

    mocks.account = OTHER_ACCOUNT;
    rerender();
    mocks.account = "0x0000000000000000000000000000000000000003";
    rerender();
    await act(async () => resolveFirst());

    await waitFor(() => expect(result.current.receivingAccount).toBe("0x0000000000000000000000000000000000000003"));
    expect(mocks.registerThisDevice).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["succeeds", 3],
    ["fails", 2],
  ])("stays on the first wallet when it is connected again before the switch away %s", async (outcome, calls) => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    const { result, rerender } = renderNotifications();
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledOnce());

    let settleSwitch: () => void = () => undefined;
    mocks.registerThisDevice.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          settleSwitch = () =>
            outcome === "succeeds"
              ? resolve({ endpoint: ENDPOINT })
              : reject(new NotificationsApiError("unavailable", 503));
        })
    );
    mocks.account = OTHER_ACCOUNT;
    rerender();
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledTimes(2));
    mocks.account = ACCOUNT;
    rerender();
    await act(async () => settleSwitch());

    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledTimes(calls));
    await act(async () => undefined);
    expect(mocks.registerThisDevice).toHaveBeenLastCalledWith(
      expect.objectContaining({ account: outcome === "succeeds" ? ACCOUNT : OTHER_ACCOUNT })
    );
    expect(result.current.status).toBe("on");
    expect(result.current.receivingAccount).toBe(ACCOUNT);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("moves a turn-on to the wallet connected while it ran", async () => {
    mocks.permission = "granted";
    let finishTurnOn: () => void = () => undefined;
    mocks.registerThisDevice.mockImplementationOnce(
      () => new Promise((resolve) => (finishTurnOn = () => resolve({ endpoint: ENDPOINT })))
    );
    const { result, rerender } = renderNotifications();

    act(() => result.current.turnOn());
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledOnce());
    mocks.account = OTHER_ACCOUNT;
    rerender();
    await act(async () => finishTurnOn());

    await waitFor(() => expect(result.current.receivingAccount).toBe(OTHER_ACCOUNT));
    expect(mocks.registerThisDevice).toHaveBeenLastCalledWith(expect.objectContaining({ account: OTHER_ACCOUNT }));
    expect(result.current.status).toBe("on");
  });

  it("ends off when turned off during a wallet switch that hits the device limit", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    const { result, rerender } = renderNotifications();
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledOnce());

    let failSwitch: () => void = () => undefined;
    mocks.registerThisDevice.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          failSwitch = () => reject(new NotificationsApiError("limit", 409, REGISTRATION_LIMIT_REACHED));
        })
    );
    mocks.account = OTHER_ACCOUNT;
    rerender();
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledTimes(2));
    act(() => result.current.turnOff());
    await act(async () => failSwitch());

    await waitFor(() => expect(result.current.status).toBe("off"));
    expect(result.current.pendingAccount).toBeUndefined();
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.unregisterNotificationsDevice).toHaveBeenCalledExactlyOnceWith(ENDPOINT);
  });

  it("turns off without a signature and stays off after a wallet switch and a reopen", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    const { result, rerender } = renderNotifications();
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledOnce());

    act(() => result.current.turnOff());

    await waitFor(() => expect(result.current.status).toBe("off"));
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.unregisterNotificationsDevice).toHaveBeenCalledExactlyOnceWith(ENDPOINT);
    expect(mocks.signMessage).not.toHaveBeenCalled();
    expect(readDevice()).toEqual({ enabled: false, account: ACCOUNT });

    mocks.account = OTHER_ACCOUNT;
    rerender();
    cleanup();
    renderNotifications();
    await act(async () => undefined);

    expect(mocks.registerThisDevice).toHaveBeenCalledOnce();
  });

  it("keeps the device off after a turn-off in another tab, also on a wallet switch", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    const tab = renderNotifications();
    const otherTab = renderNotifications();
    await waitFor(() => expect(mocks.registerThisDevice).toHaveBeenCalledTimes(2));

    act(() => otherTab.result.current.turnOff());
    await waitFor(() => expect(otherTab.result.current.status).toBe("off"));
    mocks.account = OTHER_ACCOUNT;
    tab.rerender();
    otherTab.rerender();
    await act(async () => undefined);

    expect(mocks.registerThisDevice).toHaveBeenCalledTimes(2);
    expect(readDevice()).toMatchObject({ enabled: false, account: ACCOUNT });

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: JSON.stringify(NOTIFICATIONS_DEVICE_KEY) }));
    });
    expect(tab.result.current.status).toBe("off");
  });

  it("retries a failed unregister at the next app open", async () => {
    mocks.unregisterNotificationsDevice.mockRejectedValueOnce(new NotificationsApiError("Failed to fetch"));
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    const { result } = renderNotifications();

    act(() => result.current.turnOff());
    await waitFor(() => expect(result.current.status).not.toBe("turningOff"));
    expect(readDevice().unregisterEndpoint).toBe(ENDPOINT);

    cleanup();
    renderNotifications();

    await waitFor(() => expect(mocks.unregisterNotificationsDevice).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(readDevice().unregisterEndpoint).toBeUndefined());
  });

  it("asks the connected wallet for a signature when turning on at the device limit", async () => {
    mocks.registerThisDevice.mockImplementation(registerAtLimit);
    const { result } = renderNotifications();

    act(() => result.current.turnOn());

    await waitFor(() => expect(result.current.status).toBe("on"));
    expect(mocks.signMessage).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ message: "message", verificationChainId: 42161 })
    );
    expect(mocks.sendTestNotification).toHaveBeenCalledOnce();
  });

  it("never asks for a signature by itself, and signs when the user tries again", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    mocks.registerThisDevice.mockImplementation(registerAtLimit);
    const { result, rerender } = renderNotifications();

    await waitFor(() => expect(result.current.status).toBe("limitReached"));
    mocks.account = OTHER_ACCOUNT;
    rerender();
    await waitFor(() => expect(result.current.pendingAccount).toBe(OTHER_ACCOUNT));
    expect(result.current.status).toBe("walletSwitchFailed");
    expect(mocks.registerThisDevice).toHaveBeenCalledTimes(2);
    expect(mocks.signMessage).not.toHaveBeenCalled();

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.receivingAccount).toBe(OTHER_ACCOUNT));
    expect(result.current.status).toBe("on");
    expect(mocks.signMessage).toHaveBeenCalledOnce();
    expect(mocks.sendTestNotification).not.toHaveBeenCalled();
    expect(turnOnResults()).toEqual([]);
  });

  it("can't sign at the device limit with no wallet connected", async () => {
    mocks.account = undefined;
    mocks.permission = "granted";
    storeDevice({ enabled: false, account: ACCOUNT });
    mocks.registerThisDevice.mockImplementation(registerAtLimit);
    const { result } = renderNotifications();

    act(() => result.current.turnOn());

    await waitFor(() => expect(result.current.status).toBe("limitReached"));
    expect(result.current.pendingAccount).toBe(ACCOUNT);
    expect(mocks.signMessage).not.toHaveBeenCalled();
  });

  it("stays at the device limit when the wallet refuses to sign", async () => {
    mocks.registerThisDevice.mockImplementation(registerAtLimit);
    mocks.signMessage.mockRejectedValueOnce(new Error("User rejected the request"));
    const { result } = renderNotifications();

    act(() => result.current.turnOn());

    await waitFor(() => expect(result.current.status).toBe("limitReached"));
    expect(result.current.error).toBe("User rejected the request");
    expect(mocks.sendTestNotification).not.toHaveBeenCalled();
  });

  it.each([
    ["on", () => undefined],
    ["permissionRefused", () => requestPermission.mockImplementationOnce(async () => (mocks.permission = "denied"))],
    ["promptClosed", () => requestPermission.mockImplementationOnce(async () => mocks.permission)],
    [
      "signatureRefused",
      () => {
        mocks.registerThisDevice.mockImplementation(registerAtLimit);
        mocks.signMessage.mockRejectedValueOnce(new Error("User rejected the request"));
      },
    ],
    [
      "limitNoWallet",
      () => {
        mocks.account = undefined;
        storeDevice({ enabled: false, account: ACCOUNT });
        mocks.registerThisDevice.mockImplementation(registerAtLimit);
      },
    ],
    ["failed", () => mocks.registerThisDevice.mockRejectedValueOnce(new NotificationsApiError("unavailable", 503))],
  ])("reports a turn-on that ends as %s", async (expected, arrange) => {
    arrange();
    const { result } = renderNotifications();

    act(() => result.current.turnOn());

    await waitFor(() => expect(turnOnResults()).toEqual([[expected, false]]));
  });

  it("shows the test cooldown", async () => {
    mocks.permission = "granted";
    storeDevice({ enabled: true, account: ACCOUNT, endpoint: ENDPOINT });
    mocks.sendTestNotification.mockRejectedValueOnce(new NotificationsApiError("Too many", 429));
    const { result } = renderNotifications();

    act(() => result.current.sendTest());

    await waitFor(() => expect(result.current.testState).toBe("cooldown"));
  });
});
