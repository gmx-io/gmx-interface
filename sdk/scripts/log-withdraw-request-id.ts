import { loadEnv } from "vite";
import { ARBITRUM, SOURCE_BASE_MAINNET } from "../src/configs/chains";
import { getViemChain } from "../src/configs/chains";
import { GmxApiSdk } from "../src/clients/v2/index";
import { PrivateKeySigner } from "../src/utils/signer";
import { waitForWithdrawStatus } from "../src/clients/v2/__tests__/multichainTestUtil";

Object.assign(process.env, loadEnv("test", process.cwd(), ""));

const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const STARGATE_USDC_ARBITRUM = "0xe8CDF27AcD73a434D661C84887215F7598e7d0d3";
const WITHDRAW_AMOUNT = 500_000n;

async function main() {
  const apiUrl = process.env.GMX_TEST_API_URL ?? "https://arbitrum.gmxapi.io/v1";
  const pk = process.env.GMX_TEST_PRIVATE_KEY;
  const rpcUrl = process.env.GMX_TEST_RPC_URL;

  if (!pk || !rpcUrl) {
    throw new Error("GMX_TEST_PRIVATE_KEY and GMX_TEST_RPC_URL required in sdk/.env.test.local");
  }

  const sdk = new GmxApiSdk({ chainId: ARBITRUM, apiUrl });
  const signer = new PrivateKeySigner(pk, { rpcUrl, chain: getViemChain(ARBITRUM) });
  const account = signer.address;

  const bridgeOutParams = sdk.buildCrossChainWithdrawBridgeOutParams({
    tokenAddress: USDC_ARBITRUM,
    amount: WITHDRAW_AMOUNT,
    dstChainId: SOURCE_BASE_MAINNET,
    stargateAddress: STARGATE_USDC_ARBITRUM,
  });

  const submitted = await sdk.executeCrossChainWithdraw(signer, {
    srcChainId: SOURCE_BASE_MAINNET,
    account,
    bridgeOutParams,
  });

  console.log("account:", account);
  console.log("requestId:", submitted.requestId);
  console.log("submitStatus:", submitted.status);
  console.log("taskId:", submitted.taskId ?? "(none)");

  const statusUrl = `${apiUrl}/gmx-account/withdraw/cross-chain/status`;
  console.log("statusEndpoint:", statusUrl);
  console.log(
    "statusCurl:",
    `curl -sS -X POST '${statusUrl}' -H 'Content-Type: application/json' -d '{"requestId":"${submitted.requestId}"}'`
  );

  const final = await waitForWithdrawStatus(sdk, submitted.requestId, 120_000);
  console.log("finalStatus:", final.status);
  console.log("txHash:", final.txHash ?? "(none)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
