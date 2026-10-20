import { expect, test } from "@playwright/test";
import { encodeFunctionData, erc20Abi, getAddress, maxUint256, toHex } from "viem";

import { installInjectedWallet } from "../fixtures/injectedWallet";
import { address, usdc, weth } from "./fundedQuote";
import { economy } from "./economy";
import type { FundedSession } from "./session";
import { UiWallet } from "./uiWallet";

test("funded wallet binding rejects other origins and child frames before calling the signer", async ({
  page,
  context,
}) => {
  const origin = "https://selected-preview.invalid";
  const calls: string[] = [];
  await context.route("**/*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        new URL(route.request().url()).pathname === "/child"
          ? "<!doctype html><body>Child</body>"
          : "<!doctype html><body><iframe src='/child'></iframe></body>",
    })
  );
  await installInjectedWallet(context, {
    address: "0x1111111111111111111111111111111111111111",
    chainId: 42161,
    allowedOrigin: origin,
    request: async ({ method }) => {
      calls.push(method);
      return "allowed";
    },
  });
  const request = () =>
    (
      window as unknown as { __regressionWalletRequest: (request: unknown) => Promise<unknown> }
    ).__regressionWalletRequest({ method: "eth_sendTransaction", params: [] });
  await page.goto(origin);
  expect(await page.evaluate(request)).toMatchObject({ result: "allowed" });
  await expect.poll(() => page.frames().length).toBeGreaterThan(1);
  expect(await page.frames()[1].evaluate(request)).toMatchObject({ error: { code: 4100 } });
  await page.goto("https://another-preview.invalid");
  expect(await page.evaluate(request)).toMatchObject({ error: { code: 4100 } });
  expect(calls).toEqual(["eth_sendTransaction"]);
});

for (const transition of ["delayed allowance", "stale approval label"] as const) {
  test(`the action waits for ${transition} without another approval`, async ({ page, context }) => {
    const origin = "https://selected-preview.invalid";
    const purposes: string[] = [];
    const session = {
      address,
      feePolicy: economy,
      previousAction: async () => undefined,
      snapshot: async () => ({}),
      gate: async () => undefined,
      nativeTransaction: async (_tx: unknown, purpose: string) => {
        purposes.push(purpose);
        return { id: purpose, purpose, state: "settled", feeUsd: "0", txHash: toHex(purposes.length, { size: 32 }) };
      },
    } as unknown as FundedSession;
    const wallet = new UiWallet(session);
    await context.route("**/*", (route) =>
      route.fulfill({ contentType: "text/html", body: '<button data-qa="submit">Approve USDC</button>' })
    );
    await wallet.install(context, origin);
    await page.goto(origin);
    const approval = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [getAddress(weth.address), maxUint256],
    });
    await page.evaluate(
      ({ address, token, approval, transition }) => {
        const button = document.querySelector("button")!;
        button.onclick = async () => {
          const data = button.textContent!.startsWith("Approve") ? approval : "0x1234";
          await (
            window as unknown as { __regressionWalletRequest: (request: unknown) => Promise<unknown> }
          ).__regressionWalletRequest({
            method: "eth_sendTransaction",
            params: [{ from: address, to: token, data, value: "0x0", chainId: "0xa4b1" }],
          });
          if (transition === "delayed allowance" && data === approval) {
            setTimeout(() => {
              button.textContent = "Submit";
            }, 2_000);
          } else button.textContent = "Submit";
        };
      },
      { address, token: usdc.address, approval, transition }
    );
    let changed = false;
    const result = await wallet.submit(
      {
        purpose: "open",
        approval: { token: usdc.address, spender: weth.address, amount: 2_500_000n },
        preflight: () => undefined,
        inspect: () => ({ extraFeeUsd: 0n }),
        beforeClick: async () => {
          if (transition !== "stale approval label" || !purposes.length || changed) return;
          changed = true;
          await page.evaluate(() => {
            const button = document.querySelector("button")!;
            button.textContent = "Approve USDC";
            setTimeout(() => {
              button.textContent = "Submit";
            }, 250);
          });
        },
      },
      page.getByTestId("submit")
    );
    expect(changed).toBe(transition === "stale approval label");
    expect(result.purpose).toBe("ui:open");
    expect(purposes).toHaveLength(2);
    expect(purposes[0]).toContain(":approve:");
    expect(purposes[1]).toBe("ui:open");
  });
}
