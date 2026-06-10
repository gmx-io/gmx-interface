import { describe, expect, it } from "vitest";

import type { OrderStatusResponse, PrepareOrderRequest, SubmitOrderRequest } from "utils/orderTransactions/api";
import { getEmptySubaccountApproval } from "utils/subaccount";

import { GmxApiSdk } from "../index";
import {
  buildPreparedOrderResponse,
  buildSubaccountStatusResponse,
  getTestSdk,
  getTestSigner,
  RecordingApi,
  ScriptedOrderApi,
  TEST_CHAIN_ID,
  TEST_COLLATERAL,
  TEST_SIZE_USD,
  TEST_SYMBOL,
} from "./testUtil";

const signer = getTestSigner();
const hasSigner = !!signer;

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

async function waitForSubaccountNoopApproval(sdk: GmxApiSdk, account: string): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30000) {
    await sdk.refreshSubaccountState(account);

    if (sdk.subaccountApprovalMessage?.signature === "0x") {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Timed out waiting for subaccount approval to sync on-chain");
}

async function waitForOrderCreatedOrExecuted(sdk: GmxApiSdk, requestId: string): Promise<OrderStatusResponse> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 180000) {
    const status = await sdk.fetchOrderStatus({ requestId });

    if (
      status.status === "created" ||
      status.status === "executed" ||
      status.status === "cancelled" ||
      status.status === "relay_failed" ||
      status.status === "relay_reverted"
    ) {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return sdk.fetchOrderStatus({ requestId });
}

describe("GmxApiSdk — subaccount (1CT)", () => {
  it.skipIf(!hasSigner)("rejects external subaccount details for SDK-managed signing", async () => {
    const signer = getTestSigner()!;
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

  it.skipIf(!hasSigner)("keeps prepared subaccount approval after failed submit response", async () => {
    const signer = getTestSigner()!;
    const requestId = "retry-request";
    const api = new ScriptedOrderApi(buildPreparedOrderResponse(requestId), [
      {
        requestId,
        status: "relay_failed",
        error: { code: "TEST_RELAY_FAILED", message: "relay failed" },
      },
      {
        requestId,
        status: "relay_accepted",
      },
    ]);
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

  it.skipIf(!hasSigner)("decrements cached subaccount actions only after final order status", async () => {
    const signer = getTestSigner()!;
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

  it.skipIf(!hasSigner)("does not decrement cached subaccount actions for relay_accepted status", async () => {
    const signer = getTestSigner()!;
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

  it.skipIf(!hasSigner)("refreshes subaccount state before noop approval when only one action remains", async () => {
    const signer = getTestSigner()!;
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

  it.skipIf(!hasSigner)(
    "e2e applies approval once and uses noop approval for the next order",
    async () => {
      const signer = getTestSigner()!;
      const account = signer.address;
      const recordingApi = new RecordingApi(getTestSdk().ctx.api);
      const sdkSub = new GmxApiSdk({ chainId: TEST_CHAIN_ID, api: recordingApi });
      const cleanupSdk = new GmxApiSdk({ chainId: TEST_CHAIN_ID, api: recordingApi });

      try {
        const subaccountAddress = await sdkSub.generateSubaccount(signer);
        const statusBefore = await sdkSub.refreshSubaccountState(account);

        await sdkSub.activateSubaccount(signer, {
          expiresInSeconds: 86400,
          maxAllowedCount: (statusBefore?.maxAllowedCount ?? 0n) + 2n,
        });

        const signedApproval = sdkSub.subaccountApprovalMessage;
        expect(signedApproval).toBeDefined();
        expect(signedApproval!.signature).not.toBe("0x");

        const first = await sdkSub.executeExpressOrder(
          {
            kind: "increase",
            symbol: TEST_SYMBOL,
            direction: "long",
            orderType: "limit",
            size: TEST_SIZE_USD,
            triggerPrice: LIMIT_TRIGGER_PRICE,
            collateralToken: "USDC",
            collateralToPay: TEST_COLLATERAL,
            mode: "express",
            from: account,
          },
          signer
        );

        expect(first.requestId).toBeDefined();
        const firstStatus = await waitForOrderCreatedOrExecuted(sdkSub, first.requestId);
        expect(["created", "executed"]).toContain(firstStatus.status);

        expect(recordingApi.orderPrepareRequests[0].subaccountAddress).toBe(subaccountAddress);
        expect(recordingApi.orderPrepareRequests[0].subaccountApproval?.signature).toBe(signedApproval!.signature);
        expect(recordingApi.orderSubmitRequests[0].eip712Data?.subaccountApproval?.signature).toBe(
          signedApproval!.signature
        );

        await waitForSubaccountNoopApproval(sdkSub, account);

        const staleApproval = signedApproval!;
        await sdkSub.prepareOrder({
          kind: "increase",
          symbol: TEST_SYMBOL,
          direction: "long",
          orderType: "limit",
          size: TEST_SIZE_USD,
          triggerPrice: LIMIT_TRIGGER_PRICE,
          collateralToken: "USDC",
          collateralToPay: TEST_COLLATERAL,
          mode: "express",
          from: account,
          subaccountAddress,
          subaccountApproval: staleApproval,
        });

        expect(recordingApi.orderPrepareRequests[1].subaccountApproval?.signature).toBe("0x");
      } finally {
        try {
          const prepared = await cleanupSdk.prepareCancelOrder({ all: true, mode: "express", from: account });
          const cancelSignature = await cleanupSdk.signOrder(prepared, signer);
          await cleanupSdk.submitOrder({
            mode: prepared.mode,
            requestId: prepared.requestId,
            signature: cancelSignature,
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
        sdkSub.clearSubaccount();
      }
    },
    300000
  );

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
      size: 100n * 10n ** 30n,
      collateralToPay: { amount: 1000000n, token: "USDC" },
      mode: "express",
      from: signer!.address,
      subaccountAddress: sdk.subaccountAddress,
    });

    const signature = await sdk.signOrder(prepared, signer!);
    expect(signature).toBeDefined();
    expect(signature.startsWith("0x")).toBe(true);
  });
});
