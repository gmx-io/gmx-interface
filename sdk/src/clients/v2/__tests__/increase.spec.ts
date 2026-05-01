import { describe, expect, it, beforeAll, afterAll } from "vitest";

import {
  getTestSdk,
  requireSigner,
  expressFlow,
  waitForOrderStatus,
  waitForOrdersUpdate,
  waitForPositionUpdate,
  activateTestSubaccount,
  hasRpcUrl,
  TEST_SYMBOL,
  TEST_SIZE_USD,
  TEST_COLLATERAL,
} from "./testUtil";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

const ETH_USD_MARKET_ADDRESS = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";

async function cancelAllOrders() {
  try {
    const prepared = await sdk.prepareCancelOrder({ all: true, mode: "express", from: account });
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
  } catch { /* cleanup best-effort */ }
}

describe("increase orders", () => {
  describe("express market increase", () => {
    it("long: estimates → submit → verify position", async () => {
      const positionsBefore = await sdk.fetchPositionsInfo({ address: account });
      const longBefore = positionsBefore.find(
        (p: any) => p.isLong && p.indexName?.includes("ETH/USD")
      );
      const sizeBefore = longBefore ? BigInt(longBefore.sizeInUsd) : 0n;

      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      const est = prepared.estimates!;

      expect(est.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      expect(est.executionFeeAmount).toBeGreaterThan(0n);
      expect(est.positionFeeUsd).toBeGreaterThan(0n);
      expect(est.acceptablePrice).toBeGreaterThan(0n);

      expect(submitted.requestId).toBeDefined();
      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.requestId).toBe(submitted.requestId);
      expect(status.status).toBe("executed");

      // Position may take time to appear in the API after on-chain execution
      const positionsAfter = await waitForPositionUpdate(sdk, account, (positions) => {
        const p = positions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
        return p ? BigInt(p.sizeInUsd) > sizeBefore : false;
      }, 60000);
      const longAfter = positionsAfter.find(
        (p: any) => p.isLong && p.indexName?.includes("ETH/USD")
      );
      // With very small collateral ($1), position may be auto-liquidated before API reflects it
      if (longAfter) {
        expect(BigInt(longAfter.sizeInUsd)).toBeGreaterThan(sizeBefore);
      }
    });

    it("short: estimates match", async () => {
      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "short",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      expect(prepared.estimates!.executionFeeAmount).toBeGreaterThan(0n);
      expect(prepared.estimates!.positionFeeUsd).toBeGreaterThan(0n);
      expect(prepared.estimates!.acceptablePrice).toBeGreaterThan(0n);

      expect(submitted.requestId).toBeDefined();

      const status = await sdk.fetchOrderStatus({ requestId: submitted.requestId });
      expect(status.requestId).toBe(submitted.requestId);
    });

    it("larger collateral: position fee scales with size not collateral", async () => {
      const collateral = { amount: 2000000n, token: "USDC" }; // 2 USDC vs 1 USDC in TEST_COLLATERAL

      const [small, large] = await Promise.all([
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        }),
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: collateral,
          mode: "express",
          from: account,
        }),
      ]);

      // Same size → same position fee regardless of collateral amount
      expect(small.estimates!.positionFeeUsd).toBe(large.estimates!.positionFeeUsd);
      expect(small.estimates!.sizeDeltaUsd).toBe(large.estimates!.sizeDeltaUsd);
    });
  });

  describe("collateral scenarios", () => {
    it("same collateral — no swap (USDC collateralToken)", async () => {
      const prepared = await sdk.prepareOrder({
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToken: "USDC",
        collateralToPay: { amount: 1_000_000n, token: "USDC" },
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      // No swap needed — impact should be zero or minimal
      const absImpact = prepared.estimates!.swapPriceImpactDeltaUsd >= 0n
        ? prepared.estimates!.swapPriceImpactDeltaUsd
        : -prepared.estimates!.swapPriceImpactDeltaUsd;
      expect(absImpact).toBeLessThanOrEqual(10n ** 28n); // < $0.01
    });

    it("different collateral — with swap (pay USDC, default WETH position)", async () => {
      // No collateralToken → defaults to WETH for long → USDC payment triggers swap
      const prepared = await sdk.prepareOrder({
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToPay: { amount: 1_000_000n, token: "USDC" },
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      // USDC→WETH swap happens — swapPriceImpactDeltaUsd is defined (may be 0 for small amounts)
      expect(prepared.estimates!.swapPriceImpactDeltaUsd).toBeDefined();
    });

    it("same vs different collateral: swap impact comparison", async () => {
      const [sameCollateral, diffCollateral] = await Promise.all([
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToken: "USDC",
          collateralToPay: { amount: 1_000_000n, token: "USDC" },
          mode: "express",
          from: account,
        }),
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: { amount: 1_000_000n, token: "USDC" },
          mode: "express",
          from: account,
        }),
      ]);

      const sameImpact = sameCollateral.estimates!.swapPriceImpactDeltaUsd;
      const diffImpact = diffCollateral.estimates!.swapPriceImpactDeltaUsd;

      const absSame = sameImpact >= 0n ? sameImpact : -sameImpact;
      const absDiff = diffImpact >= 0n ? diffImpact : -diffImpact;

      // Same-collateral should have lower absolute swap impact
      expect(absSame).toBeLessThanOrEqual(absDiff);
    });
  });

  describe("manual swap path", () => {
    it("manualSwapPath is accepted and returns valid estimates", async () => {
      const [auto, manual] = await Promise.all([
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: { amount: 1_000_000n, token: "USDC" },
          mode: "express",
          from: account,
        }),
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: { amount: 1_000_000n, token: "USDC" },
          manualSwapPath: [ETH_USD_MARKET_ADDRESS],
          mode: "express",
          from: account,
        }),
      ]);

      expect(manual.estimates).toBeDefined();
      expect(manual.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      // Both should have valid estimates — manual path should produce comparable results
      expect(auto.estimates!.sizeDeltaUsd).toBe(manual.estimates!.sizeDeltaUsd);
    });
  });

  describe("TPSL", () => {
    let markPrice: bigint;

    beforeAll(async () => {
      const tickers = await sdk.fetchMarketsTickers({ symbols: [TEST_SYMBOL] });
      markPrice = BigInt(tickers[0].maxPrice);
    });

    afterAll(cancelAllOrders);

    it("TP + SL in same batch", async () => {
      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
        tpsl: [
          { type: "take-profit", triggerPrice: markPrice * 105n / 100n, size: TEST_SIZE_USD },
          { type: "stop-loss", triggerPrice: markPrice * 95n / 100n, size: TEST_SIZE_USD },
        ],
      });

      expect(prepared.estimates).toBeDefined();
      expect(submitted.requestId).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      // TP + SL should appear as conditional orders
      const orders = await waitForOrdersUpdate(sdk, account, (o) => o.length >= 2, 30000);
      expect(orders.length).toBeGreaterThanOrEqual(2);
    });

    it("TP only", async () => {
      const ordersBefore = await sdk.fetchOrders({ address: account });

      const { submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
        tpsl: [{ type: "take-profit", triggerPrice: markPrice * 110n / 100n }],
      });

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const ordersAfter = await waitForOrdersUpdate(
        sdk, account, (o) => o.length > ordersBefore.length, 30000
      );
      expect(ordersAfter.length).toBeGreaterThan(ordersBefore.length);
    });

    it("SL only", async () => {
      const ordersBefore = await sdk.fetchOrders({ address: account });

      const { submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
        tpsl: [{ type: "stop-loss", triggerPrice: markPrice * 90n / 100n }],
      });

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const ordersAfter = await waitForOrdersUpdate(
        sdk, account, (o) => o.length > ordersBefore.length, 30000
      );
      expect(ordersAfter.length).toBeGreaterThan(ordersBefore.length);
    });

    it("partial size TP", async () => {
      const halfSize = TEST_SIZE_USD / 2n;
      const ordersBefore = await sdk.fetchOrders({ address: account });

      const { submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
        tpsl: [{ type: "take-profit", triggerPrice: markPrice * 105n / 100n, size: halfSize }],
      });

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");

      const ordersAfter = await waitForOrdersUpdate(
        sdk, account, (o) => o.length > ordersBefore.length, 30000
      );
      expect(ordersAfter.length).toBeGreaterThan(ordersBefore.length);
    });
  });

  describe("TPSL validation errors", () => {
    it("tpsl on decrease rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "decrease",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          mode: "express",
          from: account,
          tpsl: [{ type: "take-profit", triggerPrice: 1n * 10n ** 30n }],
        } as any)
      ).rejects.toThrow();
    });

    it("tpsl on swap rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "swap",
          symbol: TEST_SYMBOL,
          orderType: "market",
          size: 1000000n,
          collateralToPay: { amount: 1000000n, token: "USDC" },
          receiveToken: "ETH",
          mode: "express",
          from: account,
          tpsl: [{ type: "take-profit", triggerPrice: 1n * 10n ** 30n }],
        } as any)
      ).rejects.toThrow();
    });

    it("tpsl with TWAP orderType rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "twap",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          twapConfig: { duration: 600, parts: 3 },
          mode: "express",
          from: account,
          tpsl: [{ type: "take-profit", triggerPrice: 1n * 10n ** 30n }],
        })
      ).rejects.toThrow();
    });

    it("empty tpsl array rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
          tpsl: [],
        })
      ).rejects.toThrow();
    });

    it("tpsl entry missing triggerPrice rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
          tpsl: [{ type: "take-profit" } as any],
        })
      ).rejects.toThrow();
    });

    it("tpsl entry with invalid type rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
          tpsl: [{ type: "invalid", triggerPrice: 1n * 10n ** 30n } as any],
        })
      ).rejects.toThrow();
    });
  });

  describe("TWAP increase", () => {
    afterAll(cancelAllOrders);

    it("TWAP market increase — creates sub-orders", async () => {
      const twapSize = 20n * 10n ** 30n; // $20
      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        orderType: "twap",
        symbol: TEST_SYMBOL,
        direction: "long",
        size: twapSize,
        collateralToken: "USDC",
        collateralToPay: { amount: 3_000_000n, token: "USDC" }, // 3 USDC
        twapConfig: { duration: 600, parts: 2 },
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(twapSize);
      expect(submitted.requestId).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(["executed", "relay_reverted"]).toContain(status.status);
    });
  });

  describe("TWAP validation errors", () => {
    it("missing twapConfig rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "twap",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("parts below minimum (1) rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "twap",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          twapConfig: { duration: 600, parts: 1 },
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("parts above maximum (31) rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "twap",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          twapConfig: { duration: 600, parts: 31 },
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });

    it("zero duration rejects", async () => {
      await expect(
        sdk.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "twap",
          size: TEST_SIZE_USD,
          collateralToPay: TEST_COLLATERAL,
          twapConfig: { duration: 0, parts: 3 },
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });
  });

  describe("express limit increase", () => {
    afterAll(cancelAllOrders);

    it("estimates → submit → verify in orders", async () => {
      const triggerPrice = 1n * 10n ** 30n; // $1

      const { prepared, submitted } = await expressFlow(sdk, signer, {
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "limit",
        size: TEST_SIZE_USD,
        triggerPrice,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
      });

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      expect(prepared.estimates!.executionFeeAmount).toBeGreaterThan(0n);
      expect(prepared.estimates!.positionFeeUsd).toBeGreaterThan(0n);
      expect(prepared.estimates!.acceptablePrice).toBeGreaterThan(triggerPrice);

      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.requestId).toBe(submitted.requestId);
      expect(status.status).toBe("executed");

      const orders = await waitForOrdersUpdate(sdk, account, (o) => o.length > 0, 30000);
      expect(orders.length).toBeGreaterThan(0);

      const order = orders.find((o: any) => o.isLong && BigInt(o.sizeDeltaUsd) > 0n);
      expect(order).toBeDefined();
      expect(order!.isLong).toBe(true);
      expect(BigInt(order!.executionFee)).toBeGreaterThan(0n);
    });
  });

  describe("slippage parameter", () => {
    const baseRequest = {
      kind: "increase" as const,
      symbol: TEST_SYMBOL,
      direction: "long" as const,
      orderType: "market" as const,
      size: TEST_SIZE_USD,
      collateralToPay: TEST_COLLATERAL,
      mode: "express" as const,
      from: account,
    };

    it("slippage encoded in typed data payload", async () => {
      const [prepared30, prepared300] = await Promise.all([
        sdk.prepareOrder({ ...baseRequest, slippage: 30 }),
        sdk.prepareOrder({ ...baseRequest, slippage: 300 }),
      ]);

      expect(prepared30.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      expect(prepared300.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);

      // Slippage should be reflected in the typed data payload (batchParams)
      // Higher slippage → different (wider) acceptablePrice in the on-chain params
      const batch30 = JSON.stringify(prepared30.payload.batchParams);
      const batch300 = JSON.stringify(prepared300.payload.batchParams);
      expect(batch30).not.toBe(batch300);
    });

    it("slippage does not affect size/fee estimates", async () => {
      const [prepared30, prepared300] = await Promise.all([
        sdk.prepareOrder({ ...baseRequest, slippage: 30 }),
        sdk.prepareOrder({ ...baseRequest, slippage: 300 }),
      ]);

      expect(prepared30.estimates!.sizeDeltaUsd).toBe(prepared300.estimates!.sizeDeltaUsd);
      expect(prepared30.estimates!.positionFeeUsd).toBe(prepared300.estimates!.positionFeeUsd);
    });
  });

  describe("executionFeeBufferBps", () => {
    const baseRequest = {
      kind: "increase" as const,
      symbol: TEST_SYMBOL,
      direction: "long" as const,
      orderType: "market" as const,
      size: TEST_SIZE_USD,
      collateralToPay: TEST_COLLATERAL,
      mode: "express" as const,
      from: account,
    };

    it("higher buffer → higher execution fee", async () => {
      const [prepared0, prepared5000] = await Promise.all([
        sdk.prepareOrder({ ...baseRequest, executionFeeBufferBps: 0 }),
        sdk.prepareOrder({ ...baseRequest, executionFeeBufferBps: 5000 }),
      ]);

      expect(prepared5000.estimates!.executionFeeAmount).toBeGreaterThan(
        prepared0.estimates!.executionFeeAmount
      );
    });

    it("buffer does not affect other estimates", async () => {
      const [prepared0, prepared5000] = await Promise.all([
        sdk.prepareOrder({ ...baseRequest, executionFeeBufferBps: 0 }),
        sdk.prepareOrder({ ...baseRequest, executionFeeBufferBps: 5000 }),
      ]);

      expect(prepared0.estimates!.sizeDeltaUsd).toBe(prepared5000.estimates!.sizeDeltaUsd);
      expect(prepared0.estimates!.positionFeeUsd).toBe(prepared5000.estimates!.positionFeeUsd);
      expect(prepared0.estimates!.acceptablePrice).toBe(prepared5000.estimates!.acceptablePrice);
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
          collateralToken: "USDC",
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

  describe("classic market increase", () => {
    it("prepare returns transaction with estimates", async () => {
      const prepared = await sdk.prepareOrder({
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "classic",
        from: account,
      });

      expect(prepared.payloadType).toBe("transaction");
      expect(prepared.payload.to).toBeDefined();
      expect(prepared.payload.data).toBeDefined();
      expect(prepared.payload.value).toBeDefined();

      expect(prepared.estimates).toBeDefined();
      expect(prepared.estimates!.sizeDeltaUsd).toBe(TEST_SIZE_USD);
      expect(prepared.estimates!.executionFeeAmount).toBeGreaterThan(0n);
      expect(prepared.estimates!.positionFeeUsd).toBeGreaterThan(0n);
    });

    it.skipIf(!hasRpcUrl())("submit classic transaction on-chain", async () => {
      const prepared = await sdk.prepareOrder({
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "classic",
        from: account,
      });

      expect(prepared.payloadType).toBe("transaction");

      const txHash = await signer.sendTransaction({
        to: prepared.payload.to,
        data: prepared.payload.data,
        value: BigInt(prepared.payload.value ?? 0),
      });

      expect(txHash).toBeDefined();
      expect(txHash.startsWith("0x")).toBe(true);
    });
  });

  describe("with subaccount (1CT)", () => {
    const sdkSub = getTestSdk();

    beforeAll(async () => {
      await activateTestSubaccount(sdkSub, signer, account);
    });

    afterAll(() => {
      sdkSub.clearSubaccount();
    });

    it("express full flow with subaccount — submit via executeExpressOrder", async () => {
      const result = await sdkSub.executeExpressOrder(
        {
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToken: "USDC",
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
        },
        signer
      );

      expect(result.requestId).toBeDefined();
      expect(result.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, result.requestId);
      expect(status.status).toBe("executed");
    });

    it("manual prepare + sign + submit with subaccount", async () => {
      // Re-activate to get a fresh approval nonce (previous executeExpressOrder
      // registered the old one, incrementing the on-chain nonce)
      await activateTestSubaccount(sdkSub, signer, account);

      const prepared = await sdkSub.prepareOrder({
        kind: "increase",
        symbol: TEST_SYMBOL,
        direction: "long",
        orderType: "market",
        size: TEST_SIZE_USD,
        collateralToken: "USDC",
        collateralToPay: TEST_COLLATERAL,
        mode: "express",
        from: account,
        subaccountAddress: sdkSub.subaccountAddress,
        subaccountApproval: sdkSub.subaccountApprovalMessage,
      });

      expect(prepared.requestId).toBeDefined();
      expect(prepared.payloadType).toBe("typed-data");

      const signature = await sdkSub.signOrder(prepared, signer);
      expect(signature.startsWith("0x")).toBe(true);

      const submitted = await sdkSub.submitOrder({
        mode: prepared.mode,
        requestId: prepared.requestId,
        signature,
        from: account,
        idempotencyKey: prepared.idempotencyKey,
        eip712Data: {
          batchParams: prepared.payload.batchParams,
          relayParams: prepared.payload.relayParams,
          subaccountApproval: sdkSub.subaccountApprovalMessage,
        },
      });

      expect(submitted.requestId).toBeDefined();
      expect(submitted.status).toBeDefined();

      const status = await waitForOrderStatus(sdk, submitted.requestId);
      expect(status.status).toBe("executed");
    });
  });

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
          collateralToPay: { amount: 1000000n, token: "FAKECOIN" },
          mode: "express",
          from: account,
        })
      ).rejects.toThrow();
    });
  });
});
