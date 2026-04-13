import { describe, expect, it } from "vitest";

import { getTestSdk, requireSigner, TEST_SYMBOL, TEST_SIZE_USD, TEST_COLLATERAL } from "./testUtil";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

// ---------------------------------------------------------------------------
// Validation & Error Cases
// ---------------------------------------------------------------------------

describe("validation errors", () => {
  // -------------------------------------------------------------------------
  // Prepare validation (400)
  // -------------------------------------------------------------------------

  describe("prepare validation", () => {
    it("missing mode rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("invalid mode rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "invalid" as any,
          from: account,
        })
      ).rejects.toThrow();
    });

    it("missing kind rejects", async () => {
      await expect(
        sdk.prepareOrder({
          mode: "express",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("invalid kind rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "invalid" as any,
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("missing from rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
        } as any)
      ).rejects.toThrow();
    });

    it("invalid from address rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: "0xinvalid",
        })
      ).rejects.toThrow();
    });

    it("invalid orderType rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "invalid" as any,
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("triggerPrice 0 for limit order rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "limit",
          size: TEST_SIZE_USD,
          triggerPrice: "0",
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("negative slippage rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          slippage: -1,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("slippage too high rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          slippage: 20000,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("missing collateralToPay for increase rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          mode: "express",
          from: account,
        } as any)
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Submit validation (400)
  // -------------------------------------------------------------------------

  describe("submit validation", () => {
    it("missing signature rejects", async () => {
      await expect(
        sdk.submitOrder({
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("missing from rejects", async () => {
      await expect(
        sdk.submitOrder({
          mode: "express",
          signature: "0x" + "00".repeat(65),
        })
      ).rejects.toThrow();
    });

    it("missing eip712Data.batchParams rejects", async () => {
      await expect(
        sdk.submitOrder({
          mode: "express",
          signature: "0x" + "00".repeat(65),
          from: account,
          eip712Data: { relayParams: {} },
        })
      ).rejects.toThrow();
    });

    it("missing eip712Data.relayParams rejects", async () => {
      await expect(
        sdk.submitOrder({
          mode: "express",
          signature: "0x" + "00".repeat(65),
          from: account,
          eip712Data: { batchParams: {} },
        })
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Simulate errors
  // -------------------------------------------------------------------------

  describe("simulate errors", () => {
    it("invalid params rejects", async () => {
      await expect(
        sdk.simulateOrder({
          kind: "increase",
          orderType: "market",
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("invalid symbol rejects", async () => {
      await expect(
        sdk.simulateOrder({
          kind: "increase",
          symbol: "NONEXISTENT/PAIR",
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          from: account,
        })
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Status endpoint errors
  // -------------------------------------------------------------------------

  describe("status endpoint errors", () => {
    it("empty request rejects", async () => {
      await expect(sdk.fetchOrderStatus({})).rejects.toThrow();
    });

    it("nonexistent requestId rejects", async () => {
      await expect(
        sdk.fetchOrderStatus({ requestId: "nonexistent-id-12345" })
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Domain errors
  // -------------------------------------------------------------------------

  describe("domain errors", () => {
    it("MARKET_NOT_FOUND for invalid symbol", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: "NONEXISTENT/PAIR",
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("TOKEN_NOT_FOUND for invalid collateral token", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: { amount: "1000000", token: "FAKECOIN" },
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("POSITION_NOT_FOUND for decrease without position", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "decrease",
          symbol: "DOGE/USD [WETH-USDC]",
          direction: "short",
          orderType: "market",
          size: TEST_SIZE_USD,
          mode: "express",
          from: "0x0000000000000000000000000000000000000001",
        })
      ).rejects.toThrow();
    });
  });
});
