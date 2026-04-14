import { describe, it, expect } from "vitest";
import { verifyTypedData, createPublicClient, http, decodeAbiParameters, parseAbiParameters, keccak256, encodeAbiParameters, concatHex, type Hex } from "viem";
import { arbitrum } from "viem/chains";
import GelatoRelayRouter from "abis/GelatoRelayRouter";
import { getTestSdk, requireSigner, expressFlow, TEST_SYMBOL } from "./testUtil";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

describe("verify TWAP signature", () => {
  it("prepare TWAP and verify signature matches", async () => {
    const prepared = await sdk.prepareOrder({
      kind: "increase",
      orderType: "twap",
      symbol: TEST_SYMBOL,
      direction: "long",
      size: 100n * 10n ** 30n,
      collateralToPay: { amount: 4_000_000n, token: "USDC" },
      twapConfig: { duration: 120, parts: 2 },
      mode: "express",
      from: account,
    });

    const typedData = prepared.payload.typedData;
    console.log("Domain:", JSON.stringify(typedData.domain));
    console.log("Primary type:", typedData.types?.Batch ? "Batch" : "unknown");
    console.log("Message account:", typedData.message?.account);
    console.log("Message createOrderParamsList count:", typedData.message?.createOrderParamsList?.length);

    // Sign the order
    const signature = await sdk.signOrder(prepared, signer);
    console.log("Signature:", signature);

    // Verify signature
    const isValid = await verifyTypedData({
      address: account as `0x${string}`,
      domain: typedData.domain as any,
      types: typedData.types as any,
      primaryType: "Batch",
      message: typedData.message as any,
      signature: signature as `0x${string}`,
    });
    console.log("Signature valid for account:", isValid);
    expect(isValid).toBe(true);

    // Now check what the relay params hash is
    const relayParamsHash = typedData.message?.relayParams;
    console.log("relayParams hash in message:", relayParamsHash);
    console.log("subaccountApproval hash:", typedData.message?.subaccountApproval);

    // Also verify the batch params match what would be sent to submit
    const batchParams = prepared.payload.batchParams;
    console.log("\nbatchParams.createOrderParams count:", batchParams?.createOrderParams?.length);
    if (batchParams?.createOrderParams?.length > 0) {
      const first = batchParams.createOrderParams[0];
      console.log("first order payload:", JSON.stringify({
        orderType: first.orderPayload?.orderType,
        isLong: first.orderPayload?.isLong,
        sizeDeltaUsd: first.orderPayload?.numbers?.sizeDeltaUsd?.toString(),
        executionFee: first.orderPayload?.numbers?.executionFee?.toString(),
      }));
    }
  });

  it("prepare MARKET and verify signature matches", async () => {
    const prepared = await sdk.prepareOrder({
      kind: "increase",
      orderType: "market",
      symbol: TEST_SYMBOL,
      direction: "long",
      size: 100n * 10n ** 30n,
      collateralToPay: { amount: 5_000_000n, token: "USDC" },
      mode: "express",
      from: account,
    });

    const typedData = prepared.payload.typedData;
    console.log("Domain:", JSON.stringify(typedData.domain));
    console.log("Message account:", typedData.message?.account);
    console.log("Message createOrderParamsList count:", typedData.message?.createOrderParamsList?.length);

    const signature = await sdk.signOrder(prepared, signer);
    console.log("Signature:", signature);

    const isValid = await verifyTypedData({
      address: account as `0x${string}`,
      domain: typedData.domain as any,
      types: typedData.types as any,
      primaryType: "Batch",
      message: typedData.message as any,
      signature: signature as `0x${string}`,
    });
    console.log("Signature valid for account:", isValid);
    expect(isValid).toBe(true);
  });
});
