import { describe, it, expect } from "vitest";
import { encodePacked, type Hex, type Address, encodeFunctionData } from "viem";
import GelatoRelayRouterAbi from "abis/GelatoRelayRouter";
import { getTestSdk, requireSigner, waitForOrderStatus, TEST_SYMBOL } from "./testUtil";
import { sendToGelatoRelay, waitForGelatoTask } from "utils/express/utils/gelatoRelayUtils";
import { getBatchParamsLists } from "utils/express/utils/batchOrderUtils";
import { ARBITRUM } from "configs/chains";

const sdk = getTestSdk();
const signer = requireSigner();
const account = signer.address;

describe("TWAP direct Gelato submission", () => {
  it("prepare TWAP → build calldata locally → submit to Gelato directly", async () => {
    // Step 1: Prepare the order via API
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

    console.log("Prepared request ID:", prepared.requestId);
    console.log("createOrderParams count:", prepared.payload.batchParams.createOrderParams.length);

    // Step 2: Sign the typed data
    const signature = await sdk.signOrder(prepared, signer);
    console.log("Signature:", signature);

    // Step 3: Build calldata locally (same as SDK frontend would)
    const relayParams = prepared.payload.relayParams;
    const relayParamsWithSignature = {
      ...relayParams,
      signature,
    };

    const paramsLists = getBatchParamsLists(prepared.payload.batchParams);
    console.log("paramsLists.createOrderParamsList count:", paramsLists.createOrderParamsList.length);

    const relayRouterAddress = prepared.payload.relayRouterAddress;
    console.log("relayRouterAddress:", relayRouterAddress);

    const callData = encodeFunctionData({
      abi: GelatoRelayRouterAbi,
      functionName: "batch",
      args: [relayParamsWithSignature as any, account, paramsLists as any],
    });

    console.log("Local calldata length:", callData.length, "bytes:", (callData.length - 2) / 2);

    // Step 4: Submit directly to Gelato (bypass API /submit endpoint)
    const feeToken = relayParams.fee.feeToken;
    const feeAmount = relayParams.fee.feeAmount;
    console.log("feeToken:", feeToken);
    console.log("feeAmount:", feeAmount.toString());

    const { taskId, relayerClient } = await sendToGelatoRelay({
      chainId: ARBITRUM,
      txnData: {
        callData,
        to: relayRouterAddress,
        feeToken,
        feeAmount,
      },
    });

    console.log("Gelato taskId:", taskId);

    // Step 5: Wait for the result
    const result = await waitForGelatoTask(relayerClient, taskId, { timeout: 60000 });
    console.log("Gelato result:", JSON.stringify(result, null, 2));

    // Also check via API
    if (result.transactionHash) {
      console.log("Tx hash:", result.transactionHash);
    }

    console.log("Status:", result.status);
  }, 120000);
});
