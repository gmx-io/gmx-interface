import { test, expect } from "@playwright/experimental-ct-react";
import { ethers } from "ethers";

import { MOCK_ACCOUNT_PRIVATE_KEY, MockChain } from "domain/testUtils/rpc/mockChain";
import { installRpcResponder } from "domain/testUtils/rpc/playwrightAdapter";
import type { MockHttpResponse } from "domain/testUtils/rpc/types";

import { TransferDetailsStory } from "./TransferDetails.ct.stories";

const MOCK_ACCOUNT = new ethers.Wallet(MOCK_ACCOUNT_PRIVATE_KEY).address;
const GUID = "0x817e80c388525d4fa6cbc28645323b9ceeb5b88b7e677d6305b6b26fc444cb04:38";

const TRANSFER = {
  id: GUID,
  step: "executed",
  account: MOCK_ACCOUNT,
  sentAmount: "12500000",
  receivedAmount: null,
  isExecutionError: null,
  executedTimestamp: null,
  executedTxn: null,
  operation: "withdrawal",
  receivedTimestamp: null,
  receivedTxn: null,
  sentTimestamp: 1792071729,
  sentTxn: "0x817e80c388525d4fa6cbc28645323b9ceeb5b88b7e677d6305b6b26fc444cb04",
  settlementChainId: 42161,
  sourceChainId: 0,
  token: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
};

type SquidHandler = () => Promise<MockHttpResponse>;

function fundingResponse(items: unknown[]): Promise<MockHttpResponse> {
  return Promise.resolve({ body: JSON.stringify({ data: { multichainFunding: items } }) });
}

function never(): Promise<MockHttpResponse> {
  return new Promise(() => undefined);
}

function deferred() {
  let resolve!: (response: MockHttpResponse) => void;
  const promise = new Promise<MockHttpResponse>((r) => (resolve = r));
  return { promise, resolve };
}

async function installSquid(
  page: Parameters<typeof installRpcResponder>[0],
  handlers: { list: SquidHandler; item: SquidHandler }
) {
  await installRpcResponder(page, new MockChain({ walletPrivateKey: MOCK_ACCOUNT_PRIVATE_KEY }), {
    http: async (url, { body }) => {
      if (!url.pathname.endsWith("/graphql") || !body?.includes("multichainFunding")) {
        return undefined;
      }

      const { variables } = JSON.parse(body) as { variables: { guid?: string; account?: string } };

      return variables.guid ? handlers.item() : handlers.list();
    },
  });
}

test.describe("GMX Account transfer details loading (PRO-4491)", () => {
  test("shows skeleton rows while the transfer loads, then the details", async ({ mount, page }) => {
    const item = deferred();
    await installSquid(page, { list: never, item: () => item.promise });

    const component = await mount(<TransferDetailsStory openGuid={GUID} />);

    await expect(component.locator(".react-loading-skeleton").first()).toBeVisible();
    await expect(component.getByText("Date")).toBeVisible();
    await expect(component.getByRole("button", { name: "Repeat transaction" })).toBeDisabled();

    item.resolve(await fundingResponse([TRANSFER]));

    await expect(component.getByText("To", { exact: true })).toBeVisible();
    await expect(component.getByText(/12\.50?/)).toBeVisible();
    await expect(component.locator(".react-loading-skeleton")).toHaveCount(0);
    await expect(component.getByRole("button", { name: "Repeat transaction" })).toBeEnabled();
  });

  test("opens a transfer from the loaded history without waiting for its own request", async ({ mount, page }) => {
    await installSquid(page, { list: () => fundingResponse([TRANSFER]), item: never });

    const component = await mount(<TransferDetailsStory />);

    await component.getByText("USDC").click();

    await expect(component.getByText("To", { exact: true })).toBeVisible();
    await expect(component.getByText("Arbiscan")).toBeVisible();
    await expect(component.locator(".react-loading-skeleton")).toHaveCount(0);
  });

  test("shows an error when the transfer fails to load", async ({ mount, page }) => {
    await installSquid(page, {
      list: never,
      item: () => Promise.resolve({ status: 500, body: JSON.stringify({ errors: [{ message: "down" }] }) }),
    });

    const component = await mount(<TransferDetailsStory openGuid={GUID} />);

    await expect(component.getByText("Failed to load transfer details")).toBeVisible();
    await expect(component.locator(".react-loading-skeleton")).toHaveCount(0);
  });

  test("shows not found when the indexer has no such transfer", async ({ mount, page }) => {
    await installSquid(page, { list: never, item: () => fundingResponse([]) });

    const component = await mount(<TransferDetailsStory openGuid={GUID} />);

    await expect(component.getByText("Transfer not found")).toBeVisible();
    await expect(component.locator(".react-loading-skeleton")).toHaveCount(0);
  });
});
