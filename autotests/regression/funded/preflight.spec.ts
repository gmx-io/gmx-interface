import { test } from "@playwright/test";

import { checkGasPrice } from "./gasGuard";

test("funded prerequisite: live RPC chain, freshness and gas ceiling", async ({}, testInfo) => {
  const chainId = testInfo.config.metadata.chainId as number;
  const network = chainId === 42161 ? "ARBITRUM" : "AVALANCHE";
  const result = await checkGasPrice({
    chainId,
    rpcUrl: process.env.REGRESSION_RPC_URL || process.env[`REGRESSION_${network}_RPC_URL`],
    maxGasGwei: process.env.REGRESSION_MAX_GAS_GWEI || process.env[`REGRESSION_${network}_MAX_GAS_GWEI`],
  });
  await testInfo.attach("gas-preflight", { body: JSON.stringify(result), contentType: "application/json" });
  test.skip(!result.allowed, `BLOCKED: ${result.reason}`);
});
