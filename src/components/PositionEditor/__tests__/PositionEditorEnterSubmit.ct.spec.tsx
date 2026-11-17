import { test, expect } from "@playwright/experimental-ct-react";
import { decodeFunctionData, toFunctionSelector, type Hex } from "viem";

import {
  decreaseOrderGasLimitKey,
  ESTIMATED_GAS_FEE_BASE_AMOUNT_V2_1,
  ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR,
  ESTIMATED_GAS_FEE_PER_ORACLE_PRICE,
} from "config/dataStore";
import { MOCK_ACCOUNT_PRIVATE_KEY, MockChain } from "domain/testUtils/rpc/mockChain";
import { installRpcResponder } from "domain/testUtils/rpc/playwrightAdapter";
import type { RpcRequest } from "domain/testUtils/rpc/types";
import { getDataQALocator } from "lib/__tests__/testUtils";
import ExchangeRouterAbi from "sdk/abis/ExchangeRouter";
import { ARBITRUM } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";

import { NetworkFeeSurfaceStory } from "components/NetworkFeeRow/__tests__/NetworkFeeSurfaces.ct.stories";

const EXCHANGE_ROUTER_ADDRESS = getContract(ARBITRUM, "ExchangeRouter").toLowerCase();
const MULTICALL_SELECTOR = toFunctionSelector("multicall(bytes[])");

/** The app sends an order only after its simulation reverts with EndOfOracleSimulation. */
class SimulatingChain extends MockChain {
  async handle(chainId: number, request: RpcRequest): Promise<unknown> {
    const call = request.method === "eth_call" ? (request.params as { to?: string; data?: string }[])[0] : undefined;

    if (call?.to?.toLowerCase() === EXCHANGE_ROUTER_ADDRESS && call.data?.startsWith(MULTICALL_SELECTOR)) {
      throw Object.assign(new Error("execution reverted"), {
        rpcCode: 3,
        rpcData: toFunctionSelector("EndOfOracleSimulation()"),
      });
    }

    return super.handle(chainId, request);
  }
}

function getCollateralDeltaAmount(multicallData: string): bigint | undefined {
  const multicall = decodeFunctionData({ abi: ExchangeRouterAbi, data: multicallData as Hex });

  if (multicall.functionName !== "multicall") {
    return undefined;
  }

  for (const callData of multicall.args[0]) {
    const call = decodeFunctionData({ abi: ExchangeRouterAbi, data: callData });

    if (call.functionName === "createOrder") {
      return call.args[0].numbers.initialCollateralDeltaAmount;
    }
  }

  return undefined;
}

test.setTimeout(90_000);

test.describe("Edit margin", () => {
  test("Enter after Max and a smaller typed amount withdraws the typed amount", async ({ mount, page }) => {
    const chain = new SimulatingChain({ walletPrivateKey: MOCK_ACCOUNT_PRIVATE_KEY });
    chain.setDataStoreUint(decreaseOrderGasLimitKey(), 4000000n);
    chain.setDataStoreUint(ESTIMATED_GAS_FEE_BASE_AMOUNT_V2_1, 600000n);
    chain.setDataStoreUint(ESTIMATED_GAS_FEE_PER_ORACLE_PRICE, 250000n);
    chain.setDataStoreUint(ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR, 10n ** 30n);
    await installRpcResponder(page, chain);

    await mount(<NetworkFeeSurfaceStory surface="editMargin" />);
    await page.locator(getDataQALocator("open-position-editor")).click();
    await page.locator(getDataQALocator("operation-tabs")).getByText("Withdraw", { exact: true }).click();

    const input = page.locator(getDataQALocator("amount-input-input"));
    const submitButton = page.locator(getDataQALocator("confirm-button"));

    await page.locator(getDataQALocator("amount-input-max")).click();
    await expect(submitButton).toBeEnabled({ timeout: 40_000 });

    // overwriting a valid amount with another valid one never disables the button
    await input.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("100");
    await expect(input).toHaveValue("100");
    await expect(submitButton).toBeEnabled();

    await page.keyboard.press("Enter");

    await expect.poll(() => chain.sentTransactions.length, { timeout: 40_000 }).toBe(1);
    expect(getCollateralDeltaAmount(chain.sentTransactions[0].data)).toBe(100_000_000n);
  });
});
