import { test } from "@playwright/test";
import { createPublicClient, getAddress, http } from "viem";
import { arbitrum } from "viem/chains";

import { selectedCasesFromEnvironment } from "./catalog";
import { checkFundedDeployment } from "./deployment";

test("selected funded scenarios have a reachable deployment, restored wallet and required selectors", async ({
  page,
  context,
}, testInfo) => {
  const address = getAddress(process.env.REGRESSION_FUNDED_ADDRESS!);
  const rpc = createPublicClient({
    chain: arbitrum,
    transport: http(process.env.REGRESSION_RPC_URL || "https://arb1.arbitrum.io/rpc", {
      timeout: 15_000,
      retryCount: 0,
    }),
  });
  const result = await checkFundedDeployment(page, context, { address, rpc }, selectedCasesFromEnvironment());
  await testInfo.attach("deployment-readiness", { body: JSON.stringify(result), contentType: "application/json" });
});
