import { test, expect } from "@playwright/experimental-ct-react";
import type { Page } from "playwright/test";
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

function getSizeDeltaUsd(multicallData: string): bigint | undefined {
  const multicall = decodeFunctionData({ abi: ExchangeRouterAbi, data: multicallData as Hex });

  if (multicall.functionName !== "multicall") {
    return undefined;
  }

  for (const callData of multicall.args[0]) {
    const call = decodeFunctionData({ abi: ExchangeRouterAbi, data: callData });

    if (call.functionName === "createOrder") {
      return call.args[0].numbers.sizeDeltaUsd;
    }
  }

  return undefined;
}

type Submit = "Enter" | "button";

async function openCloseDialog(page: Page, mountStory: () => Promise<unknown>) {
  const chain = new SimulatingChain({ walletPrivateKey: MOCK_ACCOUNT_PRIVATE_KEY });
  chain.setDataStoreUint(decreaseOrderGasLimitKey(), 4000000n);
  chain.setDataStoreUint(ESTIMATED_GAS_FEE_BASE_AMOUNT_V2_1, 600000n);
  chain.setDataStoreUint(ESTIMATED_GAS_FEE_PER_ORACLE_PRICE, 250000n);
  chain.setDataStoreUint(ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR, 10n ** 30n);
  await installRpcResponder(page, chain);

  await mountStory();

  const input = page.locator(getDataQALocator("amount-input-input"));
  const submitButton = page.locator(getDataQALocator("confirm-button"));
  await expect(submitButton).toBeEnabled({ timeout: 40_000 });

  const typeSize = async (size: string, buttonText: string) => {
    await input.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(size);
    await expect(submitButton).toHaveText(buttonText);
  };

  return { chain, submitButton, typeSize };
}

// The edit and the submit as two events with no browser task between them, like the fastest keys:
// React has rendered the edited field but nothing it scheduled after that render
async function editAndSubmitAtOnce(page: Page, size: string, submit: Submit) {
  await page.evaluate(
    async ({ size, submit }) => {
      const field = document.querySelector<HTMLInputElement>('[data-qa="amount-input-input"]')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, size);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();

      if (submit === "Enter") {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      } else {
        document.querySelector<HTMLButtonElement>('[data-qa="confirm-button"]')!.click();
      }
    },
    { size, submit }
  );
}

test.setTimeout(90_000);

test.describe("Close position", () => {
  for (const submit of ["Enter", "button"] as const) {
    test(`${submit} right after editing the size closes the size the field shows TRD-40`, async ({ mount, page }) => {
      // the story's position is a $2,000 long
      const { chain, typeSize } = await openCloseDialog(page, () => mount(<NetworkFeeSurfaceStory surface="close" />));

      await typeSize("2000", "Close Long");
      await editAndSubmitAtOnce(page, "200", submit);

      await expect.poll(() => chain.sentTransactions.length, { timeout: 40_000 }).toBe(1);
      expect(getSizeDeltaUsd(chain.sentTransactions[0].data)).toBe(200n * 10n ** 30n);
    });
  }

  test("Enter and the button right after editing the size above the position send no order TRD-40", async ({
    mount,
    page,
  }) => {
    const { chain, submitButton, typeSize } = await openCloseDialog(page, () =>
      mount(<NetworkFeeSurfaceStory surface="close" />)
    );

    for (const submit of ["Enter", "button"] as const) {
      await typeSize("2000", "Close Long");
      await editAndSubmitAtOnce(page, "3000", submit);

      await page.waitForTimeout(2_000);
      expect(chain.sentTransactions).toHaveLength(0);
      await expect(submitButton).toHaveText("Max close amount exceeded");
    }
  });
});
