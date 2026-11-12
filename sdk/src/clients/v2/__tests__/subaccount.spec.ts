import { isAddress, keccak256, recoverTypedDataAddress } from "viem";
import { generatePrivateKey } from "viem/accounts";
import { describe, expect, it, vi } from "vitest";

import { getContract } from "configs/contracts";
import { OLD_SUBACCOUNT_MESSAGE, SUBACCOUNT_MESSAGE } from "configs/express";
import type { PrepareOrderRequest, SubmitOrderRequest } from "utils/orderTransactions/api";
import { PrivateKeySigner } from "utils/signer";
import { deriveLegacySubaccount, getEmptySubaccountApproval } from "utils/subaccount";

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
    const subaccountAddress = sdk.generateSubaccount();

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
    const subaccountAddress = sdk.generateSubaccount();
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
    sdk.generateSubaccount();
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
    sdk.generateSubaccount();
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
    sdk.generateSubaccount();
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
    const subaccountAddress = sdk.generateSubaccount();
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

  it("generateSubaccount returns a new address each time", () => {
    const addr1 = getTestSdk().generateSubaccount();
    const addr2 = getTestSdk().generateSubaccount();

    expect(isAddress(addr1)).toBe(true);
    expect(addr1).not.toBe(addr2);
  });

  it("importSubaccount resumes an exported key and signs orders as the same address", async () => {
    const exportingSdk = getTestSdk();
    const address = exportingSdk.generateSubaccount();
    const exported = exportingSdk.exportSubaccount()!;

    const typedData = {
      domain: {
        name: "GmxBaseGelatoRelayRouter",
        version: "1",
        chainId: TEST_CHAIN_ID,
        verifyingContract: getContract(TEST_CHAIN_ID, "SubaccountGelatoRelayRouter"),
      },
      types: { Batch: [{ name: "nonce", type: "uint256" }] },
      primaryType: "Batch",
      message: { nonce: 1n },
    };
    const prepared = buildPreparedOrderResponse("request-1");
    prepared.payload.typedData = typedData;

    const api = new ScriptedOrderApi(prepared, [], [buildSubaccountStatusResponse()]);
    const sdk = new GmxApiSdk({ chainId: TEST_CHAIN_ID, api });

    expect(sdk.importSubaccount(exported.privateKey, signer.address)).toBe(address);
    expect(sdk.exportSubaccount()).toEqual(exported);

    await sdk.refreshSubaccountState(signer.address);
    const signature = await sdk.signOrder(await sdk.prepareOrder(buildTestPrepareRequest(signer.address)), signer);

    expect(api.prepareRequests[0].subaccountApproval?.signature).toBe("0x");
    expect(
      await recoverTypedDataAddress({
        domain: { ...typedData.domain, verifyingContract: typedData.domain.verifyingContract as `0x${string}` },
        types: typedData.types,
        primaryType: "Batch",
        message: typedData.message,
        signature: signature as `0x${string}`,
      })
    ).toBe(address);
  });

  it("activateSubaccount keeps an imported key and signs nothing while the session is usable", async () => {
    const exportingSdk = getTestSdk();
    const address = exportingSdk.generateSubaccount();
    const exported = exportingSdk.exportSubaccount()!;

    const api = new ScriptedOrderApi(buildPreparedOrderResponse("request-1"), [], [buildSubaccountStatusResponse()]);
    const sdk = new GmxApiSdk({ chainId: TEST_CHAIN_ID, api });
    const signTypedData = vi.spyOn(signer, "signTypedData");

    sdk.importSubaccount(exported.privateKey, signer.address);

    expect(await sdk.activateSubaccount(signer, { expiresInSeconds: 3600, maxAllowedCount: 5 })).toBe(address);
    expect(sdk.exportSubaccount()).toEqual(exported);
    expect(signTypedData).not.toHaveBeenCalled();

    signTypedData.mockRestore();
  });

  it("keeps an imported key bound to its account", async () => {
    const exportingSdk = getTestSdk();
    exportingSdk.generateSubaccount();
    const exported = exportingSdk.exportSubaccount()!;
    const otherSigner = new PrivateKeySigner(generatePrivateKey() as `0x${string}`);

    const sdk = getTestSdk();
    sdk.importSubaccount(exported.privateKey, signer.address);

    await expect(sdk.activateSubaccount(otherSigner)).rejects.toThrow("belongs to account");
    await expect(sdk.prepareOrder(buildTestPrepareRequest(otherSigner.address))).rejects.toThrow("belongs to account");
    expect(sdk.exportSubaccount()).toEqual(exported);
  });

  it("deriveLegacySubaccount rebuilds the key of each retired message", async () => {
    const getExpectedAddress = async (message: string) =>
      new PrivateKeySigner(keccak256((await signer.signMessage(message)) as `0x${string}`) as `0x${string}`).address;

    expect((await deriveLegacySubaccount(signer)).address).toBe(await getExpectedAddress(SUBACCOUNT_MESSAGE));
    expect((await deriveLegacySubaccount(signer, OLD_SUBACCOUNT_MESSAGE)).address).toBe(
      await getExpectedAddress(OLD_SUBACCOUNT_MESSAGE)
    );
  });

  it("subaccountAddress getter works after generate", async () => {
    const sdk = getTestSdk();
    expect(sdk.subaccountAddress).toBeUndefined();

    sdk.generateSubaccount();
    expect(sdk.subaccountAddress).toBeDefined();
    expect(sdk.hasActiveSubaccount).toBe(false);
  });

  it("clearSubaccount resets state", async () => {
    const sdk = getTestSdk();
    sdk.generateSubaccount();

    expect(sdk.subaccountAddress).toBeDefined();
    sdk.clearSubaccount();
    expect(sdk.subaccountAddress).toBeUndefined();
    expect(sdk.exportSubaccount()).toBeUndefined();
    expect(sdk.hasActiveSubaccount).toBe(false);
  });

  it("activateSubaccount prepares and signs approval", async () => {
    const sdk = getTestSdk();
    const signMessage = vi.spyOn(signer, "signMessage");

    const address = await sdk.activateSubaccount(signer, {
      expiresInSeconds: 86400,
      maxAllowedCount: 10,
    });

    expect(address).toBeDefined();
    expect(sdk.subaccountAddress).toBe(address);
    expect(sdk.hasActiveSubaccount).toBe(true);
    expect(signMessage).not.toHaveBeenCalled();

    signMessage.mockRestore();
  });

  it("fetchSubaccountStatus returns data", async () => {
    const sdk = getTestSdk();
    const subAddr = sdk.generateSubaccount();

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
      symbol: TEST_SYMBOL,
      direction: "long",
      orderType: "market",
      size: TEST_SIZE_USD,
      collateralToPay: TEST_COLLATERAL,
      mode: "express",
      from: signer.address,
      subaccountAddress: sdk.subaccountAddress,
    });

    const signature = await sdk.signOrder(prepared, signer);
    expect(signature).toBeDefined();
    expect(signature.startsWith("0x")).toBe(true);
  });
});
