import { describe, expect, it, afterAll } from "vitest";

import { getTestSdk, requireSigner, expressFlow, TEST_SYMBOL } from "./testUtil";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

// ---------------------------------------------------------------------------
// Swap order flows
// ---------------------------------------------------------------------------

describe("swap orders", () => {
  // -------------------------------------------------------------------------
  // Express mode
  // -------------------------------------------------------------------------

  describe("express market swap", () => {
    it("USDC → ETH: estimates → submit → track", async () => {
      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "swap",
        symbol: TEST_SYMBOL,
        orderType: "market",
        size: "1000000", // 1 USDC
        collateralToPay: { amount: "1000000", token: "USDC" },
        receiveToken: "ETH",
        mode: "express",
        from: account,
      });

      expect(prepared.requestId).toBeDefined();
      expect(prepared.payloadType).toBe("typed-data");

      // ------ Estimates ------
      expect(prepared.estimates).toBeDefined();
      const est = prepared.estimates!;
      // Swap has execution fee
      expect(BigInt(est.executionFeeAmount)).toBeGreaterThan(0n);
      // Swap price impact should be defined
      expect(est.swapPriceImpactDeltaUsd).toBeDefined();

      expect(submitted).toBeDefined();
      expect(submitted.status).toBeDefined();
      expect(submitted.requestId).toBeDefined();

      const status = await sdk.fetchOrderStatus({ requestId: submitted.requestId });
      expect(status.requestId).toBe(submitted.requestId);
    });
  });

  describe("express prepare swap", () => {
    it("prepare returns typed-data with estimates", async () => {
      const prepared = await sdk.prepareOrder({
        kind: "swap",
        symbol: TEST_SYMBOL,
        orderType: "market",
        size: "1000000",
        collateralToPay: { amount: "1000000", token: "USDC" },
        receiveToken: "ETH",
        mode: "express",
        from: account,
      });

      expect(prepared.requestId).toBeDefined();
      expect(prepared.payloadType).toBe("typed-data");
      expect(prepared.payload.typedData).toBeDefined();

      // Swap estimates
      expect(prepared.estimates).toBeDefined();
      expect(BigInt(prepared.estimates!.executionFeeAmount)).toBeGreaterThan(0n);
    });
  });

  // -------------------------------------------------------------------------
  // Classic mode
  // -------------------------------------------------------------------------

  describe("classic market swap", () => {
    it("prepare returns transaction payload", async () => {
      const prepared = await sdk.prepareOrder({
        kind: "swap",
        symbol: TEST_SYMBOL,
        orderType: "market",
        size: "1000000",
        collateralToPay: { amount: "1000000", token: "USDC" },
        receiveToken: "ETH",
        mode: "classic",
        from: account,
      });

      expect(prepared.payloadType).toBe("transaction");
      expect(prepared.payload.to).toBeDefined();
      expect(prepared.payload.data).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 1CT (subaccount)
  // -------------------------------------------------------------------------

  describe("with subaccount (1CT)", () => {
    const sdkSub = getTestSdk();

    afterAll(() => {
      sdkSub.clearSubaccount();
    });

    it("express market swap with subaccount", async () => {
      await sdkSub.activateSubaccount(signer, {
        expiresInSeconds: 86400,
        maxAllowedCount: 10,
      });

      const result = await sdkSub.executeExpressOrder(
        {
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: "1000000",
          collateralToPay: { amount: "1000000", token: "USDC" },
          receiveToken: "ETH",
          mode: "express",
          from: account,
        },
        signer
      );

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Error cases
  // -------------------------------------------------------------------------

  describe("error cases", () => {
    it("missing receiveToken rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: "1000000",
          collateralToPay: { amount: "1000000", token: "USDC" },
          mode: "express",
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("missing collateralToPay rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: "1000000",
          receiveToken: "ETH",
          mode: "express",
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("same token swap rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: "1000000",
          collateralToPay: { amount: "1000000", token: "USDC" },
          receiveToken: "USDC",
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("invalid collateral token rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: "1000000",
          collateralToPay: { amount: "1000000", token: "FAKECOIN" },
          receiveToken: "ETH",
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("invalid receiveToken rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: "1000000",
          collateralToPay: { amount: "1000000", token: "USDC" },
          receiveToken: "FAKECOIN",
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });
  });
});
