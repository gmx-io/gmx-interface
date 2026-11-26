import { describe, expect, it } from "vitest";

import { parseNotificationRoute } from "./notificationRoute";

const ORIGIN = "https://app.example";

describe("parseNotificationRoute", () => {
  it("splits the chain from the trade page", () => {
    expect(parseNotificationRoute("/trade/long?chainId=42161&market=ETH&pool=ETH-USDC", ORIGIN)).toEqual({
      route: "/trade/long?chainId=42161&market=ETH&pool=ETH-USDC",
      path: "/trade/long?market=ETH&pool=ETH-USDC",
      chainId: 42161,
    });
  });

  it("keeps a trade page without a chain", () => {
    expect(parseNotificationRoute("/trade", ORIGIN)).toEqual({ route: "/trade", path: "/trade", chainId: undefined });
  });

  it.each(["/trade?chainId=abc", "/trade?chainId=-1", "/trade?chainId=1.5", "/trade?chainId=1"])(
    "ignores an invalid or unsupported chain in %s",
    (route) => {
      expect(parseNotificationRoute(route, ORIGIN)?.chainId).toBeUndefined();
    }
  );

  it.each(["/earn", "/trader", "//evil.example/trade", "https://evil.example/trade", "javascript:alert(1)"])(
    "rejects %s",
    (route) => {
      expect(parseNotificationRoute(route, ORIGIN)).toBeUndefined();
    }
  );
});
