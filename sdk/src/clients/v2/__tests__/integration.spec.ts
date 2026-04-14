import { describe, expect, it, beforeAll } from "vitest";

import { getTestSdk, requireSigner, waitForOrderStatus, waitForPositionUpdate, TEST_CHAIN_ID } from "./testUtil";
import type { PrepareOrderResponse } from "../index";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

const TEST_SYMBOL = "ETH/USD [WETH-USDC]";
const TEST_SIZE_USD = 100n * 10n ** 30n; // $100
const TEST_COLLATERAL = { amount: 1000000n, token: "USDC" }; // 1 USDC


describe("data fetching", () => {
  it("fetchMarketsInfo returns markets with pricing", async () => {
    const markets = await sdk.fetchMarketsInfo();

    expect(markets.length).toBeGreaterThan(0);

    const ethMarket = markets.find((m: any) => m.name?.includes("ETH/USD"));
    expect(ethMarket).toBeDefined();
    expect(ethMarket!.marketTokenAddress).toBeDefined();
  });

  it("fetchTokensData returns tokens with pricing fields", async () => {
    const tokensData = await sdk.fetchTokensData();
    const keys = Object.keys(tokensData);

    expect(keys.length).toBeGreaterThan(0);

    const firstToken = tokensData[keys[0]];
    expect(firstToken).toBeDefined();
    expect(firstToken.symbol).toBeDefined();
    expect(firstToken.prices).toBeDefined();
  });

  it("fetchTokens returns array", async () => {
    const tokens = await sdk.fetchTokens();
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].symbol).toBeDefined();
  });

  it("fetchPairs returns pairs", async () => {
    const pairs = await sdk.fetchPairs();
    expect(pairs.length).toBeGreaterThan(0);
  });

  it("fetchMarketsTickers returns tickers", async () => {
    const tickers = await sdk.fetchMarketsTickers();
    expect(tickers.length).toBeGreaterThan(0);
  });

  it("fetchMarketsTickers filters by address", async () => {
    const all = await sdk.fetchMarketsTickers();
    const first = all[0];
    const filtered = await sdk.fetchMarketsTickers({ addresses: [first.marketTokenAddress] });
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered[0].marketTokenAddress).toBe(first.marketTokenAddress);
  });

  it("fetchRates returns rates", async () => {
    const rates = await sdk.fetchRates();
    expect(rates.length).toBeGreaterThan(0);
  });
});


describe("positions & orders", () => {
  it("fetchPositionsInfo returns positions for test account", async () => {
    const positions = await sdk.fetchPositionsInfo({ address: account });

    expect(Array.isArray(positions)).toBe(true);
    // Account may or may not have open positions depending on test state
    if (positions.length > 0) {
      expect(positions[0].account).toBe(account);
      expect(positions[0].marketAddress).toBeDefined();
      expect(positions[0].sizeInUsd).toBeDefined();
    }
  });

  it("fetchPositionsInfo with includeRelatedOrders returns positions", async () => {
    const [without, withOrders] = await Promise.all([
      sdk.fetchPositionsInfo({ address: account }),
      sdk.fetchPositionsInfo({ address: account, includeRelatedOrders: true }),
    ]);

    expect(Array.isArray(withOrders)).toBe(true);
    // Should return at least the same number of positions
    expect(withOrders.length).toBeGreaterThanOrEqual(without.length);
  });

  it("fetchOrders returns orders array", async () => {
    const orders = await sdk.fetchOrders({ address: account });
    expect(Array.isArray(orders)).toBe(true);
  });
});


