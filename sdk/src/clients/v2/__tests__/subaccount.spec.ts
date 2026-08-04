import { describe, expect, it } from "vitest";

import type { PrepareOrderRequest, SubmitOrderRequest } from "utils/orderTransactions/api";
import { getEmptySubaccountApproval } from "utils/subaccount";

import { GmxApiSdk } from "../index";
import {
  buildPreparedOrderResponse,
  buildSubaccountStatusResponse,
  getOrCreateTestSigner,
  getTestSdk,
  ScriptedOrderApi,
  TEST_CHAIN_ID,
  TEST_COLLATERAL,
  TEST_SIZE_USD,
  TEST_SYMBOL,
} from "./testUtil";

const signer = getOrCreateTestSigner();

const LIMIT_TRIGGER_PRICE = 1n * 10n ** 30n;
const EXTERNAL_SUBACCOUNT_ADDRESS = "0x1111111111111111111111111111111111111111";

function buildTestPrepareRequest(from: string): PrepareOrderRequest {
  return {
    kind: "increase",
    symbol: TEST_SYMBOL,
    direction: "long",
    orderType: "limit",
    size: TEST_SIZE_USD,
    triggerPrice: LIMIT_TRIGGER_PRICE,
    collateralToken: "USDC",
    collateralToPay: TEST_COLLATERAL,
    mode: "express",
    from,
  };
}

