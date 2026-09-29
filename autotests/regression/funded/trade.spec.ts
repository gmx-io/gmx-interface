import { expect, test } from "@playwright/test";

import { installInjectedWallet } from "../fixtures/injectedWallet";
import { FundedSession } from "./session";

test("funded economy: a small real position survives a browser refresh", async ({ page, context }) => {
  const session = new FundedSession();
  await session.resume(process.env.REGRESSION_FUNDED_RUN_ID);
  try {
    await session.openSmallPosition(true);
  } catch {
    throw new Error("Funded setup blocked or failed; inspect the local run journal before retrying manually");
  }
  await installInjectedWallet(context, {
    address: session.address,
    chainId: 42161,
    request: async ({ method, params }) => {
      if (
        !["eth_getBalance", "eth_getCode", "eth_call", "eth_blockNumber", "eth_getTransactionReceipt"].includes(method)
      ) {
        throw new Error("This funded browser check only permits wallet reads");
      }
      try {
        return await session.rpc.request({ method, params } as Parameters<typeof session.rpc.request>[0]);
      } catch {
        throw new Error("Read-only wallet RPC failed");
      }
    },
  });
  await page.goto("/trade");
  await page.getByRole("button", { name: "Connect wallet", exact: true }).first().click();
  await page
    .getByRole("button", { name: /MetaMask/i })
    .first()
    .click();
  await expect(
    page.getByRole("banner").getByText(new RegExp(`${session.address.slice(0, 6)}.*${session.address.slice(-4)}`))
  ).toBeVisible();
  const position = page.getByTestId("position-handle");
  await expect(position).toHaveCount(1);
  await expect(position).toContainText("ETH");
  await page.reload();
  await expect(position).toHaveCount(1);
  await expect(position).toContainText("ETH");
});
