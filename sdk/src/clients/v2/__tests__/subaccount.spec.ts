import { describe, expect, it } from "vitest";

import { getTestSdk, getTestSigner } from "./testUtil";

const signer = getTestSigner();
const hasSigner = !!signer;

describe("GmxApiSdk — subaccount (1CT)", () => {
  it.skipIf(!hasSigner)("generateSubaccount derives address deterministically", async () => {
    const sdk1 = getTestSdk();
    const sdk2 = getTestSdk();

    const addr1 = await sdk1.generateSubaccount(signer!);
    const addr2 = await sdk2.generateSubaccount(signer!);

    expect(addr1).toBeDefined();
    expect(addr1.startsWith("0x")).toBe(true);
    expect(addr1).toBe(addr2);
  });

  it.skipIf(!hasSigner)("subaccountAddress getter works after generate", async () => {
    const sdk = getTestSdk();
    expect(sdk.subaccountAddress).toBeUndefined();

    await sdk.generateSubaccount(signer!);
    expect(sdk.subaccountAddress).toBeDefined();
    expect(sdk.hasActiveSubaccount).toBe(false);
  });

  it.skipIf(!hasSigner)("clearSubaccount resets state", async () => {
    const sdk = getTestSdk();
    await sdk.generateSubaccount(signer!);

    expect(sdk.subaccountAddress).toBeDefined();
    sdk.clearSubaccount();
    expect(sdk.subaccountAddress).toBeUndefined();
    expect(sdk.hasActiveSubaccount).toBe(false);
  });

  it.skipIf(!hasSigner)("activateSubaccount prepares and signs approval", async () => {
    const sdk = getTestSdk();

    const address = await sdk.activateSubaccount(signer!, {
      expiresInSeconds: 86400,
      maxAllowedCount: 10,
    });

    expect(address).toBeDefined();
    expect(sdk.subaccountAddress).toBe(address);
    expect(sdk.hasActiveSubaccount).toBe(true);
  });

  it.skipIf(!hasSigner)("fetchSubaccountStatus returns data", async () => {
    const sdk = getTestSdk();
    const subAddr = await sdk.generateSubaccount(signer!);

    const status = await sdk.fetchSubaccountStatus({
      account: signer!.address,
      subaccountAddress: subAddr,
    });

    expect(status).toBeDefined();
    expect(typeof status.active).toBe("boolean");
    expect(status.approvalNonce).toBeDefined();
  });

  it.skipIf(!hasSigner)("signOrder uses subaccount signer when active", async () => {
    const sdk = getTestSdk();
    await sdk.activateSubaccount(signer!, {
      expiresInSeconds: 86400,
      maxAllowedCount: 10,
    });

    const prepared = await sdk.prepareOrder({
      kind: "increase",
      symbol: "ETH/USD [WETH-USDC]",
      direction: "long",
      orderType: "market",
      size: (100n * 10n ** 30n).toString(),
      collateralToPay: { amount: "1000000", token: "USDC" },
      mode: "express",
      from: signer!.address,
      subaccountAddress: sdk.subaccountAddress,
    });

    const signature = await sdk.signOrder(prepared, signer!);
    expect(signature).toBeDefined();
    expect(signature.startsWith("0x")).toBe(true);
  });
});
