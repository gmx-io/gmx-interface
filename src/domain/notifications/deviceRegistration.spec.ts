import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerThisDevice, type StoredNotificationsDevice } from "./deviceRegistration";
import { NotificationsApiError, registerNotificationsDevice, REGISTRATION_LIMIT_REACHED } from "./notificationsApi";

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/new";
const KEYS = { p256dh: "p256dh", auth: "auth" };
const NOW_SECONDS = 1_763_400_000;

vi.mock("./notificationsApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./notificationsApi")>()),
  fetchNotificationsConfig: vi.fn().mockResolvedValue({ vapidPublicKey: "key" }),
  registerNotificationsDevice: vi.fn(),
}));

vi.mock("./pushSubscription", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./pushSubscription")>()),
  getServiceWorkerRegistration: vi.fn().mockResolvedValue({}),
  getOrCreatePushSubscription: vi.fn(async () => ({
    subscription: { toJSON: () => ({ endpoint: ENDPOINT, keys: KEYS, expirationTime: null }) },
  })),
}));

const register = vi.mocked(registerNotificationsDevice);
const limitError = () => new NotificationsApiError("limit", 409, REGISTRATION_LIMIT_REACHED);

describe("registerThisDevice", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW_SECONDS * 1000 });
    register.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("registers without a signature and names the endpoint it replaces", async () => {
    const stored: StoredNotificationsDevice = { enabled: true, account: ACCOUNT, endpoint: "https://old.example/1" };

    await expect(registerThisDevice({ account: ACCOUNT, stored })).resolves.toEqual({ endpoint: ENDPOINT });

    expect(register).toHaveBeenCalledExactlyOnceWith({
      account: ACCOUNT,
      subscription: { endpoint: ENDPOINT, keys: KEYS, expirationTime: null },
      oldEndpoint: "https://old.example/1",
    });
  });

  it("asks for no signature at the device limit when it cannot sign", async () => {
    register.mockRejectedValueOnce(limitError());

    await expect(registerThisDevice({ account: ACCOUNT, stored: { enabled: false } })).rejects.toMatchObject({
      status: 409,
      code: REGISTRATION_LIMIT_REACHED,
    });
    expect(register).toHaveBeenCalledOnce();
  });

  it("signs past the device limit and keeps the signature before sending it", async () => {
    register.mockRejectedValueOnce(limitError()).mockResolvedValueOnce();
    const sign = vi.fn().mockResolvedValue("0xsigned");
    const onSigned = vi.fn();

    await registerThisDevice({ account: ACCOUNT, stored: { enabled: false }, sign, onSigned });

    expect(sign).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(`timestamp: ${NOW_SECONDS}`));
    const signature = { account: ACCOUNT, endpoint: ENDPOINT, timestamp: NOW_SECONDS, signature: "0xsigned" };
    expect(onSigned).toHaveBeenCalledExactlyOnceWith(signature);
    expect(register).toHaveBeenLastCalledWith(
      expect.objectContaining({ account: ACCOUNT, timestamp: NOW_SECONDS, signature: "0xsigned" })
    );
  });

  it("sends a fresh stored signature again instead of asking the wallet", async () => {
    register.mockRejectedValueOnce(limitError()).mockResolvedValueOnce();
    const sign = vi.fn();
    const stored: StoredNotificationsDevice = {
      enabled: false,
      signature: { account: ACCOUNT, endpoint: ENDPOINT, timestamp: NOW_SECONDS - 3600, signature: "0xold" },
    };

    await registerThisDevice({ account: ACCOUNT, stored, sign });

    expect(sign).not.toHaveBeenCalled();
    expect(register).toHaveBeenLastCalledWith(
      expect.objectContaining({ timestamp: NOW_SECONDS - 3600, signature: "0xold" })
    );
  });

  it.each([
    ["another endpoint", { endpoint: "https://fcm.googleapis.com/fcm/send/other", timestamp: NOW_SECONDS }],
    ["another wallet", { account: "0x0000000000000000000000000000000000000001", timestamp: NOW_SECONDS }],
    ["almost a day ago", { timestamp: NOW_SECONDS - 86_000 }],
  ])("signs again when the stored signature is for %s", async (_name, signatureUpdate) => {
    register.mockRejectedValueOnce(limitError()).mockResolvedValueOnce();
    const sign = vi.fn().mockResolvedValue("0xnew");
    const stored: StoredNotificationsDevice = {
      enabled: false,
      signature: {
        account: ACCOUNT,
        endpoint: ENDPOINT,
        signature: "0xold",
        ...signatureUpdate,
      },
    };

    await registerThisDevice({ account: ACCOUNT, stored, sign });

    expect(sign).toHaveBeenCalledOnce();
    expect(register).toHaveBeenLastCalledWith(expect.objectContaining({ signature: "0xnew" }));
  });

  it("passes other API errors through without signing", async () => {
    register.mockRejectedValueOnce(new NotificationsApiError("unavailable", 503));
    const sign = vi.fn();

    await expect(registerThisDevice({ account: ACCOUNT, stored: { enabled: false }, sign })).rejects.toMatchObject({
      status: 503,
    });
    expect(sign).not.toHaveBeenCalled();
  });
});
