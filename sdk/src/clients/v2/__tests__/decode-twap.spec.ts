/* eslint-disable no-console */
import { decodeFunctionData, createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { describe, it } from "vitest";

import GelatoRelayRouter from "abis/GelatoRelayRouter";

const client = createPublicClient({ chain: arbitrum, transport: http() });

describe("decode TWAP revert", () => {
  it("decode and compare", async () => {
    const twapHash = "0xf9b788a399c84227d7c9e5974ba9bb7e85ca988c588e05677fb0c04455d29276";
    const marketHash = "0x3b7930d067a64dbcbb8971d4d7da2f2f70cc5ac640917a697c2afac1e4e755d7";

    for (const [label, hash] of [["TWAP", twapHash], ["MARKET", marketHash]]) {
      const tx = await client.getTransaction({ hash: hash as `0x${string}` });

      const decoded = decodeFunctionData({ abi: GelatoRelayRouter, data: tx.input });

      console.log(`\n=== ${label} ===`);
      console.log("Function:", decoded.functionName);

      const [relayParams, account, params] = decoded.args as any;
      console.log("userNonce:", relayParams.userNonce?.toString());
      console.log("deadline:", relayParams.deadline?.toString());
      console.log("desChainId:", relayParams.desChainId?.toString());
      console.log("fee.feeToken:", relayParams.fee?.feeToken);
      console.log("fee.feeAmount:", relayParams.fee?.feeAmount?.toString());
      console.log("fee.feeSwapPath:", relayParams.fee?.feeSwapPath);
      console.log("tokenPermits:", relayParams.tokenPermits?.length);
      console.log("signature length:", relayParams.signature?.length);
      console.log("account:", account);

      // externalCalls
      console.log("externalCalls.sendTokens:", relayParams.externalCalls?.sendTokens);
      console.log("externalCalls.sendAmounts:", relayParams.externalCalls?.sendAmounts?.map((a: bigint) => a.toString()));

      const orders = params.createOrderParamsList;
      console.log("createOrders:", orders.length);

      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        console.log(`  order[${i}]:`);
        console.log(`    orderType: ${o.orderType}`);
        console.log(`    sizeDeltaUsd: ${o.numbers.sizeDeltaUsd}`);
        console.log(`    collateral: ${o.numbers.initialCollateralDeltaAmount}`);
        console.log(`    executionFee: ${o.numbers.executionFee}`);
        console.log(`    validFromTime: ${o.numbers.validFromTime}`);
        console.log(`    triggerPrice: ${o.numbers.triggerPrice.toString().slice(0, 20)}...`);
        console.log(`    acceptablePrice: ${o.numbers.acceptablePrice.toString().slice(0, 20)}...`);
        console.log(`    isLong: ${o.isLong}`);
        console.log(`    autoCancel: ${o.autoCancel}`);
        console.log(`    market: ${o.addresses.market}`);
        console.log(`    initialCollateralToken: ${o.addresses.initialCollateralToken}`);
        console.log(`    receiver: ${o.addresses.receiver}`);
        console.log(`    swapPath: ${o.addresses.swapPath}`);
        console.log(`    uiFeeReceiver: ${o.addresses.uiFeeReceiver}`);
        console.log(`    referralCode: ${o.referralCode}`);
        console.log(`    dataList: ${o.dataList}`);
      }

      console.log("updateOrders:", params.updateOrderParamsList?.length);
      console.log("cancelKeys:", params.cancelOrderKeys?.length);
    }
  });
});