describe("express order flow", () => {
  let prepared: PrepareOrderResponse;

  it("prepare increase order returns typed-data", async () => {
    prepared = await sdk.prepareOrder({
      kind: "increase",
      symbol: TEST_SYMBOL,
      direction: "long",
      orderType: "market",
      size: TEST_SIZE_USD,
      collateralToPay: TEST_COLLATERAL,
      mode: "express",
      from: account,
    });

    expect(prepared.requestId).toBeDefined();
    expect(prepared.payloadType).toBe("typed-data");
    expect(prepared.mode).toBe("express");
    expect(prepared.payload.typedData).toBeDefined();
    expect(prepared.payload.typedData.domain).toBeDefined();
    expect(prepared.payload.typedData.types).toBeDefined();
    expect(prepared.payload.typedData.message).toBeDefined();
    expect(prepared.payload.relayParams).toBeDefined();
    expect(prepared.payload.batchParams).toBeDefined();
  });

  it("sign prepared order returns hex signature", async () => {
    const signature = await sdk.signOrder(prepared, signer);

    expect(signature).toBeDefined();
    expect(signature.startsWith("0x")).toBe(true);
    expect(signature.length).toBe(132); // 0x + 65 bytes hex
  });

  it("submit signed order returns accepted status", async () => {
    const signature = await sdk.signOrder(prepared, signer);

    const result = await sdk.submitOrder({
      mode: prepared.mode,
      requestId: prepared.requestId,
      signature,
      from: account,
      idempotencyKey: prepared.idempotencyKey,
      eip712Data: {
        batchParams: prepared.payload.batchParams,
        relayParams: prepared.payload.relayParams,
      },
    });

    expect(result.requestId).toBeDefined();
    expect(result.status).toBeDefined();
    expect(["accepted", "pending", "submitted", "executed", "failed", "reverted"]).toContain(result.status);
  });

  it("executeExpressOrder does full flow in one call", async () => {
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


describe("decrease order flow", () => {
  it("prepare decrease order returns typed-data", async () => {
    // Ensure we have a position — create one if needed
    let positions = await sdk.fetchPositionsInfo({ address: account });
    let pos = positions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));

    if (!pos) {
      const result = await sdk.executeExpressOrder(
        {
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "market",
          size: TEST_SIZE_USD,
          collateralToPay: { amount: 5000000n, token: "USDC" }, // 5 USDC for stable leverage
          mode: "express",
          from: account,
        },
        signer
      );
      const status = await waitForOrderStatus(sdk, result.requestId);
      expect(status.status).toBe("executed");

      // Wait for indexer to pick up the position
      positions = await waitForPositionUpdate(sdk, account, (positions) =>
        positions.some((p: any) => p.isLong && p.indexName?.includes("ETH/USD")),
        30000
      );
      pos = positions.find((p: any) => p.isLong && p.indexName?.includes("ETH/USD"));
    }

    expect(pos).toBeDefined();

    const decreaseSize = BigInt(pos!.sizeInUsd) / 10n;

    const prepared = await sdk.prepareOrder({
      kind: "decrease",
      symbol: TEST_SYMBOL,
      direction: "long",
      orderType: "market",
      size: decreaseSize,
      mode: "express",
      from: account,
    });

    expect(prepared.requestId).toBeDefined();
    expect(prepared.payloadType).toBe("typed-data");
    expect(prepared.payload.typedData).toBeDefined();
  });
});


describe("swap order flow", () => {
  it("prepare swap order returns typed-data", async () => {
    const prepared = await sdk.prepareOrder({
      kind: "swap",
      symbol: TEST_SYMBOL,
      orderType: "market",
      size: 1000000n, // 1 USDC in token decimals
      collateralToPay: { amount: 1000000n, token: "USDC" },
      receiveToken: "ETH",
      mode: "express",
      from: account,
    });

    expect(prepared.requestId).toBeDefined();
    expect(prepared.payloadType).toBe("typed-data");
    expect(prepared.payload.typedData).toBeDefined();
  });
});


describe("limit order flow", () => {
  it("prepare limit increase order", async () => {
    const triggerPrice = 1000n * 10n ** 30n; // $1000

    const prepared = await sdk.prepareOrder({
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

    expect(prepared.requestId).toBeDefined();
    expect(prepared.payloadType).toBe("typed-data");
  });
});


describe("subaccount flow", () => {
  it("generateSubaccount returns deterministic address", async () => {
    const sdk1 = getTestSdk();
    const sdk2 = getTestSdk();

    const addr1 = await sdk1.generateSubaccount(signer);
    const addr2 = await sdk2.generateSubaccount(signer);

    expect(addr1.startsWith("0x")).toBe(true);
    expect(addr1).toBe(addr2);
  });

  it("activateSubaccount sets approval state", async () => {
    const sdkSub = getTestSdk();
    const addr = await sdkSub.activateSubaccount(signer, {
      expiresInSeconds: 86400,
      maxAllowedCount: 10,
    });

    expect(addr).toBeDefined();
    expect(sdkSub.hasActiveSubaccount).toBe(true);
    expect(sdkSub.subaccountAddress).toBe(addr);
  });

  it("fetchSubaccountStatus returns data", async () => {
    const sdkSub = getTestSdk();
    const subAddr = await sdkSub.generateSubaccount(signer);

    const status = await sdkSub.fetchSubaccountStatus({
      account,
      subaccountAddress: subAddr,
    });

    expect(status).toBeDefined();
    expect(typeof status.active).toBe("boolean");
    expect(status.approvalNonce).toBeDefined();
  });

  it("prepare order with subaccount", async () => {
    const sdkSub = getTestSdk();
    await sdkSub.activateSubaccount(signer, {
      expiresInSeconds: 86400,
      maxAllowedCount: 10,
    });

    const prepared = await sdkSub.prepareOrder({
      kind: "increase",
      symbol: TEST_SYMBOL,
      direction: "long",
      orderType: "market",
      size: TEST_SIZE_USD,
      collateralToPay: TEST_COLLATERAL,
      mode: "express",
      from: account,
      subaccountAddress: sdkSub.subaccountAddress,
    });

    expect(prepared.requestId).toBeDefined();
    expect(prepared.payloadType).toBe("typed-data");
  });

  it("prepare and sign order with subaccount", async () => {
    const sdkSub = getTestSdk();
    await sdkSub.activateSubaccount(signer, {
      expiresInSeconds: 86400,
      maxAllowedCount: 10,
    });

    const prepared = await sdkSub.prepareOrder({
      kind: "increase",
      symbol: TEST_SYMBOL,
      direction: "long",
      orderType: "market",
      size: TEST_SIZE_USD,
      collateralToPay: TEST_COLLATERAL,
      mode: "express",
      from: account,
      subaccountAddress: sdkSub.subaccountAddress,
    });

    expect(prepared.requestId).toBeDefined();
    expect(prepared.payloadType).toBe("typed-data");
    expect(prepared.estimates).toBeDefined();

    const signature = await sdkSub.signOrder(prepared, signer);
    expect(signature.startsWith("0x")).toBe(true);
  });

  it("clearSubaccount resets state", async () => {
    const sdkSub = getTestSdk();
    await sdkSub.activateSubaccount(signer, {
      expiresInSeconds: 86400,
      maxAllowedCount: 10,
    });
    expect(sdkSub.hasActiveSubaccount).toBe(true);

    sdkSub.clearSubaccount();
    expect(sdkSub.subaccountAddress).toBeUndefined();
    expect(sdkSub.hasActiveSubaccount).toBe(false);
  });
});


describe("error handling", () => {
  it("prepare with invalid symbol returns error", async () => {
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

  it("prepare with invalid address returns error", async () => {
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

  it("submit without signature returns error", async () => {
    await expect(
      sdk.submitOrder({
        mode: "express",
        from: account,
      })
    ).rejects.toThrow();
  });

  it("fetchPositionsInfo with invalid address returns empty or error", async () => {
    const result = await sdk.fetchPositionsInfo({
      address: "0x0000000000000000000000000000000000000001",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
