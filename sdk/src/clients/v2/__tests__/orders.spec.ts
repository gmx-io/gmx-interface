import { describe, expect, it } from "vitest";

import { getTestSdk, getTestSigner } from "./testUtil";

const sdk = getTestSdk();
const signer = getTestSigner();
const hasSigner = !!signer;

const TEST_SYMBOL = "ETH/USD [WETH-USDC]";
const TEST_SIZE_USD = 100n * 10n ** 30n; // $100
const TEST_COLLATERAL = { amount: 1000000n, token: "USDC" }; // 1 USDC

describe("GmxApiSdk — orders", () => {
  it.skipIf(!hasSigner)("prepareOrder returns typed-data for express mode", async () => {
    const prepared = await sdk.prepareOrder({
      kind: "increase",
      symbol: TEST_SYMBOL,
      direction: "long",
      orderType: "market",
      size: TEST_SIZE_USD,
      collateralToPay: TEST_COLLATERAL,
      mode: "express",
      from: signer!.address,
    });

    expect(prepared.requestId).toBeDefined();
    expect(prepared.payloadType).toBe("typed-data");
    expect(prepared.mode).toBe("express");
    expect(prepared.payload.typedData).toBeDefined();
    expect(prepared.payload.relayParams).toBeDefined();
  });

  it.skipIf(!hasSigner)("signOrder produces a valid signature", async () => {
    const prepared = await sdk.prepareOrder({
      kind: "increase",
      symbol: TEST_SYMBOL,
      direction: "long",
      orderType: "market",
      size: TEST_SIZE_USD,
      collateralToPay: TEST_COLLATERAL,
      mode: "express",
      from: signer!.address,
    });

    const signature = await sdk.signOrder(prepared, signer!);
    expect(signature).toBeDefined();
    expect(signature.startsWith("0x")).toBe(true);
    expect(signature.length).toBeGreaterThan(2);
  });
});
