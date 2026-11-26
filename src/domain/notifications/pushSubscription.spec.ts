import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { getDeviceRegistrationMessage } from "./pushSubscription";

describe("getDeviceRegistrationMessage", () => {
  it("builds the text the API verifies, byte for byte", () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/abc:def";
    const endpointHash = createHash("sha256").update(endpoint).digest("hex");

    expect(getDeviceRegistrationMessage("0x52908400098527886e0f7030069857d2e4169ee7", endpoint, 1_763_400_000)).toBe(
      [
        "GMX Notifications Device",
        "account: 0x52908400098527886E0F7030069857D2E4169EE7",
        "chainId: 42161",
        "timestamp: 1763400000",
        `endpointHash: ${endpointHash}`,
      ].join("\n")
    );
  });
});
