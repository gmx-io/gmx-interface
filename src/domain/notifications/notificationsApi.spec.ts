import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationsApiError, registerNotificationsDevice } from "./notificationsApi";

describe("notificationsApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts to the production Arbitrum API", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);

    await registerNotificationsDevice({
      account: "0x52908400098527886E0F7030069857D2E4169EE7",
      subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "p", auth: "a" } },
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://arbitrum.gmxapi.io/v1/notifications/register",
      expect.objectContaining({ method: "POST", headers: { "content-type": "application/json" } })
    );
  });

  it("reads the status and code of a refusal", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ message: "limit", code: "REGISTRATION_LIMIT_REACHED" }, { status: 409 }))
    );

    const error = await registerNotificationsDevice({
      account: "0x52908400098527886E0F7030069857D2E4169EE7",
      subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "p", auth: "a" } },
    }).catch((error) => error);

    expect(error).toBeInstanceOf(NotificationsApiError);
    expect(error).toMatchObject({ message: "limit", status: 409, code: "REGISTRATION_LIMIT_REACHED" });
  });

  it("reports a request with no answer without a status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(
      registerNotificationsDevice({
        account: "0x52908400098527886E0F7030069857D2E4169EE7",
        subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "p", auth: "a" } },
      })
    ).rejects.toMatchObject({ status: undefined, message: "Failed to fetch" });
  });
});