describe("GmxApiSdk — subaccount (1CT)", () => {
  it("rejects external subaccount details for SDK-managed signing", async () => {
    const api = new ScriptedOrderApi(buildPreparedOrderResponse("request-1"));
    const sdk = new GmxApiSdk({ chainId: TEST_CHAIN_ID, api });
    const subaccountAddress = await sdk.generateSubaccount(signer);

    await expect(
      sdk.prepareOrder({
        ...buildTestPrepareRequest(signer.address),
        subaccountAddress: EXTERNAL_SUBACCOUNT_ADDRESS,
        subaccountApproval: getEmptySubaccountApproval(TEST_CHAIN_ID, subaccountAddress),
      })
    ).rejects.toThrow("subaccountAddress");

    await expect(
      sdk.prepareOrder({
        ...buildTestPrepareRequest(signer.address),
        subaccountApproval: getEmptySubaccountApproval(TEST_CHAIN_ID, EXTERNAL_SUBACCOUNT_ADDRESS),
      })
    ).rejects.toThrow("subaccountApproval.subaccount");

    expect(api.prepareRequests).toHaveLength(0);
  });

  it("keeps prepared subaccount approval after failed submit response", async () => {
    const requestId = "retry-request";
    const api = new ScriptedOrderApi(
      buildPreparedOrderResponse(requestId),
      [
        {
          requestId,
          status: "relay_failed",
          error: { code: "TEST_RELAY_FAILED", message: "relay failed" },
        },
        {
          requestId,
          status: "relay_accepted",
        },
      ],
      [buildSubaccountStatusResponse()]
    );
    const sdk = new GmxApiSdk({ chainId: TEST_CHAIN_ID, api });
    const subaccountAddress = await sdk.generateSubaccount(signer);
    const subaccountApproval = getEmptySubaccountApproval(TEST_CHAIN_ID, subaccountAddress);

    await sdk.prepareOrder({
      ...buildTestPrepareRequest(signer.address),
      subaccountAddress,
      subaccountApproval,
    });

    const submitRequest: SubmitOrderRequest = {
      mode: "express",
      requestId,
      signature: "0x",
      from: signer.address,
      eip712Data: {
        batchParams: {},
        relayParams: {},
      },
    };

    await sdk.submitOrder(submitRequest);
    await sdk.submitOrder(submitRequest);

    expect(api.submitRequests[0].eip712Data?.subaccountApproval?.signature).toBe("0x");
    expect(api.submitRequests[1].eip712Data?.subaccountApproval?.signature).toBe("0x");
  });

  it("decrements cached subaccount actions only after final order status", async () => {
    const requestId = "accepted-request";
    const api = new ScriptedOrderApi(
      buildPreparedOrderResponse(requestId),
      [
        {
          requestId,
          status: "executed",
        },
      ],
      [
        buildSubaccountStatusResponse({
          currentActionsCount: "3",
          remainingActions: "2",
        }),
      ]
    );
    const sdk = new GmxApiSdk({ chainId: TEST_CHAIN_ID, api });
    await sdk.generateSubaccount(signer);
    await sdk.refreshSubaccountState(signer.address);

    await sdk.prepareOrder(buildTestPrepareRequest(signer.address));
    await sdk.submitOrder({
      mode: "express",
      requestId,
      signature: "0x",
      from: signer.address,
      eip712Data: {
        batchParams: {},
        relayParams: {},
      },
    });

    expect(sdk.subaccountStatus?.currentActionsCount).toBe(4n);
    expect(sdk.subaccountStatus?.remainingActions).toBe(1n);
  });

  it("does not decrement cached subaccount actions for relay_accepted status", async () => {
    const requestId = "relay-accepted-request";
    const api = new ScriptedOrderApi(
      buildPreparedOrderResponse(requestId),
      [
        {
          requestId,
          status: "relay_accepted",
        },
      ],
      [
        buildSubaccountStatusResponse({
          currentActionsCount: "3",
          remainingActions: "2",
        }),
      ]
    );
    const sdk = new GmxApiSdk({ chainId: TEST_CHAIN_ID, api });
    await sdk.generateSubaccount(signer);
    await sdk.refreshSubaccountState(signer.address);

    await sdk.prepareOrder(buildTestPrepareRequest(signer.address));
    await sdk.submitOrder({
      mode: "express",
      requestId,
      signature: "0x",
      from: signer.address,
      eip712Data: {
        batchParams: {},
        relayParams: {},
      },
    });

    expect(sdk.subaccountStatus?.currentActionsCount).toBe(3n);
    expect(sdk.subaccountStatus?.remainingActions).toBe(2n);
  });

  it("refreshes subaccount state before noop approval when only one action remains", async () => {
    const api = new ScriptedOrderApi(
      buildPreparedOrderResponse("request-1"),
      [],
      [
        buildSubaccountStatusResponse({
          currentActionsCount: "9",
          remainingActions: "1",
        }),
        buildSubaccountStatusResponse({
          currentActionsCount: "10",
          remainingActions: "0",
        }),
      ]
    );
    const sdk = new GmxApiSdk({ chainId: TEST_CHAIN_ID, api });
    await sdk.generateSubaccount(signer);
    await sdk.refreshSubaccountState(signer.address);

    await expect(sdk.prepareOrder(buildTestPrepareRequest(signer.address))).rejects.toThrow("Subaccount is not active");

    expect(api.subaccountStatusRequests).toHaveLength(2);
    expect(api.prepareRequests).toHaveLength(0);
  });

  it("validates caller-supplied noop approval against exhausted subaccount quota", async () => {
    const api = new ScriptedOrderApi(
      buildPreparedOrderResponse("request-1"),
      [],
      [
        buildSubaccountStatusResponse({
          currentActionsCount: "10",
          remainingActions: "0",
        }),
      ]
    );
    const sdk = new GmxApiSdk({ chainId: TEST_CHAIN_ID, api });
    const subaccountAddress = await sdk.generateSubaccount(signer);
    await sdk.refreshSubaccountState(signer.address);

    await expect(
      sdk.prepareOrder({
        ...buildTestPrepareRequest(signer.address),
        subaccountAddress,
        subaccountApproval: getEmptySubaccountApproval(TEST_CHAIN_ID, subaccountAddress),
      })
    ).rejects.toThrow("Subaccount is not active");

    expect(api.prepareRequests).toHaveLength(0);
  });

  it("generateSubaccount derives address deterministically", async () => {
    const sdk1 = getTestSdk();
    const sdk2 = getTestSdk();

    const addr1 = await sdk1.generateSubaccount(signer);
    const addr2 = await sdk2.generateSubaccount(signer);

    expect(addr1).toBeDefined();
    expect(addr1.startsWith("0x")).toBe(true);
    expect(addr1).toBe(addr2);
  });

  it("subaccountAddress getter works after generate", async () => {
    const sdk = getTestSdk();
    expect(sdk.subaccountAddress).toBeUndefined();

    await sdk.generateSubaccount(signer);
    expect(sdk.subaccountAddress).toBeDefined();
    expect(sdk.hasActiveSubaccount).toBe(false);
  });

  it("clearSubaccount resets state", async () => {
    const sdk = getTestSdk();
    await sdk.generateSubaccount(signer);

    expect(sdk.subaccountAddress).toBeDefined();
    sdk.clearSubaccount();
    expect(sdk.subaccountAddress).toBeUndefined();
    expect(sdk.hasActiveSubaccount).toBe(false);
  });

  it("activateSubaccount prepares and signs approval", async () => {
    const sdk = getTestSdk();

    const address = await sdk.activateSubaccount(signer, {
      expiresInSeconds: 86400,
      maxAllowedCount: 10,
    });

    expect(address).toBeDefined();
    expect(sdk.subaccountAddress).toBe(address);
    expect(sdk.hasActiveSubaccount).toBe(true);
  });

  it("fetchSubaccountStatus returns data", async () => {
    const sdk = getTestSdk();
    const subAddr = await sdk.generateSubaccount(signer);

    const status = await sdk.fetchSubaccountStatus({
      account: signer.address,
      subaccountAddress: subAddr,
    });

    expect(status).toBeDefined();
    expect(typeof status.active).toBe("boolean");
    expect(status.approvalNonce).toBeDefined();
  });

  it("signOrder uses subaccount signer when active", async () => {
    const sdk = getTestSdk();
    await sdk.activateSubaccount(signer, {
      expiresInSeconds: 86400,
      maxAllowedCount: 10,
    });

    const prepared = await sdk.prepareOrder({
      kind: "increase",
      symbol: "ETH/USD [WETH-USDC]",
      direction: "long",
      orderType: "market",
      size: 100n * 10n ** 30n,
      collateralToPay: { amount: 1000000n, token: "USDC" },
      mode: "express",
      from: signer.address,
      subaccountAddress: sdk.subaccountAddress,
    });

    const signature = await sdk.signOrder(prepared, signer);
    expect(signature).toBeDefined();
    expect(signature.startsWith("0x")).toBe(true);
  });
});
