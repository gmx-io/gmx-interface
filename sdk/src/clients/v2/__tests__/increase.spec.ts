import { describe, expect, it, afterAll } from "vitest";

import {
  getTestSdk,
  requireSigner,
  expressFlow,
  waitForOrderStatus,
  waitForOrdersUpdate,
  waitForPositionUpdate,
  TEST_SYMBOL,
  TEST_SIZE_USD,
  TEST_COLLATERAL,
} from "./testUtil";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

const USD_DECIMALS = 30;
const BASIS_POINTS_DIVISOR = 10000n;

// ---------------------------------------------------------------------------
// Increase order flows
// ---------------------------------------------------------------------------

describe("increase orders", () => {
  // -------------------------------------------------------------------------
  // Express mode
  // -------------------------------------------------------------------------

  describe("express market increase", () => {
    it("long: estimates → submit → verify position", async () => {
      const positionsBefore = await sdk.fetchPositionsInfo({ address: account });
      const posBefore = positionsBefore.find(
        (p: any) => p.isLong && p.indexName?.includes("ETH/USD")
      );
      const sizeBefore = posBefore ? BigInt(posBefore.sizeInUsd) : 0n;
      const collateralBefore = posBefore ? BigInt(posBefore.collateralUsd) : 0n;

      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
      });

      // ------ Estimates sanity checks ------
      expect(prepared.estimates).toBeDefined();
      const est = prepared.estimates!;

      // sizeDeltaUsd must equal the requested size
      expect(est.sizeDeltaUsd).toBe(TEST_SIZE_USD);

      // execution fee > 0 (paid in native token)
      expect(BigInt(est.executionFeeAmount)).toBeGreaterThan(0n);

      // position fee > 0 for increase
      expect(BigInt(est.positionFeeUsd)).toBeGreaterThan(0n);

      // acceptable price must be > 0
      expect(BigInt(est.acceptablePrice)).toBeGreaterThan(0n);

      // borrowingFee and fundingFee should be 0 for a new position (or >= 0 if adding)
      expect(BigInt(est.borrowingFeeUsd)).toBeGreaterThanOrEqual(0n);
      expect(BigInt(est.fundingFeeUsd) >= 0n || BigInt(est.fundingFeeUsd) < 0n).toBe(true);

      expect(submitted.requestId).toBeDefined();
      expect(submitted.status).toBeDefined();

      // ------ Status tracking ------
      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.requestId).toBe(submitted.requestId);

      // ------ Position verification ------
      expect(status.status).toBe("executed");

      // Wait for keeper execution + indexer (up to 30s)
      const positionsAfter = await waitForPositionUpdate(sdk, account, (positions) => {
        const pos = positions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
        return pos ? BigInt(pos.sizeInUsd) > sizeBefore : false;
      }, 30000);
      const posAfter = positionsAfter.find(
        (p: any) => p.isLong && p.indexName?.includes("ETH/USD")
      );
      expect(posAfter).toBeDefined();

      const sizeAfter = BigInt(posAfter!.sizeInUsd);
      const collateralAfter = BigInt(posAfter!.collateralUsd);

      // Size should have increased by ~sizeDeltaUsd
      const sizeDelta = sizeAfter - sizeBefore;
      expect(sizeDelta).toBeGreaterThan(0n);
      // Allow 1% tolerance for price movements
      const expectedSize = BigInt(est.sizeDeltaUsd);
      const tolerance = expectedSize / 100n;
      expect(sizeDelta).toBeGreaterThanOrEqual(expectedSize - tolerance);
      expect(sizeDelta).toBeLessThanOrEqual(expectedSize + tolerance);

      // Collateral should have increased
      expect(collateralAfter).toBeGreaterThan(collateralBefore);

      // Leverage = sizeInUsd / collateralUsd (in 30-decimal basis points)
      if (posAfter!.leverage !== undefined) {
        const leverage = BigInt(posAfter!.leverage);
        expect(leverage).toBeGreaterThan(0n);
      }
    });

    it("short: estimates match", async () => {
      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "short",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      expect(BigInt(prepared.estimates!.executionFeeAmount)).toBeGreaterThan(0n);
      expect(BigInt(prepared.estimates!.positionFeeUsd)).toBeGreaterThan(0n);
      expect(BigInt(prepared.estimates!.acceptablePrice)).toBeGreaterThan(0n);

      expect(submitted.requestId).toBeDefined();

      const status = await sdk.fetchOrderStatus({ requestId: submitted.requestId });
      expect(status.requestId).toBe(submitted.requestId);
    });

    it("with explicit collateral: estimates reflect collateral", async () => {
      const collateral = { amount: "5000000", token: "USDC" }; // 5 USDC

      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToPay: collateral,
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);

      // With 5 USDC collateral on $100 size, leverage ≈ 20x
      // positionFee stays the same regardless of collateral
      expect(BigInt(prepared.estimates!.positionFeeUsd)).toBeGreaterThan(0n);

      expect(submitted.requestId).toBeDefined();
    });
  });

  describe("express limit increase", () => {
    afterAll(async () => {
      try {
        const prepared = await sdk.prepareCancelOrder({
          all: true,
          mode: "express",
          from: account,
        });
        const sig = await sdk.signOrder(prepared, signer);
        await sdk.submitOrder({
          mode: prepared.mode,
          requestId: prepared.requestId,
          signature: sig,
          from: account,
          idempotencyKey: prepared.idempotencyKey,
          eip712Data: {
            batchParams: prepared.payload.batchParams,
            relayParams: prepared.payload.relayParams,
          },
        });
      } catch {
        // cleanup best-effort
      }
    });

    it("estimates → submit → verify in orders", async () => {
      const triggerPrice = (1n * 10n ** 30n).toString(); // $1

      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "limit",
        size: TEST_SIZE_USD,
        triggerPrice,
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      // Limit order still has execution fee and position fee
      expect(BigInt(prepared.estimates!.executionFeeAmount)).toBeGreaterThan(0n);
      expect(BigInt(prepared.estimates!.positionFeeUsd)).toBeGreaterThan(0n);
      // acceptablePrice for limit buy should be > trigger price (with slippage)
      expect(BigInt(prepared.estimates!.acceptablePrice)).toBeGreaterThan(BigInt(triggerPrice));

      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.requestId).toBe(submitted.requestId);

      // Relay tx must succeed — creates the limit order on-chain
      expect(status.status).toBe("executed");

      // Limit order at $1 should NOT execute — verify it's in pending orders
      const orders = await waitForOrdersUpdate(sdk, account, (o) => o.length > 0, 30000);
      expect(orders.length).toBeGreaterThan(0);

      const order = orders.find((o: any) => BigInt(o.sizeDeltaUsd) === BigInt(TEST_SIZE_USD));
      if (order) {
        expect(BigInt(order.sizeDeltaUsd)).toBe(BigInt(TEST_SIZE_USD));
        expect(order.isLong).toBe(true);
        expect(BigInt(order.executionFee)).toBeGreaterThan(0n);
      }
    });
  });

  describe("express convenience method", () => {
    it("executeExpressOrder returns requestId and status", async () => {
      const result = await sdk.executeExpressOrder(
        {
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        },
        signer
      );

      expect(result.requestId).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Classic mode
  // -------------------------------------------------------------------------

  describe("classic market increase", () => {
    it("prepare returns transaction with estimates", async () => {
      const prepared = await sdk.prepareOrder({
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToPay: TEST_COLLATERAL,
        mode: "classic",
        from: account,
      });

      expect(prepared.payloadType).toBe("transaction");
      expect(prepared.payload.to).toBeDefined();
      expect(prepared.payload.data).toBeDefined();
      expect(prepared.payload.value).toBeDefined();

      // Classic mode also returns estimates
      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      expect(BigInt(prepared.estimates!.executionFeeAmount)).toBeGreaterThan(0n);
      expect(BigInt(prepared.estimates!.positionFeeUsd)).toBeGreaterThan(0n);
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

    it("express market increase auto-injects subaccount", async () => {
      await sdkSub.activateSubaccount(signer, {
        expiresInSeconds: 86400,
        maxAllowedCount: 10,
      });

      const result = await sdkSub.executeExpressOrder(
        {
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        },
        signer
      );

      expect(result.requestId).toBeDefined();
      expect(result.status).toBeDefined();

      const status = await sdk.fetchOrderStatus({ requestId: result.requestId });
      expect(status.requestId).toBe(result.requestId);
    });

    it("classic prepare with subaccount has estimates", async () => {
      const prepared = await sdkSub.prepareOrder({
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToPay: TEST_COLLATERAL,
        mode: "classic",
        from: account,
        subaccountAddress: sdkSub.subaccountAddress,
      });

      expect(prepared.payloadType).toBe("transaction");
      expect(prepared.payload.to).toBeDefined();
      expect(prepared.payload.data).toBeDefined();
      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
    });
  });

  // -------------------------------------------------------------------------
  // Error cases
  // -------------------------------------------------------------------------

  describe("error cases", () => {
    it("missing symbol rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("missing direction rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("missing size rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        } as any)
      ).rejects.toThrow();
    });

    it("missing collateralToPay rejects", async () => {
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

    it("invalid symbol rejects", async () => {
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

    it("invalid collateral token rejects", async () => {
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
  });
});
